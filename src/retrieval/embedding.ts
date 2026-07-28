/**
 * ============================================================
 *  EMBEDDING FACTORY — Multi-Provider Switchable
 * ============================================================
 *
 *  Tujuan: Solusi jika Google Generative Embedding API limit habis
 *          (429 Too Many Requests). Kita sediakan opsi SWITCH
 *          ke LOCAL embedding model (Transformers.js) yang 100%
 *          GRATIS & offline, TIDAK BUTUH API KEY apapun!
 *
 *  Provider yang tersedia:
 *  1. "google"        = GoogleGenerativeAIEmbeddings (bayar / limit free tier)
 *  2. "transformers"  = HuggingFace Transformers.js (RUN DI CPU LOKAL, GRATIS!)
 *
 *  Setting dibaca dari app_settings key "embedding.config" di Supabase,
 *  jadi admin bisa ganti-ganti provider/model DARI ADMIN PANEL tanpa deploy.
 *
 *  Jika key di DB belum ada → default = "transformers" (selalu available!),
 *  kecuali admin secara eksplisit mau pakai Google.
 * ============================================================
 */

import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";

// ============================================================
// Tipe & Konstanta
// ============================================================
export type EmbeddingProvider = "google" | "transformers";

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  /** Nama model (misal gemini-embedding-001, Xenova/multilingual-e5-small) */
  model: string;
  /** Dimensi output vektor, harus sesuai model! */
  dimensions: number;
}

// Default jika setting DB tidak ada: SELALU PAKAI LOKAL!
// (gratis, tanpa API key, 100% aman tidak kena 429).
// Model multilingual-e5-small: bagus untuk Bahasa Indonesia + Inggris.
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
    label: "🟢 Transformers.js (GRATIS, Lokal) — multilingual-e5-small",
    value: { provider: "transformers", model: "Xenova/multilingual-e5-small", dimensions: 384 },
  },
  {
    label: "🟢 Transformers.js (GRATIS, Lokal) — all-MiniLM-L6-v2",
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

// ============================================================
// Singleton cache: model embedding DIBUAT SEKALI SAJA per (provider+model).
// Kalau ganti provider lewat admin, kita buat instance baru dan
// invalidate cache.
// ============================================================
let _cachedEmbeddings: EmbeddingsInterface | null = null;
let _cachedConfigSignature = "";

function sig(cfg: EmbeddingConfig): string {
  return `${cfg.provider}::${cfg.model}::${cfg.dimensions}`;
}

/**
 * Mendapatkan instance LangChain Embeddings sesuai konfigurasi.
 * (Singleton: selalu return instance yang sama jk config tidak berubah).
 */
export function getEmbeddingModel(config: EmbeddingConfig): EmbeddingsInterface {
  const signature = sig(config);

  // Reuse cache jika sama persis
  if (_cachedEmbeddings && _cachedConfigSignature === signature) {
    return _cachedEmbeddings;
  }

  console.log(`\n🧠 [Embedding] Membuat instance baru: ${config.provider} | ${config.model} (dim=${config.dimensions})`);
  let model: EmbeddingsInterface;

  switch (config.provider) {
    case "google": {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error(
          "GOOGLE_API_KEY belum di-set. Pilih provider 'Transformers.js (Lokal Gratis)' " +
          "di Admin Settings > Embedding, atau isi GOOGLE_API_KEY di .env.local."
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

/** Paksa buat ulang instance (misal saat admin ganti setting baru) */
export function resetEmbeddingCache(): void {
  _cachedEmbeddings = null;
  _cachedConfigSignature = "";
  console.log("🧠 [Embedding] Cache di-reset (setting baru diterapkan).");
}
