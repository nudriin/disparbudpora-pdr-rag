import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { retrieveParentDocuments } from "@/retrieval/retriever";
import { generateAnswer } from "@/generation/generator";
import type { GeneratorConfig } from "@/generation/types";

/**
 * POST /api/admin/test-generator
 * Endpoint untuk admin "mengetes" konfigurasi LLM secara langsung
 * sebelum diterapkan ke bot Telegram sungguhan.
 *
 * Body:
 *   - config: GeneratorConfig (provider, model, temperature, maxOutputTokens)
 *   - question: string (pertanyaan uji)
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      config: GeneratorConfig;
      question: string;
    };

    if (!body.config || !body.question) {
      return NextResponse.json(
        { error: "Body harus berisi config dan question" },
        { status: 400 }
      );
    }

    // 1. Retrieval — cari parent docs yang relevan
    const results = await retrieveParentDocuments(body.question, {
      nResults: 5,
      minSimilarity: 0.4,
    });

    // 2. Generation — pakai config dari request admin
    const startedAt = Date.now();
    const generation = await generateAnswer(body.question, results, body.config);
    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      answer: generation.answer,
      wasAnswered: generation.wasAnswered,
      provider: generation.provider,
      model: generation.model,
      elapsedMs,
      contextCount: generation.context.length,
      context: generation.context.map((r) => ({
        source: r.source,
        similarity: r.similarity,
        childSnippet: r.childContent.substring(0, 120),
      })),
    });
  } catch (err) {
    console.error("[POST /admin/test-generator] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
