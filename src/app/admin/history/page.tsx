import { getSupabaseAdmin } from "@/lib/supabase/client";
import AuthedLayout from "@/components/admin/AuthedLayout";
import HistoryClient from "@/components/admin/HistoryClient";

async function getHistory() {
  const supabase = getSupabaseAdmin();

  const { data, count, error } = await supabase
    .from("conversation_history")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return { conversations: data ?? [], total: count ?? 0 };
}

export default async function HistoryPage() {
  const { conversations, total } = await getHistory();

  return (
    <AuthedLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "calc(100vh - 130px)", overflow: "hidden" }}>
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#091426",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#0058be" }}>
              forum
            </span>
            History Chat Telegram
          </h1>
          <p style={{ color: "#45474c", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Riwayat obrolan pengguna dengan chatbot Telegram. Dikelompokkan per pengguna (Total <strong>{total}</strong> pesan).
          </p>
        </div>
        <HistoryClient initialConversations={conversations} initialTotal={total} />
      </div>
    </AuthedLayout>
  );
}
