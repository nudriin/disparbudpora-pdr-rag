/**
 * =============================================================================
 * SKRIP INGESTI DOKUMEN - Chatbot Pariwisata Palangka Raya
 * =============================================================================
 * TUJUAN:
 *   Membaca dokumen pariwisata lokal, memecahnya menjadi Parent & Child chunks,
 *   meng-embed child chunks, lalu menyimpan ke:
 *     - ChromaDB   : child chunks + embeddings (untuk similarity search)
 *     - Supabase   : metadata dokumen & log ingesti (untuk admin panel)
 *
 * CARA MENJALANKAN (dari root proyek):
 *   npm run ingest               — proses semua file baru di src/scripts/data/
 *   npm run ingest:reset         — hapus semua data ChromaDB lalu ingest ulang
 *
 * PRASYARAT:
 *   1. Isi .env.local dengan semua variabel yang diperlukan
 *   2. ChromaDB harus berjalan: docker run -p 8000:8000 chromadb/chroma
 *   3. Taruh file .txt di folder: src/scripts/data/
 * =============================================================================
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { createClient } from "@supabase/supabase-js";
// Node.js 20 tidak punya native WebSocket — inject 'ws' untuk Supabase Realtime
import ws from "ws";
import { getChromaClient, getOrCreateCollection, resetCollection, deleteChunksBySource, CHROMA_COLLECTION_NAME } from "../retrieval/chroma";
import { parseFileContent } from "../utils/fileParser";
import { getEmbeddingModel, type EmbeddingConfig, DEFAULT_EMBEDDING_CONFIG } from "../retrieval/embedding";
import { getEmbeddingConfig } from "../config/settings";

// Muat environment variables dari .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ============================================================
// KONFIGURASI CHUNKING
// ============================================================
const DATA_DIR = path.resolve(__dirname, "data");

const PARENT_CHUNK_SIZE = 1500;   // karakter
const PARENT_CHUNK_OVERLAP = 100;
const CHILD_CHUNK_SIZE = 600;     // karakter (naik dari 400 → embedding lebih representatif)
const CHILD_CHUNK_OVERLAP = 80;
const EMBEDDING_BATCH_SIZE = 20;

// ============================================================
// ARGUMEN CLI
// ============================================================
const RESET_MODE = process.argv.includes("--reset");
const CLI_EMBEDDING_PROVIDER =
  (process.env.EMBEDDING_PROVIDER as EmbeddingConfig["provider"] | undefined) ?? undefined;
const CLI_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? undefined;

// ============================================================
// VALIDASI ENV
// ============================================================
function validateEnv() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CHROMA_URL: process.env.CHROMA_URL,
  };

  for (const [key, val] of Object.entries(required)) {
    if (!val) throw new Error(`❌ Missing env var: ${key}`);
  }

  return {
    supabaseUrl: required.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: required.SUPABASE_SERVICE_ROLE_KEY!,
  };
}

function getAllFilesRecursively(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFilesRecursively(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

// ============================================================
// HELPER: Baca semua file dari direktori data (rekursif)
// ============================================================
async function loadDocumentsFromDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const exampleDoc = `Wisata Alam Palangka Raya\n\nKota Palangka Raya memiliki berbagai destinasi wisata alam yang menakjubkan. Berikut adalah beberapa destinasi unggulan yang wajib dikunjungi.\n\nAir Hitam Kereng Bangkirai\nAir Hitam Kereng Bangkirai adalah danau alam yang terletak di Kelurahan Kereng Bangkirai, Kecamatan Sabangau. Danau ini memiliki air berwarna kehitaman yang disebabkan oleh kandungan tanin dari akar-akar pohon di sekitarnya. Pengunjung dapat menikmati wisata perahu, memancing, dan mengamati satwa liar. Waktu terbaik untuk berkunjung adalah pada pagi hari antara pukul 06.00-09.00 WITA.\n\nDanau Tahai\nDanau Tahai merupakan objek wisata air tawar yang sangat populer di Palangka Raya. Terletak sekitar 30 km dari pusat kota, danau ini dikelilingi hutan tropis yang asri. Fasilitas yang tersedia meliputi pondok wisata apung, tempat pemancingan, jalur trekking, dan area berkemah. Biaya masuk sangat terjangkau, hanya Rp 5.000 per orang.`;
    fs.writeFileSync(path.join(DATA_DIR, "wisata-alam.txt"), exampleDoc, "utf-8");
    console.log("   ℹ️  Dokumen contoh dibuat di src/scripts/data/wisata-alam.txt");
  }

  const allowedExts = [".txt", ".pdf", ".xlsx", ".csv"];
  const allFilePaths = getAllFilesRecursively(DATA_DIR).filter((filePath) =>
    allowedExts.some((ext) => filePath.toLowerCase().endsWith(ext))
  );

  if (allFilePaths.length === 0) throw new Error(`❌ Tidak ada file dokumen di: ${DATA_DIR}`);

  console.log(`📂 Menemukan ${allFilePaths.length} file dokumen (rekursif):`);

  const documents = [];
  for (const filePath of allFilePaths) {
    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);
    const sizeBytes = fs.statSync(filePath).size;

    try {
      const content = (await parseFileContent(buffer, fileName)).trim();
      const hash = crypto.createHash("md5").update(content).digest("hex");
      console.log(`   - ${fileName} (${content.length} karakter, ${sizeBytes} bytes)`);
      documents.push({ content, fileName, filePath, hash, sizeBytes });
    } catch (err) {
      console.error(`   ❌ Gagal mem-parsing ${fileName}: ${(err as Error).message}`);
    }
  }

  return documents;
}

// ============================================================
// HELPER: Embed dalam batch
// ============================================================
async function embedInBatches(
  texts: string[],
  embeddingModel: EmbeddingsInterface
): Promise<number[][]> {
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(texts.length / EMBEDDING_BATCH_SIZE);
    console.log(`      🔢 Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    const vectors = await embeddingModel.embedDocuments(batch);

    const failed = vectors.findIndex((v) => !v || v.length === 0);
    if (failed !== -1) {
      throw new Error(
        `Embedding gagal pada chunk indeks ${i + failed}. ` +
        `Periksa provider dan setting embedding.`
      );
    }

    allVectors.push(...vectors);

    // Jeda 1 detik antar batch untuk hindari rate limit (untuk provider remote)
    if (i + EMBEDDING_BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return allVectors;
}

// ============================================================
// FUNGSI UTAMA
// ============================================================
async function main() {
  console.log("=".repeat(60));
  console.log("🚀 INGESTI DOKUMEN PARIWISATA PALANGKA RAYA");
  if (RESET_MODE) console.log("   ⚠️  MODE RESET: Semua data vector akan dihapus dulu");
  console.log("=".repeat(60));

  // 1. Validasi env
  const { supabaseUrl, supabaseServiceKey } = validateEnv();
  console.log("✅ Environment variables valid.");

  // 2. Inisialisasi klien
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: ws as any },
  });

  const embeddingConfig = await getEmbeddingConfig();
  console.log(`🧠 Memuat Embedding Model: ${embeddingConfig.provider} | ${embeddingConfig.model} (dim=${embeddingConfig.dimensions})`);
  const embeddingModel = getEmbeddingModel(embeddingConfig);

  // 3. Test koneksi embedding
  console.log("🔌 Menguji Embedding API...");
  const testVec = await embeddingModel.embedQuery("tes");
  if (!testVec?.length) throw new Error("Embedding API gagal — periksa konfigurasi provider");
  const embeddingDim = testVec.length;
  console.log(`✅ Embedding API OK (dimensi: ${embeddingDim})`);

  // 4. Test koneksi ChromaDB
  console.log("🔌 Menguji koneksi ChromaDB...");
  try {
    const chromaClient = getChromaClient();
    await chromaClient.heartbeat();
    console.log(`✅ ChromaDB OK (${process.env.CHROMA_URL})`);
  } catch {
    throw new Error(
      `❌ ChromaDB tidak dapat dijangkau di ${process.env.CHROMA_URL}\n` +
      `   Pastikan ChromaDB sudah berjalan:\n` +
      `   docker run -p 8000:8000 chromadb/chroma`
    );
  }

  // 5. Reset jika diminta
  if (RESET_MODE) {
    console.log("🗑️  Menghapus koleksi ChromaDB & data Supabase...");
    await resetCollection();
    await supabase.from("document_sources").delete().not("id", "is", null);
    console.log("✅ Koleksi ChromaDB & database Supabase berhasil direset.");
  }

  // 6. Dapatkan atau buat koleksi
  const collection = await getOrCreateCollection();

  // 7. Load dokumen
  console.log("\n📖 Membaca dokumen...");
  const rawDocuments = await loadDocumentsFromDirectory();

  // 8. Text splitter dua lapis
  const parentSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: PARENT_CHUNK_SIZE,
    chunkOverlap: PARENT_CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ".", " ", ""],
  });

  const childSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHILD_CHUNK_SIZE,
    chunkOverlap: CHILD_CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ".", " ", ""],
  });

  // 9. Proses setiap file
  let totalParents = 0;
  let totalChildren = 0;

  for (const doc of rawDocuments) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`📄 Memproses: ${doc.fileName}`);
    const startTime = Date.now();

    // 9a. Cek atau buat record document_source di Supabase (Mencegah Duplikasi)
    const { data: existingSource } = await supabase
      .from("document_sources")
      .select("id")
      .eq("file_name", doc.fileName)
      .maybeSingle();

    let sourceId: string;

    if (existingSource) {
      sourceId = existingSource.id;
      await supabase
        .from("document_sources")
        .update({
          status: "processing",
          file_size_bytes: doc.sizeBytes,
          file_hash: doc.hash,
        })
        .eq("id", sourceId);

      await deleteChunksBySource(doc.fileName);
    } else {
      const { data: sourceRecord, error: sourceError } = await supabase
        .from("document_sources")
        .insert({
          file_name: doc.fileName,
          chroma_collection: CHROMA_COLLECTION_NAME,
          status: "processing",
          file_size_bytes: doc.sizeBytes,
          file_hash: doc.hash,
        })
        .select("id")
        .single();

      if (sourceError || !sourceRecord) {
        console.error(`   ❌ Gagal buat record Supabase: ${sourceError?.message}`);
        continue;
      }
      sourceId = (sourceRecord as { id: string }).id;
    }

    // 9b. Buat ingestion_job
    const { data: jobRaw } = await supabase
      .from("ingestion_jobs")
      .insert({ document_source_id: sourceId, status: "running" })
      .select("id")
      .single();
    const jobId = (jobRaw as { id: string } | null)?.id;

    try {
      // 9c. Split menjadi parent chunks
      const parentDocs = await parentSplitter.createDocuments([doc.content]);
      console.log(`   ✂️  ${parentDocs.length} parent chunks`);

      const allChildIds: string[] = [];
      const allChildEmbeddings: number[][] = [];
      const allChildDocuments: string[] = [];
      const allChildMetadatas: Record<string, string | number | boolean>[] = [];

      // 9d. Proses setiap parent chunk
      for (let pi = 0; pi < parentDocs.length; pi++) {
        const parent = parentDocs[pi];
        // ID parent chunk — disimpan sebagai metadata di child, bukan di DB terpisah
        const parentId = `${doc.hash}-parent-${pi}`;

        // 9e. Split parent menjadi child chunks
        const childDocs = await childSplitter.createDocuments([parent.pageContent]);

        // 9f. Embed child chunks
        console.log(`   📌 Parent ${pi + 1}/${parentDocs.length} → ${childDocs.length} child chunks`);
        const childTexts = childDocs.map((c) => c.pageContent);
        const childVectors = await embedInBatches(childTexts, embeddingModel);

        // 9g. Kumpulkan data untuk bulk insert ke ChromaDB
        for (let ci = 0; ci < childDocs.length; ci++) {
          const childId = `${parentId}-child-${ci}`;
          allChildIds.push(childId);
          allChildEmbeddings.push(childVectors[ci]);
          allChildDocuments.push(childDocs[ci].pageContent);
          allChildMetadatas.push({
            // Metadata yang disimpan di setiap child di ChromaDB:
            parent_id: parentId,
            parent_content: parent.pageContent,  // Teks parent utuh!
            source: doc.fileName,
            source_id: sourceId,
            chunk_index: ci,
            parent_index: pi,
          });
        }
      }

      // 9h. Bulk insert semua chunks ke ChromaDB
      console.log(`   💾 Menyimpan ${allChildIds.length} chunks ke ChromaDB...`);
      // ChromaDB punya batas 5000 items per add — pecah jika perlu
      const CHROMA_BATCH = 500;
      for (let i = 0; i < allChildIds.length; i += CHROMA_BATCH) {
        await collection.add({
          ids: allChildIds.slice(i, i + CHROMA_BATCH),
          embeddings: allChildEmbeddings.slice(i, i + CHROMA_BATCH),
          documents: allChildDocuments.slice(i, i + CHROMA_BATCH),
          metadatas: allChildMetadatas.slice(i, i + CHROMA_BATCH),
        });
      }

      const duration = (Date.now() - startTime) / 1000;
      const parentCount = parentDocs.length;
      const childCount = allChildIds.length;
      totalParents += parentCount;
      totalChildren += childCount;

      // 9i. Update Supabase dengan hasil akhir
      await supabase
        .from("document_sources")
        .update({ status: "completed", parent_count: parentCount, child_count: childCount })
        .eq("id", sourceId);

      if (jobId) {
        await supabase
          .from("ingestion_jobs")
          .update({
            status: "completed",
            parents_created: parentCount,
            children_created: childCount,
            duration_seconds: duration,
            finished_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      console.log(`   ✅ Selesai: ${parentCount} parent, ${childCount} child (${duration.toFixed(1)}s)`);

    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`   ❌ Error: ${errorMsg}`);

      await supabase
        .from("document_sources")
        .update({ status: "failed" })
        .eq("id", sourceId);

      if (jobId) {
        await supabase
          .from("ingestion_jobs")
          .update({
            status: "failed",
            error_message: errorMsg,
            finished_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    }
  }

  // 10. Ringkasan
  console.log("\n" + "=".repeat(60));
  console.log("✅ INGESTI SELESAI");
  console.log(`   📦 Total Parent Chunks : ${totalParents}`);
  console.log(`   🔍 Total Child Chunks  : ${totalChildren}`);
  console.log(`   📁 Koleksi ChromaDB    : ${CHROMA_COLLECTION_NAME}`);
  console.log("=".repeat(60));
  console.log("\n💡 Langkah selanjutnya:");
  console.log("   - Verifikasi di admin panel: /admin/documents");
  console.log("   - Jalankan aplikasi: npm run dev");
}

main().catch((err) => {
  console.error("\n❌ INGESTI GAGAL:", err.message ?? err);
  process.exit(1);
});
