import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

/** GET /api/admin/history — paginated history dengan opsional pencarian */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const from = (page - 1) * limit;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("conversation_history")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (search) {
    query = query.ilike("user_message", `%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    conversations: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
