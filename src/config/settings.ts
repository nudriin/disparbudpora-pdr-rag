import { getSupabaseAdmin } from "../lib/supabase/client";
import type { GeneratorConfig, LLMProvider } from "../generation/types";
import { DEFAULT_GENERATOR_CONFIG } from "../generation/generator";

export const APP_SETTING_KEY_GENERATOR = "generator.config";

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
