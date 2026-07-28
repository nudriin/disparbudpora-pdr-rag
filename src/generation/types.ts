import type { RetrievalResult } from "../retrieval/retriever";

export type LLMProvider = "gemini" | "replicate";

export const GEMINI_MODEL_PRESETS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
];

export const REPLICATE_MODEL_PRESETS = [
  "meta/meta-llama-3.1-405b-instruct",
  "meta/meta-llama-3.1-70b-instruct",
  "meta/meta-llama-3-70b-instruct",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "mistralai/mistral-7b-instruct-v0.2",
];

export interface GeneratorConfig {
  provider: LLMProvider;
  /**
   * Nama model lengkap:
   *  - Gemini: "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", dst
   *  - Replicate: "owner/model:version"
   *               contoh: "meta/meta-llama-3.1-405b-instruct",
   *                       "mistralai/mixtral-8x7b-instruct-v0.1"
   */
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface GenerationResult {
  answer: string;
  wasAnswered: boolean;
  context: RetrievalResult[];
  provider: LLMProvider;
  model: string;
}

/**
 * Interface abstrak untuk provider LLM.
 * Setiap provider (Gemini, Replicate, dll) harus mengimplementasikan
 * fungsi `runPrompt` yang sama agar bisa ditukar secara transparan.
 */
export interface LLMGenerator {
  provider: LLMProvider;
  model: string;
  runPrompt(
    systemPrompt: string,
    humanPrompt: string,
    variables: Record<string, string>
  ): Promise<string>;
}
