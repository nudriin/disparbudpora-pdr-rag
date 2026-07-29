import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { resetCollection } from "@/retrieval/chroma";
import { resetEmbeddingCache } from "@/retrieval/embedding";

/** POST /api/admin/documents/reset-all — Hapus total semua dokumen & data ChromaDB */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Reset koleksi ChromaDB (hapus seluruh vektor)
    await resetCollection();

    // 2. Reset cache model embedding
    resetEmbeddingCache();

    // 3. Hapus semua data dokumen dari Supabase database
    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("document_sources")
      .delete()
      .not("id", "is", null);

    if (dbError) {
      throw new Error(`Gagal menghapus dokumen dari Supabase: ${dbError.message}`);
    }

    return NextResponse.json({
      ok: true,
      message: "Seluruh dokumen dan vektor ChromaDB berhasil dihapus total dari sistem.",
    });
  } catch (err) {
    console.error("[Reset All Documents Route] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
