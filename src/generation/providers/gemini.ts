import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { LLMGenerator, GeneratorConfig } from "../types";

/**
 * Implementasi LLM Generator untuk Google Gemini via LangChain.
 */
export class GeminiGenerator implements LLMGenerator {
  public readonly provider = "gemini" as const;
  public readonly model: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(config: GeneratorConfig) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY tidak ditemukan di environment variables");
    }
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxOutputTokens = config.maxOutputTokens;
  }

  async runPrompt(
    systemPrompt: string,
    humanTemplate: string,
    variables: Record<string, string>
  ): Promise<string> {
    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
      model: this.model,
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanTemplate],
    ]);

    const chain = prompt.pipe(llm).pipe(new StringOutputParser());
    return await chain.invoke(variables);
  }
}
