import { getSupabaseAdmin } from "@/lib/supabase/client";
import AuthedLayout from "@/components/admin/AuthedLayout";
import Link from "next/link";

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
      .limit(6),
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
    {
      label: "Total Percakapan",
      value: stats.totalConvs.toLocaleString(),
      icon: "chat_bubble",
      badge: "+12%",
      badgeBg: "#f0fff4",
      badgeColor: "#276749",
      iconBg: "#d8e3fb",
      iconColor: "#091426",
    },
    {
      label: "Percakapan (7 Hari)",
      value: stats.convs7d.toLocaleString(),
      icon: "query_stats",
      iconBg: "#d8e2ff",
      iconColor: "#0058be",
    },
    {
      label: "Terjawab (30 Hari)",
      value: `${stats.answerRate}%`,
      icon: "check_circle",
      iconBg: "#f0fff4",
      iconColor: "#276749",
    },
    {
      label: "Dokumen Aktif",
      value: stats.totalDocs.toLocaleString(),
      icon: "description",
      iconBg: "#e0e3e5",
      iconColor: "#45474c",
    },
    {
      label: "Avg. Waktu Respons",
      value: `${(stats.avgResponseMs / 1000).toFixed(1)}s`,
      icon: "bolt",
      iconBg: "#ffdad6",
      iconColor: "#ba1a1a",
    },
  ];

  return (
    <AuthedLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Header Section */}
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "#091426", margin: 0, letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
          <p style={{ color: "#45474c", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Ringkasan performa chatbot pariwisata Palangka Raya
          </p>
        </div>

        {/* 5 Stat Cards Grid (Google Stitch) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "1.25rem",
                border: "1px solid #c5c6cd",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: card.iconBg,
                    color: card.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    {card.icon}
                  </span>
                </div>
                {card.badge && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      background: card.badgeBg,
                      color: card.badgeColor,
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                    }}
                  >
                    {card.badge}
                  </span>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#091426", margin: 0, lineHeight: 1 }}>
                  {card.value}
                </h3>
                <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#45474c", margin: "0.35rem 0 0 0" }}>
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabel Percakapan Terbaru (Google Stitch) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #c5c6cd",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #c5c6cd",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#0058be" }}>
                history
              </span>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#091426", margin: 0 }}>
                Percakapan Terbaru
              </h2>
            </div>
            <Link
              href="/admin/history"
              style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#0058be",
                textDecoration: "none",
              }}
            >
              Lihat Semua →
            </Link>
          </div>

          {stats.recentConvs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#75777d", fontSize: "0.9rem" }}>
              Belum ada percakapan terbaru.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f2f4f6", borderBottom: "1px solid #c5c6cd" }}>
                    <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#45474c", textTransform: "uppercase" }}>
                      Pengguna
                    </th>
                    <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#45474c", textTransform: "uppercase" }}>
                      Pertanyaan & Jawaban
                    </th>
                    <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: "700", color: "#45474c", textTransform: "uppercase", textAlign: "right" }}>
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentConvs.map((conv, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e0e3e5" }}>
                      <td style={{ padding: "1rem 1.5rem", verticalAlign: "top", width: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#091426",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                              person
                            </span>
                          </div>
                          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#191c1e" }}>
                            {conv.sender_name ?? "Anonim"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", verticalAlign: "top" }}>
                        <div style={{ marginBottom: "0.35rem" }}>
                          <span style={{ fontWeight: "700", color: "#0058be", fontSize: "0.8rem", marginRight: "0.35rem" }}>
                            Q:
                          </span>
                          <span style={{ fontSize: "0.875rem", color: "#191c1e", fontWeight: "500" }}>
                            {conv.user_message}
                          </span>
                        </div>
                        {conv.bot_response && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                            <span style={{ fontWeight: "700", color: conv.was_answered ? "#276749" : "#ba1a1a", fontSize: "0.8rem" }}>
                              A:
                            </span>
                            <span style={{ fontSize: "0.825rem", color: "#45474c", lineHeight: "1.4" }}>
                              {conv.bot_response.slice(0, 140)}
                              {conv.bot_response.length > 140 ? "..." : ""}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1.5rem", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#191c1e" }}>
                          {new Date(conv.created_at).toLocaleDateString("id-ID")}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#75777d" }}>
                          {new Date(conv.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthedLayout>
  );
}
