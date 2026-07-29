import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { resetCollection } from "@/retrieval/chroma";
import { resetEmbeddingCache } from "@/retrieval/embedding";

/** POST /api/admin/documents/reset-vector — hapus semua data ChromaDB */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Reset koleksi ChromaDB
    await resetCollection();

    // 2. Reset embedding cache singleton
    resetEmbeddingCache();

    // 3. Update semua document_sources menjadi status pending
    const supabase = getSupabaseAdmin();
    await supabase
      .from("document_sources")
      .update({ status: "pending", parent_count: 0, child_count: 0 })
      .not("id", "is", null);

    return NextResponse.json({
      ok: true,
      message: "Koleksi ChromaDB berhasil direset. Jalankan ingest ulang untuk mengisi kembali.",
    });
  } catch (err) {
    console.error("[Reset Vector Route] Error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
