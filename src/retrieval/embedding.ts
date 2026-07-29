/**
 * ============================================================
 *  EMBEDDING FACTORY — Multi-Provider Switchable
 * ============================================================
 *
 *  Provider yang tersedia:
 *  1. "google"        = GoogleGenerativeAIEmbeddings (Google AI Studio)
 *  2. "transformers"  = HuggingFace Transformers.js (Lokal CPU)
 *  3. "replicate"     = Replicate Cloud API (misal zsxkib/embedding-gemma-300m)
 *
 *  Setting dibaca dari app_settings key "embedding.config" di Supabase,
 *  jadi admin bisa ganti-ganti provider/model DARI ADMIN PANEL tanpa deploy ulang.
 * ============================================================
 */

import { Embeddings, EmbeddingsParams, EmbeddingsInterface } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import Replicate from "replicate";

// ============================================================
// Tipe & Konstanta
// ============================================================
export type EmbeddingProvider = "google" | "transformers" | "replicate";

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  /** Nama model (misal gemini-embedding-001, Xenova/multilingual-e5-small, zsxkib/embedding-gemma-300m) */
  model: string;
  /** Dimensi output vektor, harus sesuai model! */
  dimensions: number;
}

// Custom Replicate Embeddings Class untuk LangChain
export interface ReplicateEmbeddingsParams extends EmbeddingsParams {
  model?: string;
  apiKey?: string;
}

export class ReplicateEmbeddings extends Embeddings implements ReplicateEmbeddingsParams {
  model: string;
  apiKey?: string;
  private client: Replicate;

  constructor(fields?: ReplicateEmbeddingsParams) {
    super(fields ?? {});
    this.model = fields?.model ?? "zsxkib/embedding-gemma-300m";
    this.apiKey = fields?.apiKey ?? process.env.REPLICATE_API_TOKEN;

    if (!this.apiKey) {
      throw new Error(
        "REPLICATE_API_TOKEN belum di-set di file environment (.env.local atau Vercel)."
      );
    }
    this.client = new Replicate({ auth: this.apiKey });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const emb = await this.embedQuery(text);
      results.push(emb);
    }
    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const output = await this.client.run(this.model as `${string}/${string}`, {
        input: { text: text },
      });

      if (Array.isArray(output)) {
        return output as number[];
      }
      if (typeof output === "object" && output !== null && "embedding" in output) {
        return (output as { embedding: number[] }).embedding;
      }
      if (typeof output === "object" && output !== null && "vector" in output) {
        return (output as { vector: number[] }).vector;
      }
      throw new Error(`Output dari Replicate model ${this.model} tidak berformat array vektor.`);
    } catch (err) {
      console.error(`[ReplicateEmbeddings] Error generating embedding:`, err);
      throw err;
    }
  }
}

// Default jika setting DB tidak ada: SELALU PAKAI LOKAL!
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: "transformers",
  model: "Xenova/multilingual-e5-small",
  dimensions: 384,
};

// Opsi preset untuk dropdown di Admin Panel
export const EMBEDDING_PRESET_OPTIONS: Array<{
  label: string;
  value: EmbeddingConfig;
}> = [
  {
    label: "🟣 Replicate Cloud — zsxkib/embedding-gemma-300m (768-dim, Cepat & Tanpa Quota Google)",
    value: { provider: "replicate", model: "zsxkib/embedding-gemma-300m", dimensions: 768 },
  },
  {
    label: "🟢 Transformers.js (GRATIS, Lokal) — multilingual-e5-small (384-dim)",
    value: { provider: "transformers", model: "Xenova/multilingual-e5-small", dimensions: 384 },
  },
  {
    label: "🟢 Transformers.js (GRATIS, Lokal) — all-MiniLM-L6-v2 (384-dim)",
    value: { provider: "transformers", model: "Xenova/all-MiniLM-L6-v2", dimensions: 384 },
  },
  {
    label: "🔵 Google AI Studio — gemini-embedding-001 (3072-dim)",
    value: { provider: "google", model: "gemini-embedding-001", dimensions: 3072 },
  },
  {
    label: "🔵 Google AI Studio — text-embedding-004 (768-dim)",
    value: { provider: "google", model: "text-embedding-004", dimensions: 768 },
  },
];

// Singleton cache instance
let _cachedEmbeddings: EmbeddingsInterface | null = null;
let _cachedConfigSignature = "";

function sig(cfg: EmbeddingConfig): string {
  return `${cfg.provider}::${cfg.model}::${cfg.dimensions}`;
}

/**
 * Mendapatkan instance LangChain Embeddings sesuai konfigurasi.
 */
export function getEmbeddingModel(config: EmbeddingConfig): EmbeddingsInterface {
  const signature = sig(config);

  if (_cachedEmbeddings && _cachedConfigSignature === signature) {
    return _cachedEmbeddings;
  }

  console.log(`\n🧠 [Embedding] Membuat instance baru: ${config.provider} | ${config.model} (dim=${config.dimensions})`);
  let model: EmbeddingsInterface;

  switch (config.provider) {
    case "replicate": {
      model = new ReplicateEmbeddings({
        model: config.model,
      });
      break;
    }

    case "google": {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error(
          "GOOGLE_API_KEY belum di-set. Pilih provider Replicate atau Transformers.js di Admin Settings."
        );
      }
      model = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: config.model,
      });
      break;
    }

    case "transformers":
    default: {
      model = new HuggingFaceTransformersEmbeddings({
        model: config.model,
      });
      break;
    }
  }

  _cachedEmbeddings = model;
  _cachedConfigSignature = signature;
  return model;
}

/** Paksa buat ulang instance */
export function resetEmbeddingCache(): void {
  _cachedEmbeddings = null;
  _cachedConfigSignature = "";
  console.log("🧠 [Embedding] Cache di-reset.");
}
