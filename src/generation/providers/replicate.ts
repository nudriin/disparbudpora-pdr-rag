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
   * Replicate umumnya tidak memisahkan system vs human message
   * seperti LangChain, jadi kita gabungkan menjadi satu prompt
   * standar chat-style yang diterima mayoritas model LLaMA/Mixtral.
   */
  async runPrompt(
    systemPrompt: string,
    humanTemplate: string,
    variables: Record<string, string>
  ): Promise<string> {
    // Isi placeholders pada human template
    let humanPrompt = humanTemplate;
    for (const [k, v] of Object.entries(variables)) {
      humanPrompt = humanPrompt.replaceAll(`{${k}}`, v);
    }

    // Format system + user prompt menjadi format yang kompatibel
    // dengan model chat Replicate (mirip LlamaChat template)
    const formattedPrompt =
      `<|begin_of_solution|>\n` +
      `<|begin_of_thought|>\n` +
      `System instructions:\n${systemPrompt}\n\n` +
      `<|end_of_thought|>\n` +
      `<|begin_of_solution|>\n` +
      `User question:\n${humanPrompt}\n\n` +
      `Assistant answer:\n`;

    const output = await this.client.run(this.model as `${string}/${string}:${string}`, {
      input: {
        prompt: formattedPrompt,
        temperature: this.temperature,
        max_new_tokens: this.maxOutputTokens,
        top_p: 0.95,
        prompt_template: "{prompt}", // Kita sudah format sendiri
      },
    });

    // Replicate bisa mengembalikan string atau array token
    if (Array.isArray(output)) {
      return output.join("").trim();
    }
    return String(output ?? "").trim();
  }
}
