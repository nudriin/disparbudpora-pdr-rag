import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";

/** GET /api/admin/documents — daftar semua dokumen */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("document_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}
