import { ChromaClient, Collection, IncludeEnum } from "chromadb";

// Nama koleksi di ChromaDB — satu koleksi untuk semua child chunks
export const CHROMA_COLLECTION_NAME = "palangkaraya_tourism";

let chromaClient: ChromaClient | null = null;

/**
 * Mengembalikan singleton ChromaDB client.
 * ChromaDB berjalan sebagai server terpisah (Docker container).
 * URL dikonfigurasi via env var CHROMA_URL.
 */
export function getChromaClient(): ChromaClient {
  if (chromaClient) return chromaClient;

  const chromaUrl = process.env.CHROMA_URL;
  if (!chromaUrl) {
    throw new Error("Missing env var: CHROMA_URL (contoh: http://localhost:8000)");
  }

  chromaClient = new ChromaClient({ path: chromaUrl });
  return chromaClient;
}

/**
 * Mendapatkan atau membuat koleksi ChromaDB.
 * Koleksi ini menyimpan child chunks beserta embedding-nya.
 *
 * Metadata koleksi menyimpan dimensi embedding agar konsisten.
 */
export async function getOrCreateCollection(): Promise<Collection> {
  const client = getChromaClient();

  const collection = await client.getOrCreateCollection({
    name: CHROMA_COLLECTION_NAME,
    metadata: {
      description: "Child chunks untuk pariwisata Palangka Raya",
      embedding_model: "gemini-embedding-001",
      embedding_dim: "3072",
      "hnsw:space": "cosine", // Gunakan Cosine Similarity
    },
  });

  return collection;
}

/**
 * Menghapus seluruh koleksi dan membuatnya ulang (reset vector store).
 * Dipanggil dari admin panel saat admin melakukan "Reset Vector".
 */
export async function resetCollection(): Promise<void> {
  const client = getChromaClient();

  try {
    await client.deleteCollection({ name: CHROMA_COLLECTION_NAME });
  } catch (err) {
    console.log("[ChromaDB] Collection delete notice:", (err as Error).message);
  }

  await client.getOrCreateCollection({
    name: CHROMA_COLLECTION_NAME,
    metadata: {
      description: "Child chunks untuk pariwisata Palangka Raya",
      "hnsw:space": "cosine",
    },
  });
}

/**
 * Menghapus semua chunk yang berasal dari satu file sumber tertentu.
 * Dipanggil ketika admin menghapus dokumen dari panel.
 *
 * @param fileName - Nama file yang akan dihapus chunk-nya
 */
export async function deleteChunksBySource(fileName: string): Promise<number> {
  const collection = await getOrCreateCollection();

  // Query untuk mendapatkan semua IDs yang memiliki source = fileName
  const results = await collection.get({
    where: { source: fileName },
    include: [],
  });

  if (!results.ids || results.ids.length === 0) {
    return 0;
  }

  await collection.delete({ ids: results.ids });
  return results.ids.length;
}

/**
 * Mendapatkan semua chunk yang berasal dari satu file sumber tertentu.
 * Dipanggil ketika admin ingin melihat isi chunk dari panel.
 *
 * @param fileName - Nama file yang akan diambil chunk-nya
 */
export async function getChunksBySource(fileName: string, sourceId?: string) {
  const collection = await getOrCreateCollection();

  let results = await collection.get({
    where: { source: fileName },
    include: [IncludeEnum.Documents, IncludeEnum.Metadatas],
  });

  if ((!results.ids || results.ids.length === 0) && sourceId) {
    results = await collection.get({
      where: { source_id: sourceId },
      include: [IncludeEnum.Documents, IncludeEnum.Metadatas],
    });
  }

  return results;
}
