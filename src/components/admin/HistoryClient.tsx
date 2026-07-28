"use client";

import { useState, useCallback } from "react";

interface Conversation {
  id: string;
  telegram_chat_id: number;
  telegram_username: string | null;
  sender_name: string | null;
  user_message: string;
  bot_response: string | null;
  was_answered: boolean;
  response_time_ms: number | null;
  created_at: string;
}

interface Props {
  initialConversations: Conversation[];
  initialTotal: number;
}

const PAGE_LIMIT = 20;

export default function HistoryClient({ initialConversations, initialTotal }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const loadPage = useCallback(async (newPage: number, searchQuery = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(newPage),
        limit: String(PAGE_LIMIT),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res = await fetch(`/api/admin/history?${params}`);
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations);
        setTotal(data.total);
        setPage(newPage);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await loadPage(1, search);
  }

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pesan pengguna..."
          style={{
            flex: 1, padding: "0.65rem 1rem", border: "1.5px solid #e2e8f0",
            borderRadius: "8px", fontSize: "0.9rem"
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.65rem 1.25rem", background: "#3182ce", color: "white",
            border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer"
          }}
        >
          🔍 Cari
        </button>
      </form>

      {/* Daftar percakapan */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {conversations.length === 0 ? (
          <div style={{
            background: "white", borderRadius: "12px", padding: "3rem",
            textAlign: "center", color: "#a0aec0",
            boxShadow: "0 1px 8px rgba(0,0,0,0.08)"
          }}>
            Tidak ada percakapan ditemukan.
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              style={{
                background: "white", borderRadius: "12px",
                boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
                borderLeft: `4px solid ${conv.was_answered ? "#68d391" : "#fc8181"}`,
                overflow: "hidden"
              }}
            >
              {/* Header baris */}
              <div
                onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
                style={{
                  padding: "0.85rem 1.25rem", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#4a5568" }}>
                      👤 {conv.sender_name ?? conv.telegram_username ?? `Chat ${conv.telegram_chat_id}`}
                    </span>
                    {conv.was_answered
                      ? <span style={{ fontSize: "0.7rem", background: "#f0fff4", color: "#276749", padding: "0.15rem 0.5rem", borderRadius: "99px" }}>✅ Terjawab</span>
                      : <span style={{ fontSize: "0.7rem", background: "#fff5f5", color: "#c53030", padding: "0.15rem 0.5rem", borderRadius: "99px" }}>❌ Tidak terjawab</span>
                    }
                    {conv.response_time_ms && (
                      <span style={{ fontSize: "0.7rem", color: "#a0aec0" }}>
                        ⚡ {(conv.response_time_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#2d3748",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    💬 {conv.user_message}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, marginLeft: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#a0aec0", whiteSpace: "nowrap" }}>
                    {new Date(conv.created_at).toLocaleString("id-ID")}
                  </span>
                  <span style={{ color: "#a0aec0", fontSize: "0.85rem" }}>
                    {expanded === conv.id ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Detail percakapan (expand) */}
              {expanded === conv.id && (
                <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid #f0f4f8" }}>
                  <div style={{ marginTop: "0.75rem" }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "#4a5568", marginBottom: "0.3rem" }}>
                      Pertanyaan Pengguna:
                    </p>
                    <div style={{
                      background: "#ebf8ff", padding: "0.75rem", borderRadius: "8px",
                      fontSize: "0.875rem", color: "#2b6cb0"
                    }}>
                      {conv.user_message}
                    </div>
                  </div>
                  {conv.bot_response && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "#4a5568", marginBottom: "0.3rem" }}>
                        Jawaban Bot:
                      </p>
                      <div style={{
                        background: "#f0fff4", padding: "0.75rem", borderRadius: "8px",
                        fontSize: "0.875rem", color: "#276749", whiteSpace: "pre-wrap"
                      }}>
                        {conv.bot_response}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: "0.5rem", marginTop: "1.5rem"
        }}>
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1 || loading}
            style={{
              padding: "0.5rem 1rem", border: "1.5px solid #e2e8f0",
              borderRadius: "8px", background: "white", cursor: page <= 1 ? "not-allowed" : "pointer",
              color: page <= 1 ? "#a0aec0" : "#2d3748"
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: "0.875rem", color: "#4a5568" }}>
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages || loading}
            style={{
              padding: "0.5rem 1rem", border: "1.5px solid #e2e8f0",
              borderRadius: "8px", background: "white",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              color: page >= totalPages ? "#a0aec0" : "#2d3748"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
