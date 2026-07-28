import { getSupabaseAdmin } from "@/lib/supabase/client";
import AuthedLayout from "@/components/admin/AuthedLayout";

// Tipe eksplisit untuk menghindari masalah inferensi Supabase generik
interface RecentConv {
  user_message: string;
  bot_response: string | null;
  was_answered: boolean;
  created_at: string;
  sender_name: string | null;
}

interface AvgResponseRow {
  response_time_ms: number | null;
}

async function getDashboardStats() {
  const supabase = getSupabaseAdmin();

  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Jalankan semua query secara paralel
  const [
    totalConvsRes,
    convs7dRes,
    answeredConvsRes,
    totalDocsRes,
    recentConvsRes,
    avgResponseRes,
    total30dRes,
  ] = await Promise.all([
    supabase.from("conversation_history").select("*", { count: "exact", head: true }),
    supabase.from("conversation_history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", last7d),
    supabase.from("conversation_history")
      .select("*", { count: "exact", head: true })
      .eq("was_answered", true)
      .gte("created_at", last30d),
    supabase.from("document_sources")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase.from("conversation_history")
      .select("user_message, bot_response, was_answered, created_at, sender_name")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("conversation_history")
      .select("response_time_ms")
      .gte("created_at", last7d)
      .not("response_time_ms", "is", null),
    supabase.from("conversation_history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", last30d),
  ]);

  const total30d = total30dRes.count ?? 0;
  const answeredConvs = answeredConvsRes.count ?? 0;
  const answerRate = total30d > 0 ? Math.round((answeredConvs / total30d) * 100) : 0;

  const avgData = (avgResponseRes.data ?? []) as AvgResponseRow[];
  const avgMs = avgData.length > 0
    ? Math.round(avgData.reduce((s, r) => s + (r.response_time_ms ?? 0), 0) / avgData.length)
    : 0;

  return {
    totalConvs: totalConvsRes.count ?? 0,
    convs7d: convs7dRes.count ?? 0,
    answerRate,
    totalDocs: totalDocsRes.count ?? 0,
    avgResponseMs: avgMs,
    recentConvs: (recentConvsRes.data ?? []) as RecentConv[],
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Total Percakapan",          value: stats.totalConvs.toLocaleString(),        icon: "💬", color: "#3182ce" },
    { label: "Percakapan (7 hari)",        value: stats.convs7d.toLocaleString(),           icon: "📈", color: "#38a169" },
    { label: "Terjawab (30 hari)",         value: `${stats.answerRate}%`,                   icon: "✅", color: "#d69e2e" },
    { label: "Dokumen Aktif",              value: stats.totalDocs.toLocaleString(),         icon: "📄", color: "#805ad5" },
    { label: "Avg. Waktu Respons",         value: `${(stats.avgResponseMs / 1000).toFixed(1)}s`, icon: "⚡", color: "#e53e3e" },
  ];

  return (
    <AuthedLayout>
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1a202c", marginBottom: "0.5rem" }}>
        Dashboard
      </h1>
      <p style={{ color: "#718096", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Ringkasan performa chatbot pariwisata Palangka Raya
      </p>

      {/* Kartu Statistik */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1rem",
        marginBottom: "2.5rem",
      }}>
        {cards.map((card) => (
          <div key={card.label} style={{
            background: "white", borderRadius: "12px", padding: "1.25rem",
            boxShadow: "0 1px 8px rgba(0,0,0,0.08)", borderTop: `3px solid ${card.color}`,
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{card.icon}</div>
            <div style={{ fontSize: "1.75rem", fontWeight: "700", color: card.color }}>{card.value}</div>
            <div style={{ fontSize: "0.8rem", color: "#718096", marginTop: "0.25rem" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Percakapan Terbaru */}
      <div style={{
        background: "white", borderRadius: "12px", padding: "1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", color: "#2d3748" }}>
          💬 Percakapan Terbaru
        </h2>

        {stats.recentConvs.length === 0 ? (
          <p style={{ color: "#a0aec0", textAlign: "center", padding: "2rem 0" }}>
            Belum ada percakapan.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {stats.recentConvs.map((conv, i) => (
              <div key={i} style={{
                borderLeft: `3px solid ${conv.was_answered ? "#68d391" : "#fc8181"}`,
                paddingLeft: "1rem",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#4a5568" }}>
                    👤 {conv.sender_name ?? "Anonim"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#a0aec0" }}>
                    {new Date(conv.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <div style={{ fontSize: "0.875rem", color: "#2d3748", marginTop: "0.25rem" }}>
                  <strong>Q:</strong> {conv.user_message}
                </div>
                {conv.bot_response && (
                  <div style={{
                    fontSize: "0.85rem", color: "#718096", marginTop: "0.15rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <strong>A:</strong> {conv.bot_response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </AuthedLayout>
  );
}
