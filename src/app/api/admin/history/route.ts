import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export interface UserChatSession {
  telegram_chat_id: number;
  telegram_username: string | null;
  sender_name: string | null;
  last_message: string;
  last_active_at: string;
  total_messages: number;
}

/**
 * GET /api/admin/history
 *  - Mode 1 (jika parameter ?chat_id=XXXX ada): Mengembalikan seluruh pesan thread user (kronologis ASC)
 *  - Mode 2 (default): Mengembalikan daftar user sessions yang dikelompokkan per telegram_chat_id
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const chatIdParam = searchParams.get("chat_id");
  const search = searchParams.get("search")?.toLowerCase().trim() ?? "";

  const supabase = getSupabaseAdmin();

  // Mode 1: Ambil seluruh pesan untuk 1 user tertentu
  if (chatIdParam) {
    const chatId = parseInt(chatIdParam, 10);
    if (isNaN(chatId)) {
      return NextResponse.json({ error: "chat_id tidak valid" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversation_history")
      .select("*")
      .eq("telegram_chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      chat_id: chatId,
      messages: data ?? [],
    });
  }

  // Mode 2: Dapatkan daftar percakapan terbaru untuk dikelompokkan per User
  const { data, error } = await supabase
    .from("conversation_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Grouping di memory berdasarkan telegram_chat_id
  const sessionMap = new Map<number, UserChatSession>();

  for (const row of rows) {
    const cid = Number(row.telegram_chat_id);
    if (!sessionMap.has(cid)) {
      sessionMap.set(cid, {
        telegram_chat_id: cid,
        telegram_username: row.telegram_username ?? null,
        sender_name: row.sender_name ?? null,
        last_message: row.user_message,
        last_active_at: row.created_at,
        total_messages: 1,
      });
    } else {
      const existing = sessionMap.get(cid)!;
      existing.total_messages += 1;
      // Ambil username / sender_name terbaru jika sebelumnya null
      if (!existing.telegram_username && row.telegram_username) {
        existing.telegram_username = row.telegram_username;
      }
      if (!existing.sender_name && row.sender_name) {
        existing.sender_name = row.sender_name;
      }
    }
  }

  let users = Array.from(sessionMap.values());

  // Filter pencarian jika diberikan
  if (search) {
    users = users.filter((u) => {
      const nameMatch = u.sender_name?.toLowerCase().includes(search);
      const userMatch = u.telegram_username?.toLowerCase().includes(search);
      const msgMatch = u.last_message?.toLowerCase().includes(search);
      const idMatch = String(u.telegram_chat_id).includes(search);
      return nameMatch || userMatch || msgMatch || idMatch;
    });
  }

  return NextResponse.json({
    ok: true,
    users,
    totalUsers: users.length,
    totalMessages: rows.length,
  });
}
