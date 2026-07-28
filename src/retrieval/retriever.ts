import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { IncludeEnum } from "chromadb";
import { getOrCreateCollection } from "./chroma";

export interface RetrievalResult {
  parentContent: string;
  childContent: string;
  source: string;
  similarity: number;
}

/**
 * Retriever berbasis Parent Document Retrieval.
 *
 * Alur kerja:
 * 1. Embed query pengguna menggunakan Google Embedding
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
  } = {}
): Promise<RetrievalResult[]> {
  const { nResults = 5, minSimilarity = 0.4 } = options;

  // 1. Embed query
  const embeddingModel = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "gemini-embedding-001",
  });
  const queryVector = await embeddingModel.embedQuery(query);

  // 2. Cari child chunks di ChromaDB
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

  if (!results.ids[0] || results.ids[0].length === 0) {
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
    });
  }

  return parentResults.sort((a, b) => b.similarity - a.similarity);
}
