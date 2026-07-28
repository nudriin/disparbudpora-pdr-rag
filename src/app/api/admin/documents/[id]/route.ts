import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { deleteChunksBySource, getChunksBySource } from "@/retrieval/chroma";

/** GET /api/admin/documents/[id] — ambil detail dokumen dan chunk-nya */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error: fetchError } = await supabase
    .from("document_sources")
    .select("file_name")
    .eq("id", id)
    .single();

  const doc = data as { file_name: string } | null;

  if (fetchError || !doc) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  try {
    const chunks = await getChunksBySource(doc.file_name);
    return NextResponse.json({ ok: true, chunks });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** DELETE /api/admin/documents/[id] — hapus dokumen dan chunk-nya di ChromaDB */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // 1. Dapatkan nama file
  const { data, error: fetchError } = await supabase
    .from("document_sources")
    .select("file_name")
    .eq("id", id)
    .single();

  const doc = data as { file_name: string } | null;

  if (fetchError || !doc) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  try {
    // 2. Hapus chunk dari ChromaDB berdasarkan source (nama file)
    const deletedCount = await deleteChunksBySource(doc.file_name);

    // 3. Hapus record dari Supabase (CASCADE ke ingestion_jobs)
    await supabase.from("document_sources").delete().eq("id", id);

    return NextResponse.json({
      ok: true,
      message: `Dokumen "${doc.file_name}" dihapus. ${deletedCount} chunk dihapus dari ChromaDB.`,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
