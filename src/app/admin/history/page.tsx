import { getSupabaseAdmin } from "@/lib/supabase/client";
import AuthedLayout from "@/components/admin/AuthedLayout";
import HistoryClient from "@/components/admin/HistoryClient";

async function getHistory(page = 1, limit = 20) {
  const supabase = getSupabaseAdmin();
  const from = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("conversation_history")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw new Error(error.message);
  return { conversations: data ?? [], total: count ?? 0, page, limit };
}

export default async function HistoryPage() {
  const { conversations, total } = await getHistory();

  return (
    <AuthedLayout>
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1a202c", marginBottom: "0.5rem" }}>
        History Percakapan
      </h1>
      <p style={{ color: "#718096", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Seluruh percakapan pengguna dengan bot Telegram. Total: <strong>{total}</strong> pesan.
      </p>
      <HistoryClient initialConversations={conversations} initialTotal={total} />
    </div>
    </AuthedLayout>
  );
}
