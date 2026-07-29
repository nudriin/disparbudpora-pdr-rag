import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getRetrievalConfig, saveRetrievalConfig } from "@/config/settings";
import type { RetrievalConfig } from "@/generation/types";

/**
 * GET /api/admin/settings/retrieval
 * Mengembalikan konfigurasi retrieval (HyDE, nResults, minSimilarity).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getRetrievalConfig();
  return NextResponse.json({ ok: true, config });
}

/**
 * POST /api/admin/settings/retrieval
 * Menyimpan konfigurasi retrieval baru ke database.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<RetrievalConfig>;

    const config: RetrievalConfig = {
      useHyde: typeof body.useHyde === "boolean" ? body.useHyde : true,
      nResults:
        typeof body.nResults === "number"
          ? Math.max(1, Math.min(50, Math.round(body.nResults)))
          : 10,
      minSimilarity:
        typeof body.minSimilarity === "number"
          ? Math.max(0, Math.min(1, body.minSimilarity))
          : 0.2,
    };

    const supabase = getSupabaseAdmin();
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", session.email)
      .maybeSingle();

    await saveRetrievalConfig(config, adminRow?.id as string | undefined);

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error("[POST /admin/settings/retrieval] error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
