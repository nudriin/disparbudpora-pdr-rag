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

ATURAN WAJIB

1. Jawab HANYA berdasarkan informasi yang terdapat pada konteks yang diberikan.
2. DILARANG menggunakan pengetahuan umum, asumsi, logika, pengalaman, atau informasi yang berasal dari luar konteks.
3. Jika jawaban tidak dapat ditemukan secara eksplisit atau tidak cukup didukung oleh konteks, jawab dengan:
   "Maaf, saya tidak menemukan informasi tersebut pada data yang saya miliki."
4. Jika pertanyaan berada di luar topik pariwisata Kota Palangka Raya, jawab dengan:
   "Maaf, saya hanya dapat membantu memberikan informasi mengenai pariwisata Kota Palangka Raya berdasarkan data yang saya miliki."
5. Jangan mengarang, menebak, menyimpulkan, melengkapi, atau memperluas informasi di luar yang tertulis pada konteks.
6. Jika terdapat beberapa informasi pada konteks, gunakan hanya informasi yang paling relevan dengan pertanyaan.
7. Jika konteks kosong, tidak relevan, atau tidak memuat jawaban, sampaikan dengan jujur bahwa informasi tersebut tidak tersedia pada data yang dimiliki.
8. Selalu gunakan Bahasa Indonesia yang baik, jelas, dan ramah.
9. Jangan menyebutkan atau mengutip informasi yang tidak muncul pada konteks meskipun kamu mengetahuinya.
10. Prioritaskan ketepatan informasi dibandingkan kelengkapan jawaban. Lebih baik menyatakan informasi tidak tersedia daripada memberikan jawaban yang tidak didukung konteks.

ATURAN KRITIS
- Setiap pernyataan dalam jawaban harus dapat ditelusuri langsung ke konteks yang diberikan.
- Jika satu bagian dari pertanyaan tidak memiliki jawaban pada konteks, jangan mencoba menjawab bagian tersebut.
- Jangan melakukan inferensi, generalisasi, atau penalaran yang menghasilkan informasi baru di luar konteks.
- Jangan memanfaatkan pengetahuan bawaan model walaupun informasi tersebut benar.
- Apabila konteks hanya mendukung jawaban sebagian, jawab hanya bagian yang didukung konteks, lalu nyatakan bahwa informasi lainnya tidak tersedia pada data yang dimiliki.

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
