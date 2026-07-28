import { IncludeEnum } from "chromadb";
import { getOrCreateCollection } from "./chroma";
import { getEmbeddingModel, type EmbeddingConfig } from "./embedding";

export interface RetrievalResult {
  parentContent: string;
  childContent: string;
  source: string;
  similarity: number;
  parentId?: string;
  childId?: string;
}

/**
 * Retriever berbasis Parent Document Retrieval.
 *
 * Alur kerja:
 * 1. Embed query pengguna (menggunakan provider sesuai admin setting: Google / Transformers.js)
 * 2. Cari child chunks yang paling mirip di ChromaDB
 * 3. Untuk setiap child yang ditemukan, ambil parent_content dari metadata
 * 4. De-duplikasi parent berdasarkan parent_id
 * 5. Kembalikan teks parent utuh sebagai konteks untuk LLM
 */
export async function retrieveParentDocuments(
  query: string,
  options: {
    nResults?: number;
    minSimilarity?: number;
    embeddingConfig: EmbeddingConfig;
  }
): Promise<RetrievalResult[]> {
  const { nResults = 5, minSimilarity = 0.4, embeddingConfig } = options;
  const t0 = Date.now();

  // 1. Embed query (pakai factory + singleton dari src/retrieval/embedding.ts)
  const tEmbed0 = Date.now();
  const embeddingModel = getEmbeddingModel(embeddingConfig);
  const queryVector = await embeddingModel.embedQuery(query);
  const tEmbed1 = Date.now();
  console.debug(
    `      [retrieval] embed query: ${tEmbed1 - tEmbed0}ms` +
    ` (provider=${embeddingConfig.provider}, dimensi=${queryVector.length})`
  );

  // 2. Cari child chunks di ChromaDB
  const tQuery0 = Date.now();
  const collection = await getOrCreateCollection();
  const results = await collection.query({
    queryEmbeddings: [queryVector],
    nResults,
    include: [
      IncludeEnum.Documents,
      IncludeEnum.Metadatas,
      IncludeEnum.Distances,
    ],
  });
  const tQuery1 = Date.now();
  console.debug(
    `      [retrieval] chroma query: ${tQuery1 - tQuery0}ms` +
    ` (ketemu ${results.ids[0]?.length ?? 0} child chunks)`
  );

  if (!results.ids[0] || results.ids[0].length === 0) {
    console.debug(`      [retrieval] TOTAL ${Date.now() - t0}ms. Hasil: KOSONG.`);
    return [];
  }

  // 3. De-duplikasi berdasarkan parent_id
  const seenParentIds = new Set<string>();
  const parentResults: RetrievalResult[] = [];

  for (let i = 0; i < results.ids[0].length; i++) {
    const metadata = results.metadatas[0][i] as Record<string, string | number>;
    const distance = results.distances?.[0][i] ?? 1;
    // ChromaDB cosine distance: 0 = identik, 2 = berlawanan
    // Konversi ke similarity 0-1
    const similarity = 1 - distance / 2;

    if (similarity < minSimilarity) continue;

    const parentId = metadata.parent_id as string;
    if (seenParentIds.has(parentId)) continue;

    seenParentIds.add(parentId);
    parentResults.push({
      parentContent: metadata.parent_content as string,
      childContent: results.documents[0][i] ?? "",
      source: metadata.source as string,
      similarity,
      parentId,
      childId: results.ids[0][i],
    });
  }

  const finalResults = parentResults.sort((a, b) => b.similarity - a.similarity);
  console.debug(
    `      [retrieval] TOTAL ${Date.now() - t0}ms.` +
    ` Parent unik: ${finalResults.length} (dari ${results.ids[0].length} child).`
  );

  return finalResults;
}
