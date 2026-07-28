import { getSupabaseAdmin } from "./client";

export interface ChatHistoryTurn {
  userMessage: string;
  botResponse: string;
}

/**
 * Mengambil N pasang percakapan terakhir untuk pengguna Telegram tertentu
 * dari tabel conversation_history di Supabase.
 *
 * @param telegramChatId - ID chat Telegram pengguna
 * @param limit - Jumlah pasang percakapan (default = 5)
 */
export async function getRecentChatHistory(
  telegramChatId: number,
  limit = 5
): Promise<ChatHistoryTurn[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("conversation_history")
      .select("user_message, bot_response, created_at")
      .eq("telegram_chat_id", telegramChatId)
      .not("bot_response", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    // Urutkan secara kronologis (ASC: lama -> baru)
    const chronological = data.reverse();

    return chronological.map((row) => ({
      userMessage: row.user_message,
      botResponse: row.bot_response || "",
    }));
  } catch (err) {
    console.error("[getRecentChatHistory] Error fetching history:", err);
    return [];
  }
}

/**
 * Memformat daftar riwayat percakapan menjadi string teks yang rapi untuk prompt LLM.
 */
export function formatChatHistory(history: ChatHistoryTurn[]): string {
  if (history.length === 0) return "";

  return history
    .map((turn, i) => `[Turn ${i + 1}]\nPengguna: ${turn.userMessage}\nAsisten: ${turn.botResponse}`)
    .join("\n\n");
}
