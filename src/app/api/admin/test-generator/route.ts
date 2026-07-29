import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { retrieveParentDocuments } from "@/retrieval/retriever";
import { generateAnswer } from "@/generation/generator";
import { getGeneratorConfig, saveGeneratorConfig, getEmbeddingConfig, saveEmbeddingConfig, getRetrievalConfig, saveRetrievalConfig } from "@/config/settings";
import type { GeneratorConfig } from "@/generation/types";
import type { RetrievalConfig } from "@/generation/types";
import { GEMINI_MODEL_PRESETS, REPLICATE_MODEL_PRESETS } from "@/generation/types";
import { EMBEDDING_PRESET_OPTIONS, resetEmbeddingCache, type EmbeddingConfig } from "@/retrieval/embedding";

export async function GET() {
  try {
    const [generator, embedding, retrieval] = await Promise.all([
      getGeneratorConfig(),
      getEmbeddingConfig(),
      getRetrievalConfig(),
    ]);
    return NextResponse.json({
      generator,
      embedding,
      retrieval,
      presetOptions: {
        geminiModels: GEMINI_MODEL_PRESETS,
        replicateModels: REPLICATE_MODEL_PRESETS,
        embeddingPresets: EMBEDDING_PRESET_OPTIONS,
      },
      env: {
        hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
        hasReplicateApiToken: !!process.env.REPLICATE_API_TOKEN,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      generator?: GeneratorConfig;
      config?: GeneratorConfig;
      embedding?: EmbeddingConfig;
      retrieval?: RetrievalConfig;
      question?: string;
      saveSettings?: boolean;
    };

    const generatorConfig = body.generator ?? body.config;
    const question = body.question;

    if (!generatorConfig || !question?.trim()) {
      return NextResponse.json(
        { error: "Body harus berisi generator (atau config) dan question" },
        { status: 400 }
      );
    }

    // Ambil embedding config dari body atau fallback ke setting aktif di DB
    const embeddingConfig = body.embedding ?? (await getEmbeddingConfig());

    // Ambil retrieval config dari body atau fallback ke setting aktif di DB
    const retrievalConfig = body.retrieval ?? (await getRetrievalConfig());

    // Simpan setting jika diminta admin
    if (body.saveSettings) {
      await Promise.all([
        saveGeneratorConfig(generatorConfig, session.id),
        saveEmbeddingConfig(embeddingConfig, session.id),
        saveRetrievalConfig(retrievalConfig, session.id),
      ]);
      resetEmbeddingCache();
    }

    const tStart = Date.now();

    // 1. Retrieval — pakai retrieval config dari body atau DB (dengan HyDE)
    const results = await retrieveParentDocuments(question, {
      nResults: retrievalConfig.nResults,
      minSimilarity: retrievalConfig.minSimilarity,
      embeddingConfig,
      useHyde: retrievalConfig.useHyde,
      hydeConfig: generatorConfig,
    });

    // 2. Generation — pakai generator config terpilih
    const generation = await generateAnswer(question, results, generatorConfig);
    const elapsedMs = Date.now() - tStart;

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
