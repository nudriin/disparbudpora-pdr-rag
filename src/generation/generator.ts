import type {
  GeneratorConfig,
  LLMGenerator,
  LLMProvider,
  GenerationResult,
} from "./types";
import type { RetrievalResult } from "../retrieval/retriever";
import { GeminiGenerator } from "./providers/gemini";
import { ReplicateGenerator } from "./providers/replicate";

// ============================================================
// KONFIGURASI DEFAULT
// Digunakan jika admin belum mengatur setting di panel admin,
// atau saat reading dari DB gagal (fail-safe fallback).
// ============================================================
export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  temperature: 0.3,
  maxOutputTokens: 1024,
};

/**
 * Factory function untuk membuat instance LLM generator
 * berdasarkan konfigurasi dari admin panel / database.
 */
export function createLLMGenerator(config: GeneratorConfig): LLMGenerator {
  switch (config.provider) {
    case "gemini":
      return new GeminiGenerator(config);
    case "replicate":
      return new ReplicateGenerator(config);
    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Provider LLM tidak dikenal: ${_exhaustive}`);
    }
  }
}

// ============================================================
// PROMPT TEMPLATE YANG KETAT
// LLM hanya boleh menjawab dari konteks dokumen pariwisata.
// ============================================================
export const SYSTEM_PROMPT = `Kamu adalah asisten virtual pariwisata Kota Palangka Raya yang ramah dan informatif. Tugasmu adalah menjawab pertanyaan wisatawan berdasarkan informasi yang tersedia.

ATURAN PENTING:
1. Jawab HANYA berdasarkan konteks yang diberikan di bawah ini.
2. Jika pertanyaan tidak berkaitan dengan pariwisata Palangka Raya atau informasinya tidak ada dalam konteks, katakan dengan sopan bahwa kamu hanya dapat membantu informasi pariwisata Kota Palangka Raya.
3. Jawab selalu dalam Bahasa Indonesia yang baik dan ramah.
4. Jangan mengarang atau menambahkan informasi yang tidak ada dalam konteks.
5. Jika konteks kosong atau tidak relevan, sampaikan dengan jujur.

KONTEKS INFORMASI:
{context}`;

export const HUMAN_TEMPLATE = `Pertanyaan: {question}`;

/**
 * Menggabungkan konteks dari parent documents menjadi satu string
 * yang rapi untuk dimasukkan ke dalam prompt.
 */
export function formatContext(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return "(Tidak ada konteks yang ditemukan)";
  }

  return results
    .map((r, i) => `[Sumber ${i + 1}: ${r.source}]\n${r.parentContent}`)
    .join("\n\n---\n\n");
}

/**
 * Pesan fallback ketika tidak ada konteks relevan yang ditemukan.
 */
export const FALLBACK_MESSAGE =
  "Maaf, saya tidak menemukan informasi yang relevan untuk pertanyaan tersebut " +
  "dalam basis pengetahuan saya. Saya hanya dapat membantu informasi seputar " +
  "pariwisata Kota Palangka Raya. Silakan coba pertanyaan lain atau hubungi " +
  "Dinas Pariwisata Kota Palangka Raya untuk informasi lebih lanjut. 😊";

/**
 * Deteksi apakah LLM menyatakan tidak tahu (untuk logging analytics).
 */
export function detectWasAnswered(answer: string): boolean {
  const noAnswerKeywords = [
    "tidak ada informasi",
    "tidak dapat membantu",
    "hanya dapat membantu",
    "tidak ditemukan",
    "tidak tersedia",
  ];
  return !noAnswerKeywords.some((kw) =>
    answer.toLowerCase().includes(kw)
  );
}

/**
 * Menghasilkan jawaban dari LLM berdasarkan konteks parent documents.
 * Ini adalah fungsi entry-point utama untuk Pipeline 2 (Generation).
 */
export async function generateAnswer(
  question: string,
  context: RetrievalResult[],
  config: GeneratorConfig = DEFAULT_GENERATOR_CONFIG
): Promise<GenerationResult> {
  // Jika tidak ada konteks sama sekali, langsung kembalikan fallback
  if (context.length === 0) {
    return {
      answer: FALLBACK_MESSAGE,
      wasAnswered: false,
      context: [],
      provider: config.provider,
      model: config.model,
    };
  }

  const llm = createLLMGenerator(config);
  const contextString = formatContext(context);

  const answer = await llm.runPrompt(SYSTEM_PROMPT, HUMAN_TEMPLATE, {
    context: contextString,
    question,
  });

  const wasAnswered = detectWasAnswered(answer);

  return {
    answer,
    wasAnswered,
    context,
    provider: llm.provider,
    model: llm.model,
  };
}
