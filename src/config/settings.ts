import { getSupabaseAdmin } from "../lib/supabase/client";
import type { GeneratorConfig, LLMProvider, RetrievalConfig } from "../generation/types";
import { DEFAULT_GENERATOR_CONFIG } from "../generation/generator";
import type { EmbeddingConfig, EmbeddingProvider } from "../retrieval/embedding";
import { DEFAULT_EMBEDDING_CONFIG } from "../retrieval/embedding";

export const APP_SETTING_KEY_GENERATOR = "generator.config";
export const APP_SETTING_KEY_EMBEDDING = "embedding.config";
export const APP_SETTING_KEY_RETRIEVAL = "retrieval.config";

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  useHyde: true,
  nResults: 10,
  minSimilarity: 0.2,
};

/**
 * Membaca setting generator dari tabel `app_settings` Supabase.
 * Jika key tidak ditemukan atau parsing gagal, mengembalikan default config.
 */
export async function getGeneratorConfig(): Promise<GeneratorConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEY_GENERATOR)
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_GENERATOR_CONFIG;
    }

    const val = data.value as Record<string, unknown>;
    const provider = (val.provider as LLMProvider | undefined) ?? DEFAULT_GENERATOR_CONFIG.provider;
    const model = (val.model as string) ?? DEFAULT_GENERATOR_CONFIG.model;
    const temperature =
      typeof val.temperature === "number" ? val.temperature : DEFAULT_GENERATOR_CONFIG.temperature;
    const maxOutputTokens =
      typeof val.maxOutputTokens === "number"
        ? val.maxOutputTokens
        : DEFAULT_GENERATOR_CONFIG.maxOutputTokens;

    if (provider !== "gemini" && provider !== "replicate") {
      return DEFAULT_GENERATOR_CONFIG;
    }

    if (typeof model !== "string" || model.trim().length === 0) {
      return DEFAULT_GENERATOR_CONFIG;
    }

    return { provider, model, temperature, maxOutputTokens };
  } catch (err) {
    console.error("[getGeneratorConfig] Failed to read setting from DB, using default:", err);
    return DEFAULT_GENERATOR_CONFIG;
  }
}

/**
 * Menyimpan setting generator ke tabel `app_settings` Supabase (upsert).
 */
export async function saveGeneratorConfig(
  config: GeneratorConfig,
  updatedByAdminId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const payload: Record<string, unknown> = {
    key: APP_SETTING_KEY_GENERATOR,
    value: config as unknown as Record<string, unknown>,
  };
  if (updatedByAdminId) {
    payload.updated_by = updatedByAdminId;
  }

  const { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "key",
  });

  if (error) {
    throw new Error(`Failed to save generator config: ${error.message}`);
  }
}

// ============================================================
// EMBEDDING SETTINGS
// ============================================================

/**
 * Membaca setting embedding dari tabel `app_settings`.
 * Jika kosong/gagal parsing → return DEFAULT_EMBEDDING_CONFIG (Transformers.js Lokal Gratis).
 */
export async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEY_EMBEDDING)
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_EMBEDDING_CONFIG;
    }

    const val = data.value as Record<string, unknown>;
    const provider = (val.provider as EmbeddingProvider | undefined) ?? DEFAULT_EMBEDDING_CONFIG.provider;
    const model = (val.model as string | undefined) ?? DEFAULT_EMBEDDING_CONFIG.model;
    const dimensions =
      typeof val.dimensions === "number" ? val.dimensions : DEFAULT_EMBEDDING_CONFIG.dimensions;

    if (provider !== "google" && provider !== "transformers" && provider !== "replicate") {
      return DEFAULT_EMBEDDING_CONFIG;
    }
    if (typeof model !== "string" || model.trim().length === 0) {
      return DEFAULT_EMBEDDING_CONFIG;
    }
    return { provider, model, dimensions };
  } catch (err) {
    console.error("[getEmbeddingConfig] Failed to read setting from DB, using default:", err);
    return DEFAULT_EMBEDDING_CONFIG;
  }
}

export async function saveEmbeddingConfig(
  config: EmbeddingConfig,
  updatedByAdminId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const payload: Record<string, unknown> = {
    key: APP_SETTING_KEY_EMBEDDING,
    value: config as unknown as Record<string, unknown>,
  };
  if (updatedByAdminId) {
    payload.updated_by = updatedByAdminId;
  }

  const { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "key",
  });
  if (error) {
    throw new Error(`Failed to save embedding config: ${error.message}`);
  }
}

// ============================================================
// RETRIEVAL SETTINGS
// ============================================================

/**
 * Membaca setting retrieval (HyDE, nResults, minSimilarity) dari Supabase.
 * Jika kosong/gagal → return DEFAULT_RETRIEVAL_CONFIG.
 */
export async function getRetrievalConfig(): Promise<RetrievalConfig> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEY_RETRIEVAL)
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_RETRIEVAL_CONFIG;
    }

    const val = data.value as Record<string, unknown>;
    return {
      useHyde: typeof val.useHyde === "boolean" ? val.useHyde : DEFAULT_RETRIEVAL_CONFIG.useHyde,
      nResults: typeof val.nResults === "number" ? Math.max(1, Math.min(50, val.nResults)) : DEFAULT_RETRIEVAL_CONFIG.nResults,
      minSimilarity: typeof val.minSimilarity === "number" ? Math.max(0, Math.min(1, val.minSimilarity)) : DEFAULT_RETRIEVAL_CONFIG.minSimilarity,
    };
  } catch (err) {
    console.error("[getRetrievalConfig] Failed to read setting from DB, using default:", err);
    return DEFAULT_RETRIEVAL_CONFIG;
  }
}

/**
 * Menyimpan setting retrieval ke tabel `app_settings` Supabase (upsert).
 */
export async function saveRetrievalConfig(
  config: RetrievalConfig,
  updatedByAdminId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const payload: Record<string, unknown> = {
    key: APP_SETTING_KEY_RETRIEVAL,
    value: config as unknown as Record<string, unknown>,
  };
  if (updatedByAdminId) {
    payload.updated_by = updatedByAdminId;
  }

  const { error } = await supabase.from("app_settings").upsert(payload, {
    onConflict: "key",
  });
  if (error) {
    throw new Error(`Failed to save retrieval config: ${error.message}`);
  }
}
