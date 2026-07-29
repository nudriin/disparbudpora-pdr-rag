import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getEmbeddingConfig, saveEmbeddingConfig } from "@/config/settings";
import {
  EMBEDDING_PRESET_OPTIONS,
  resetEmbeddingCache,
  type EmbeddingConfig,
} from "@/retrieval/embedding";

/**
 * GET /api/admin/settings/embedding
 * Mengembalikan konfigurasi Embedding saat ini.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getEmbeddingConfig();

  return NextResponse.json({
    ok: true,
    config,
    presets: EMBEDDING_PRESET_OPTIONS,
    env: {
      hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
      hasReplicateApiKey: !!process.env.REPLICATE_API_TOKEN,
    },
  });
}

/**
 * POST /api/admin/settings/embedding
 * Menyimpan konfigurasi Embedding baru ke database.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<EmbeddingConfig>;

    if (
      !body.provider ||
      (body.provider !== "google" &&
        body.provider !== "transformers" &&
        body.provider !== "replicate")
    ) {
      return NextResponse.json(
        { error: 'Provider embedding harus "google", "transformers", atau "replicate"' },
        { status: 400 }
      );
    }
    if (!body.model || typeof body.model !== "string" || body.model.trim().length === 0) {
      return NextResponse.json(
        { error: "Nama model embedding tidak boleh kosong" },
        { status: 400 }
      );
    }
    if (typeof body.dimensions !== "number" || body.dimensions <= 0) {
      return NextResponse.json(
        { error: "Dimensi embedding harus berupa angka positif" },
        { status: 400 }
      );
    }

    const config: EmbeddingConfig = {
      provider: body.provider,
      model: body.model.trim(),
      dimensions: Math.round(body.dimensions),
    };

    const supabase = getSupabaseAdmin();
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", session.email)
      .maybeSingle();

    await saveEmbeddingConfig(config, adminRow?.id as string | undefined);
    resetEmbeddingCache();

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[POST /admin/settings/embedding] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
