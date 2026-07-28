/**
 * Skrip test untuk diagnose Retrieval yang timeout.
 * Membagi waktu antara: Embed query vs Query ChromaDB.
 *
 * Jalankan: npx tsx src/scripts/test-retrieval.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import ws from "ws";
(globalThis as unknown as { WebSocket: unknown }).WebSocket = ws;
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getChunksBySource, getOrCreateCollection } from "../retrieval/chroma";
import { IncludeEnum } from "chromadb";
import { getEmbeddingModel } from "../retrieval/embedding";
import { getEmbeddingConfig } from "../config/settings";

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  console.log(`\n⏱️  ${label}...`);
  const result = await fn();
  const ms = Date.now() - t0;
  console.log(`✅ ${label}: ${ms}ms (${(ms / 1000).toFixed(2)}s)`);
  return result;
}

async function main() {
  const query = process.argv[2] ?? "wisata alam palangka raya";

  console.log("Query:", query);
  console.log("CHROMA_URL:", process.env.CHROMA_URL);
  console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY?.slice(0, 6) + "...");

  // 1. Coba cek collection & count terlebih dahulu
  const collection = await time("Mendapatkan collection", () => getOrCreateCollection());
  const count = await time("Count dokumen", () => collection.count());
  console.log("   Total dokumen:", count);

  // 2. Peek sample
  const peek = await collection.peek({ limit: 3 });
  console.log("   Sample IDs:", peek.ids.slice(0, 3));
  console.log("   Sample sources:", (peek.metadatas ?? []).map((m) => (m as { source?: string })?.source ?? "-"));

  // 3. Coba cari by source (tanpa embedding) untuk uji koneksi ChromaDB
  if (peek.ids.length > 0 && peek.metadatas?.[0]) {
    const src = (peek.metadatas[0] as { source?: string }).source;
    if (src) {
      await time(`Query by source (no embed): ${src}`, () => getChunksBySource(src));
    }
  }

  // 4. Test embedding SAJA
  const embeddingConfig = await getEmbeddingConfig();
  console.log(`   Embedding Config: ${embeddingConfig.provider} | ${embeddingConfig.model} (dim=${embeddingConfig.dimensions})`);
  const embeddingModel = getEmbeddingModel(embeddingConfig);
  const queryVector = await time(`Embed Query (${embeddingConfig.provider})`, () => embeddingModel.embedQuery(query));
  console.log("   Dimensi vektor:", queryVector.length);

  // 5. Test query Chroma SAJA (tanpa embed)
  const queryResult = await time("ChromaDB collection.query", async () => {
    return collection.query({
      queryEmbeddings: [queryVector],
      nResults: 5,
      include: [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Distances],
    });
  });
  console.log("   Hasil:", queryResult.ids[0]?.length ?? 0, " ID");
  console.log("   Ids:", queryResult.ids[0]);
  console.log("   Distances:", queryResult.distances?.[0]);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
