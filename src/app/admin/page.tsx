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
      icon: "forum",
      bg: "var(--dark-card-bg)",
      textColor: "var(--dark-card-text)",
      subColor: "#A1EBB4",
      iconBg: "rgba(255,255,255,0.12)",
      iconColor: "#A1EBB4",
      badge: "+12%",
      badgeBg: "#A1EBB4",
      badgeColor: "#0D381B",
    },
    {
      label: "Percakapan (7 Hari)",
      value: stats.convs7d.toLocaleString(),
      icon: "trending_up",
      bg: "var(--mint-accent)",
      textColor: "var(--mint-text)",
      subColor: "var(--mint-text)",
      iconBg: "rgba(0,0,0,0.08)",
      iconColor: "var(--mint-text)",
    },
    {
      label: "Terjawab (30 Hari)",
      value: `${stats.answerRate}%`,
      icon: "task_alt",
      bg: "var(--lavender-accent)",
      textColor: "var(--lavender-text)",
      subColor: "var(--lavender-text)",
      iconBg: "rgba(0,0,0,0.08)",
      iconColor: "var(--lavender-text)",
    },
    {
      label: "Dokumen Aktif",
      value: stats.totalDocs.toLocaleString(),
      icon: "folder_open",
      bg: "var(--bg-surface)",
      textColor: "var(--text-primary)",
      subColor: "var(--text-secondary)",
      iconBg: "var(--input-bg)",
      iconColor: "var(--text-primary)",
    },
    {
      label: "Avg. Waktu Respons",
      value: `${(stats.avgResponseMs / 1000).toFixed(1)}s`,
      icon: "bolt",
      bg: "var(--bg-surface)",
      textColor: "var(--text-primary)",
      subColor: "var(--text-secondary)",
      iconBg: "var(--input-bg)",
      iconColor: "#FFB4A2",
    },
  ];

  return (
    <AuthedLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {/* Hero Header Banner (Bundaran Palangka Raya) */}
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "220px",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            padding: "1.75rem 2rem",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Layer 1: Background Image dengan Filter Blur & Darkened Brightness */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("/images/bundaran_palangka_raya.jpeg")`,
              backgroundSize: "cover",
              backgroundPosition: "center 40%",
              filter: "blur(2px) brightness(0.80)",
              transform: "scale(1.05)",
              zIndex: 0,
            }}
          />

          {/* Layer 2: Overlay Hitam Transparan untuk Kontras & Legibilitas Teks */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.75) 100%)",
              zIndex: 1,
            }}
          />

          {/* Layer 3: Konten Utama Hero Header (Z-Index 2 agar Teks Tajam & Sangat Mudah Dibaca) */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
            {/* Top Badge Tag */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(255, 255, 255, 0.18)",
                  backdropFilter: "blur(12px)",
                  color: "#ffffff",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#A1EBB4" }}>
                  location_on
                </span>
                Palangka Raya, Kalimantan Tengah
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(161, 235, 180, 0.25)",
                  backdropFilter: "blur(12px)",
                  color: "#A1EBB4",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  border: "1px solid rgba(161, 235, 180, 0.4)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  travel_explore
                </span>
                Pariwisata Hub Live
              </span>
            </div>

            {/* Main Title & Description */}
            <div>
              <h1
                style={{
                  fontSize: "2.35rem",
                  fontWeight: "800",
                  color: "#ffffff",
                  margin: 0,
                  letterSpacing: "-0.02em",
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                Palangka Raya
              </h1>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.92)",
                  fontSize: "0.925rem",
                  marginTop: "0.35rem",
                  marginBottom: 0,
                  maxWidth: "640px",
                  lineHeight: 1.45,
                  textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                }}
              >
                Pusat Data Kecerdasan Pariwisata Kota Cantik & Layanan Chatbot Telegram Berbasis Parent Document Retrieval (PDR)
              </p>
            </div>

            {/* Quick Info Chips */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                flexWrap: "wrap",
                marginTop: "0.5rem",
              }}
            >
              {[
                { label: "Bundaran Besar", icon: "photo_camera" },
                { label: "Vector Search Active", icon: "database" },
                { label: "Telegram Bot Online", icon: "smart_toy" },
              ].map((chip, idx) => (
                <span
                  key={idx}
                  style={{
                    background: "rgba(0, 0, 0, 0.45)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255, 255, 255, 0.95)",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#B5B4FF" }}>
                    {chip.icon}
                  </span>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Stat Cards Grid (Neo-Minimalist Bento Design) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              style={{
                background: card.bg,
                color: card.textColor,
                borderRadius: "22px",
                padding: "1.35rem 1.25rem",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "135px",
                transition: "transform 0.2s ease, boxShadow 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: card.iconBg,
                    color: card.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                    {card.icon}
                  </span>
                </div>
                {card.badge && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "800",
                      background: card.badgeBg,
                      color: card.badgeColor,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                    }}
                  >
                    {card.badge}
                  </span>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: "1.85rem", fontWeight: "800", margin: "0.75rem 0 0 0", lineHeight: 1 }}>
                  {card.value}
                </h3>
                <p style={{ fontSize: "0.78rem", fontWeight: "600", color: card.subColor, margin: "0.35rem 0 0 0", opacity: 0.9 }}>
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabel Percakapan Terbaru (Neo-Minimalist Card) */}
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "22px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--text-primary)" }}>
                history
              </span>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                Percakapan Terbaru
              </h2>
            </div>
            <Link
              href="/admin/history"
              style={{
                fontSize: "0.85rem",
                fontWeight: "700",
                color: "#1E1F24",
                background: "#A1EBB4",
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              Lihat Semua →
            </Link>
          </div>

          {stats.recentConvs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Belum ada percakapan terbaru.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "0.85rem 1.5rem", fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      Pengguna
                    </th>
                    <th style={{ padding: "0.85rem 1.5rem", fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      Pertanyaan & Jawaban
                    </th>
                    <th style={{ padding: "0.85rem 1.5rem", fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "right" }}>
                      Waktu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentConvs.map((conv, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "1rem 1.5rem", verticalAlign: "top", width: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: "var(--dark-card-bg)",
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
                          <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)" }}>
                            {conv.sender_name ?? "Anonim"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1.5rem", verticalAlign: "top" }}>
                        <div style={{ marginBottom: "0.35rem" }}>
                          <span style={{ fontWeight: "800", color: "#2170e4", fontSize: "0.8rem", marginRight: "0.35rem" }}>
                            Q:
                          </span>
                          <span style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: "600" }}>
                            {conv.user_message}
                          </span>
                        </div>
                        {conv.bot_response && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                            <span style={{ fontWeight: "800", color: conv.was_answered ? "#276749" : "#ba1a1a", fontSize: "0.8rem" }}>
                              A:
                            </span>
                            <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                              {conv.bot_response.slice(0, 140)}
                              {conv.bot_response.length > 140 ? "..." : ""}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1rem 1.5rem", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-primary)" }}>
                          {new Date(conv.created_at).toLocaleDateString("id-ID")}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
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
