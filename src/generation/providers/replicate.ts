import Replicate from "replicate";
import type { LLMGenerator, GeneratorConfig } from "../types";

/**
 * Implementasi LLM Generator untuk Replicate API.
 *
 * Replicate menerima model dalam format `owner/model:version`.
 * Contoh:
 *   - "meta/meta-llama-3.1-405b-instruct"
 *   - "mistralai/mixtral-8x7b-instruct-v0.1"
 *   - "meta/llama-3-8b-chat"
 */
export class ReplicateGenerator implements LLMGenerator {
  public readonly provider = "replicate" as const;
  public readonly model: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly client: Replicate;

  constructor(config: GeneratorConfig) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN tidak ditemukan di environment variables");
    }
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxOutputTokens = config.maxOutputTokens;

    this.client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * Menggabungkan system + human prompt menjadi format yang kompatibel
   * dengan mayoritas model chat LLM di Replicate (LLaMA 3, Mixtral, dst).
   *
   * BUG FIX PENTING:
   *  1. Placeholder {context} ada di SYSTEM PROMPT (bukan human template),
   *     jadi kita harus replace variables di KEDUA string, bukan cuma di human.
   *  2. Jangan pakai tag custom seperti <|begin_of_solution|>. Gunakan format
   *     Llama Chat yang standar agar model tidak menuliskan tag tersebut
   *     kembali ke jawaban pengguna.
   */
  async runPrompt(
    systemPrompt: string,
    humanTemplate: string,
    variables: Record<string, string>
  ): Promise<string> {
    // ============================================================
    // 1. ISI SEMUA PLACEHOLDER (context DAN question)
    //    — BUG UTAMA SEBELUMNYA: replace hanya dilakukan di humanTemplate,
    //      padahal {context} ada di systemPrompt!
    // ============================================================
    function fillPlaceholders(tmpl: string): string {
      let result = tmpl;
      for (const [k, v] of Object.entries(variables)) {
        result = result.replaceAll(`{${k}}`, v);
      }
      return result;
    }

    const filledSystem = fillPlaceholders(systemPrompt);
    const filledHuman = fillPlaceholders(humanTemplate);

    // ============================================================
    // 2. FORMAT STANDAR LLAMA CHAT TEMPLATE
    //    Format ini dikenali native oleh LLaMA 3, LLaMA 3.1, Mixtral,
    //    dan mayoritas model instruct di Replicate.
    //    Reference: https://llama.meta.com/docs/model-cards-and-prompt-formats/meta-llama-3/
    // ============================================================
    const BOS = "<|begin_of_text|>";
    const SYS_START = "<|start_header_id|>system<|end_header_id|>\n\n";
    const SYS_END = "<|eot_id|>";
    const USR_START = "<|start_header_id|>user<|end_header_id|>\n\n";
    const USR_END = "<|eot_id|>";
    const AST_START = "<|start_header_id|>assistant<|end_header_id|>\n\n";

    const formattedPrompt =
      BOS +
      SYS_START + filledSystem + SYS_END +
      USR_START + filledHuman + USR_END +
      AST_START;

    const output = await this.client.run(
      this.model as `${string}/${string}:${string}`,
      {
        input: {
          prompt: formattedPrompt,
          temperature: this.temperature,
          max_new_tokens: this.maxOutputTokens,
          top_p: 0.95,
          // prompt_template = "{prompt}" artinya model tidak memformat ulang
          // lagi (kita sudah format dengan Llama Chat template di atas)
          prompt_template: "{prompt}",
        },
      }
    );

    // Replicate bisa mengembalikan string atau array token
    if (Array.isArray(output)) {
      return output.join("").trim();
    }
    return String(output ?? "").trim();
  }
}
