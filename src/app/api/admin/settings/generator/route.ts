import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getGeneratorConfig, saveGeneratorConfig } from "@/config/settings";
import type { GeneratorConfig } from "@/generation/types";

/**
 * GET /api/admin/settings/generator
 * Mengembalikan konfigurasi LLM generator saat ini (provider, model, dll).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getGeneratorConfig();

  // Tambahkan informasi apakah API key tersedia di environment
  // (untuk petunjuk di admin panel)
  return NextResponse.json({
    ok: true,
    config,
    env: {
      geminiKeyPresent: !!process.env.GOOGLE_API_KEY,
      replicateKeyPresent: !!process.env.REPLICATE_API_TOKEN,
    },
  });
}

/**
 * POST /api/admin/settings/generator
 * Menyimpan konfigurasi LLM generator baru ke database (key-value store).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<GeneratorConfig>;

    // Validasi input
    if (!body.provider || (body.provider !== "gemini" && body.provider !== "replicate")) {
      return NextResponse.json(
        { error: 'Provider harus "gemini" atau "replicate"' },
        { status: 400 }
      );
    }
    if (!body.model || typeof body.model !== "string" || body.model.trim().length === 0) {
      return NextResponse.json(
        { error: "Nama model tidak boleh kosong" },
        { status: 400 }
      );
    }

    const temperature =
      typeof body.temperature === "number"
        ? Math.min(1, Math.max(0, body.temperature))
        : 0.3;
    const maxOutputTokens =
      typeof body.maxOutputTokens === "number"
        ? Math.min(8192, Math.max(1, Math.round(body.maxOutputTokens)))
        : 1024;

    const config: GeneratorConfig = {
      provider: body.provider,
      model: body.model.trim(),
      temperature,
      maxOutputTokens,
    };

    // Ambil ID admin untuk audit trail
    const supabase = getSupabaseAdmin();
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", session.email)
      .maybeSingle();

    await saveGeneratorConfig(config, adminRow?.id as string | undefined);

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[POST /admin/settings/generator] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
