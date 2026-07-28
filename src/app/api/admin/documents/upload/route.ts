import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";
import { getOrCreateCollection, CHROMA_COLLECTION_NAME } from "@/retrieval/chroma";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { parseFileContent } from "@/utils/fileParser";

const PARENT_CHUNK_SIZE = 1500;
const PARENT_CHUNK_OVERLAP = 100;
const CHILD_CHUNK_SIZE = 400;
const CHILD_CHUNK_OVERLAP = 50;

/** POST /api/admin/documents/upload — upload dan ingest file (.txt, .pdf, .xlsx, .csv) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file yang diupload." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const embeddingModel = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY!,
      model: "gemini-embedding-001",
    });
    const collection = await getOrCreateCollection();

    const parentSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: PARENT_CHUNK_SIZE, chunkOverlap: PARENT_CHUNK_OVERLAP,
      separators: ["\n\n", "\n", ".", " ", ""],
    });
    const childSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHILD_CHUNK_SIZE, chunkOverlap: CHILD_CHUNK_OVERLAP,
      separators: ["\n\n", "\n", ".", " ", ""],
    });

    const results: { fileName: string; status: string; message: string }[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["txt", "pdf", "xlsx", "csv"].includes(ext || "")) {
        results.push({ fileName: file.name, status: "error", message: "Format file tidak didukung. Gunakan .txt, .pdf, .xlsx, atau .csv." });
        continue;
      }

      const startTime = Date.now();
      
      let content = "";
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        content = await parseFileContent(buffer, file.name);
      } catch (err) {
        results.push({ fileName: file.name, status: "error", message: `Gagal mem-parsing file: ${(err as Error).message}` });
        continue;
      }

      const hash = crypto.createHash("md5").update(content).digest("hex");

      // Cek duplikasi berdasarkan hash
      const { data: existingRaw } = await supabase
        .from("document_sources")
        .select("id, file_name")
        .eq("file_hash", hash)
        .single();
      const existing = existingRaw as { id: string; file_name: string } | null;

      if (existing) {
        results.push({ fileName: file.name, status: "skipped", message: `Duplikat dari "${existing.file_name}".` });
        continue;
      }

      // Buat record di Supabase
      const { data: sourceRaw } = await supabase
        .from("document_sources")
        .insert({
          file_name: file.name,
          chroma_collection: CHROMA_COLLECTION_NAME,
          status: "processing",
          file_size_bytes: file.size,
          file_hash: hash,
          uploaded_by: session.id,
        })
        .select("id").single();
      const sourceRecord = sourceRaw as { id: string } | null;

      if (!sourceRecord) {
        results.push({ fileName: file.name, status: "error", message: "Gagal menyimpan metadata." });
        continue;
      }
      const sourceId = sourceRecord.id;

      const { data: jobRaw } = await supabase
        .from("ingestion_jobs")
        .insert({ document_source_id: sourceId, status: "running" })
        .select("id").single();
      const jobRecord = jobRaw as { id: string } | null;
      const jobId = jobRecord?.id;

      try {
        const parentDocs = await parentSplitter.createDocuments([content]);
        const allIds: string[] = [], allEmbeddings: number[][] = [];
        const allDocuments: string[] = [], allMetadatas: Record<string, string | number | boolean>[] = [];

        for (let pi = 0; pi < parentDocs.length; pi++) {
          const parent = parentDocs[pi];
          const parentId = `${hash}-parent-${pi}`;
          const childDocs = await childSplitter.createDocuments([parent.pageContent]);
          const childTexts = childDocs.map((c) => c.pageContent);
          const childVectors = await embeddingModel.embedDocuments(childTexts);

          for (let ci = 0; ci < childDocs.length; ci++) {
            allIds.push(`${parentId}-child-${ci}`);
            allEmbeddings.push(childVectors[ci]);
            allDocuments.push(childDocs[ci].pageContent);
            allMetadatas.push({
              parent_id: parentId,
              parent_content: parent.pageContent,
              source: file.name,
              source_id: sourceId,
              chunk_index: ci,
              parent_index: pi,
            });
          }
        }

        // Bulk insert ke ChromaDB
        const CHROMA_BATCH = 500;
        for (let i = 0; i < allIds.length; i += CHROMA_BATCH) {
          await collection.add({
            ids: allIds.slice(i, i + CHROMA_BATCH),
            embeddings: allEmbeddings.slice(i, i + CHROMA_BATCH),
            documents: allDocuments.slice(i, i + CHROMA_BATCH),
            metadatas: allMetadatas.slice(i, i + CHROMA_BATCH),
          });
        }

        const duration = (Date.now() - startTime) / 1000;
        await supabase.from("document_sources").update({
          status: "completed", parent_count: parentDocs.length, child_count: allIds.length,
        }).eq("id", sourceId);

        if (jobId) {
          await supabase.from("ingestion_jobs").update({
            status: "completed", parents_created: parentDocs.length,
            children_created: allIds.length, duration_seconds: duration,
            finished_at: new Date().toISOString(),
          }).eq("id", jobId);
        }

        results.push({ fileName: file.name, status: "success",
          message: `${parentDocs.length} parent, ${allIds.length} child chunks (${duration.toFixed(1)}s)` });

      } catch (err) {
        const msg = (err as Error).message;
        await supabase.from("document_sources").update({ status: "failed" }).eq("id", sourceId);
        if (jobId) {
          await supabase.from("ingestion_jobs").update({
            status: "failed", error_message: msg, finished_at: new Date().toISOString(),
          }).eq("id", jobId);
        }
        results.push({ fileName: file.name, status: "error", message: msg });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    return NextResponse.json({
      message: `${successCount} dari ${files.length} file berhasil diproses.`,
      results,
    });

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
