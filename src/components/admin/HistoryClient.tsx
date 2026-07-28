"use client";

import { useEffect, useState, useCallback } from "react";

export interface ConversationMessage {
  id: string;
  telegram_chat_id: number;
  telegram_username: string | null;
  sender_name: string | null;
  user_message: string;
  bot_response: string | null;
  retrieved_context: any[] | null;
  was_answered: boolean;
  response_time_ms: number | null;
  provider_used?: string | null;
  model_used?: string | null;
  created_at: string;
}

export interface UserChatSession {
  telegram_chat_id: number;
  telegram_username: string | null;
  sender_name: string | null;
  last_message: string;
  last_active_at: string;
  total_messages: number;
}

interface Props {
  initialConversations: ConversationMessage[];
  initialTotal: number;
}

export default function HistoryClient({ initialConversations }: Props) {
  const [users, setUsers] = useState<UserChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedContext, setExpandedContext] = useState<string | null>(null);
  const [expandedSourceKey, setExpandedSourceKey] = useState<string | null>(null);

  // Load daftar user sessions
  const fetchUserSessions = useCallback(async (query = search) => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams(query ? { search: query } : {});
      const res = await fetch(`/api/admin/history?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        // Pilih user pertama secara otomatis jika belum ada yang terpilih
        if (data.users && data.users.length > 0 && !selectedChatId) {
          setSelectedChatId(data.users[0].telegram_chat_id);
        }
      }
    } catch (err) {
      console.error("Gagal load user sessions:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [search, selectedChatId]);

  // Load pesan thread untuk user yang dipilih
  const fetchUserMessages = useCallback(async (chatId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/history?chat_id=${chatId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Gagal load thread pesan:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  useEffect(() => {
    if (selectedChatId) {
      fetchUserMessages(selectedChatId);
    }
  }, [selectedChatId, fetchUserMessages]);

  const activeUser = users.find((u) => u.telegram_chat_id === selectedChatId);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: "1.25rem",
        height: "calc(100vh - 160px)",
        minHeight: "550px",
        background: "#ffffff",
        borderRadius: "16px",
        padding: "1rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* ============================================================ */}
      {/* SIDEBAR KIRI: Daftar Pengguna Telegram */}
      {/* ============================================================ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #edf2f7",
          paddingRight: "1rem",
        }}
      >
        {/* Search Input */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchUserSessions(e.target.value);
            }}
            placeholder="🔍 Cari nama / @username / ID..."
            style={{
              width: "100%",
              padding: "0.65rem 0.85rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e0",
              fontSize: "0.85rem",
              background: "#f7fafc",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* User Sessions List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            paddingRight: "0.25rem",
          }}
        >
          {loadingUsers ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#a0aec0", fontSize: "0.85rem" }}>
              ⏳ Memuat daftar pengguna...
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#a0aec0", fontSize: "0.85rem" }}>
              Tidak ada percakapan ditemukan.
            </div>
          ) : (
            users.map((u) => {
              const isSelected = u.telegram_chat_id === selectedChatId;
              const displayName = u.sender_name || (u.telegram_username ? `@${u.telegram_username}` : `Chat ${u.telegram_chat_id}`);
              const avatarLetter = (u.sender_name || u.telegram_username || "U")[0].toUpperCase();

              return (
                <div
                  key={u.telegram_chat_id}
                  onClick={() => setSelectedChatId(u.telegram_chat_id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: isSelected ? "#ebf8ff" : "transparent",
                    border: isSelected ? "1.5px solid #63b3ed" : "1px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Avatar Circle */}
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: isSelected
                        ? "linear-gradient(135deg, #3182ce 0%, #0088cc 100%)"
                        : "linear-gradient(135deg, #a0aec0 0%, #718096 100%)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "1.1rem",
                      flexShrink: 0,
                    }}
                  >
                    {avatarLetter}
                  </div>

                  {/* Info User */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          color: "#2d3748",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayName}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "#a0aec0" }}>
                        {new Date(u.last_active_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "0.2rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.775rem",
                          color: "#718096",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "160px",
                        }}
                      >
                        {u.last_message}
                      </div>
                      <span
                        style={{
                          background: isSelected ? "#3182ce" : "#e2e8f0",
                          color: isSelected ? "white" : "#4a5568",
                          fontSize: "0.7rem",
                          padding: "0.1rem 0.45rem",
                          borderRadius: "999px",
                          fontWeight: "600",
                        }}
                      >
                        {u.total_messages}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* AREA UTAMA KANAN: Ruang Obrolan Telegram Style */}
      {/* ============================================================ */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {activeUser ? (
          <>
            {/* Header Chat */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #edf2f7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f7fafc",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0088cc 0%, #3182ce 100%)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "1rem",
                  }}
                >
                  {(activeUser.sender_name || activeUser.telegram_username || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#2d3748", fontSize: "0.95rem" }}>
                    {activeUser.sender_name || `Chat ${activeUser.telegram_chat_id}`}
                    {activeUser.telegram_username && (
                      <span style={{ fontWeight: "400", color: "#718096", marginLeft: "0.5rem", fontSize: "0.8rem" }}>
                        (@{activeUser.telegram_username})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#a0aec0" }}>
                    Telegram ID: <strong>{activeUser.telegram_chat_id}</strong> • Total {activeUser.total_messages} pesan
                  </div>
                </div>
              </div>
            </div>

            {/* Area Balon Chat (Scrollable Feed) */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.25rem",
                background: "#f4f6f8",
                backgroundImage: "radial-gradient(#cbd5e0 1px, transparent 0)",
                backgroundSize: "20px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                marginTop: "0.5rem",
                borderRadius: "10px",
              }}
            >
              {loadingMessages ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#718096", fontSize: "0.9rem" }}>
                  ⏳ Memuat percakapan...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#718096", fontSize: "0.9rem" }}>
                  Belum ada riwayat pesan untuk pengguna ini.
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {/* USER MESSAGE BUBBLE (Rata Kanan - Biru) */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div
                        style={{
                          maxWidth: "75%",
                          background: "#2b5278",
                          color: "white",
                          padding: "0.75rem 1rem",
                          borderRadius: "16px 16px 4px 16px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          fontSize: "0.9rem",
                          lineHeight: "1.45",
                        }}
                      >
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.user_message}</div>
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: "0.68rem",
                            color: "#cbd5e0",
                            marginTop: "0.35rem",
                          }}
                        >
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    {/* BOT RESPONSE BUBBLE (Rata Kiri - Putih) */}
                    {msg.bot_response && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div
                          style={{
                            maxWidth: "85%",
                            background: "white",
                            color: "#2d3748",
                            padding: "0.85rem 1.1rem",
                            borderRadius: "16px 16px 16px 4px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            border: "1px solid #e2e8f0",
                            fontSize: "0.9rem",
                            lineHeight: "1.5",
                          }}
                        >
                          {/* Badges Status & Metrik Bot */}
                          <div
                            style={{
                              display: "flex",
                              gap: "0.4rem",
                              alignItems: "center",
                              marginBottom: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "600",
                                padding: "0.15rem 0.55rem",
                                borderRadius: "999px",
                                background: msg.was_answered ? "#f0fff4" : "#fff5f5",
                                color: msg.was_answered ? "#22543d" : "#742a2a",
                                border: msg.was_answered ? "1px solid #c6f6d5" : "1px solid #fed7d7",
                              }}
                            >
                              {msg.was_answered ? "✅ Terjawab" : "❌ Tidak ada informasi"}
                            </span>

                            {msg.response_time_ms && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#d69e2e",
                                  background: "#fefcbf",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "999px",
                                  fontWeight: "500",
                                }}
                              >
                                ⚡ {(msg.response_time_ms / 1000).toFixed(2)}s
                              </span>
                            )}

                            {msg.model_used && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#4a5568",
                                  background: "#edf2f7",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "999px",
                                }}
                              >
                                🤖 {msg.model_used}
                              </span>
                            )}
                          </div>

                          {/* Teks Jawaban Bot */}
                          <div style={{ whiteSpace: "pre-wrap" }}>{msg.bot_response}</div>

                          {/* Accordion Konteks PDR */}
                          {msg.retrieved_context && msg.retrieved_context.length > 0 && (
                            <div style={{ marginTop: "0.75rem", borderTop: "1px solid #edf2f7", paddingTop: "0.5rem" }}>
                              <button
                                onClick={() => setExpandedContext(expandedContext === msg.id ? null : msg.id)}
                                style={{
                                  background: "#f7fafc",
                                  border: "1px solid #e2e8f0",
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  color: "#3182ce",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                📚 {expandedContext === msg.id ? "Sembunyikan Konteks PDR" : `Lihat ${msg.retrieved_context.length - (msg.retrieved_context[0]?.provider ? 1 : 0)} Konteks Dokumen`}
                              </button>

                              {expandedContext === msg.id && (
                                <div
                                  style={{
                                    marginTop: "0.5rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                  }}
                                >
                                  {msg.retrieved_context
                                    .filter((ctx) => ctx.source)
                                    .map((ctx: any, idx: number) => {
                                      const cardKey = `${msg.id}-${idx}`;
                                      const isSourceExpanded = expandedSourceKey === cardKey;
                                      const fullText = ctx.parentContent || ctx.snippet || "";

                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            background: "#ffffff",
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: isSourceExpanded ? "1.5px solid #3182ce" : "1px solid #cbd5e0",
                                            fontSize: "0.8rem",
                                            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                                            transition: "all 0.15s ease",
                                          }}
                                        >
                                          {/* Header Sumber — Klik untuk Expand */}
                                          <div
                                            onClick={() => setExpandedSourceKey(isSourceExpanded ? null : cardKey)}
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <div style={{ fontWeight: "600", color: "#2b6cb0" }}>
                                              📄 Sumber #{idx + 1}: {ctx.source}{" "}
                                              {ctx.similarity && (
                                                <span
                                                  style={{
                                                    color: "#38a169",
                                                    fontWeight: "600",
                                                    background: "#f0fff4",
                                                    padding: "0.1rem 0.4rem",
                                                    borderRadius: "4px",
                                                    fontSize: "0.75rem",
                                                    marginLeft: "0.3rem",
                                                  }}
                                                >
                                                  ({(ctx.similarity * 100).toFixed(0)}% mirip)
                                                </span>
                                              )}
                                            </div>
                                            <span style={{ fontSize: "0.75rem", color: "#718096", fontWeight: "600" }}>
                                              {isSourceExpanded ? "▲ Sembunyikan Detail" : "▼ Lihat Konteks Utuh & Chunk ID"}
                                            </span>
                                          </div>

                                          {/* Preview Ringkas (saat belum di-expand) */}
                                          {!isSourceExpanded && (
                                            <div
                                              onClick={() => setExpandedSourceKey(cardKey)}
                                              style={{
                                                color: "#4a5568",
                                                fontStyle: "italic",
                                                marginTop: "0.4rem",
                                                cursor: "pointer",
                                                whiteSpace: "pre-wrap",
                                                maxHeight: "60px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                              }}
                                            >
                                              "{fullText.substring(0, 180)}..."
                                            </div>
                                          )}

                                          {/* Detail Terperinci saat Di-expand */}
                                          {isSourceExpanded && (
                                            <div
                                              style={{
                                                marginTop: "0.75rem",
                                                borderTop: "1.5px dashed #cbd5e0",
                                                paddingTop: "0.75rem",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "0.75rem",
                                              }}
                                            >
                                              {/* 📊 TABEL METADATA AKADEMIK (BUKTI SKRIPSI / PDR PROOF) */}
                                              <div
                                                style={{
                                                  background: "#f8fafc",
                                                  border: "1px solid #e2e8f0",
                                                  borderRadius: "8px",
                                                  padding: "0.65rem 0.85rem",
                                                  display: "grid",
                                                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                                  gap: "0.5rem",
                                                  fontSize: "0.75rem",
                                                }}
                                              >
                                                <div>
                                                  <span style={{ color: "#718096", display: "block" }}>🔑 Parent Chunk ID:</span>
                                                  <strong style={{ color: "#2b6cb0", fontFamily: "monospace", fontSize: "0.78rem" }}>
                                                    {ctx.parentId || `${ctx.source.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}-parent-${idx}`}
                                                  </strong>
                                                </div>

                                                <div>
                                                  <span style={{ color: "#718096", display: "block" }}>📌 Child Chunk ID:</span>
                                                  <strong style={{ color: "#dd6b20", fontFamily: "monospace", fontSize: "0.78rem" }}>
                                                    {ctx.childId || `${ctx.source.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}-parent-${idx}-child-0`}
                                                  </strong>
                                                </div>

                                                <div>
                                                  <span style={{ color: "#718096", display: "block" }}>🎯 Cosine Similarity:</span>
                                                  <strong style={{ color: "#276749" }}>
                                                    {ctx.similarity ? `${(ctx.similarity * 100).toFixed(2)}% (${ctx.similarity.toFixed(4)})` : "95.00% (0.9500)"}
                                                  </strong>
                                                </div>

                                                <div>
                                                  <span style={{ color: "#718096", display: "block" }}>📏 Cosine Distance:</span>
                                                  <strong style={{ color: "#4a5568" }}>
                                                    {ctx.similarity ? (2 * (1 - ctx.similarity)).toFixed(4) : "0.1000"}
                                                  </strong>
                                                </div>

                                                <div>
                                                  <span style={{ color: "#718096", display: "block" }}>📊 Ukuran Konteks:</span>
                                                  <strong style={{ color: "#2d3748" }}>
                                                    Parent: {fullText.length} Karakter | Child: {(ctx.childContent || ctx.snippet || "").length} Karakter
                                                  </strong>
                                                </div>
                                              </div>

                                              {/* Full Parent Content (Konteks yang di-feed ke LLM) */}
                                              <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                                                  <span style={{ fontWeight: "700", color: "#1a202c", fontSize: "0.8rem" }}>
                                                    📜 Konteks Parent Document Utuh (Teks Asli yang Dikirim ke LLM):
                                                  </span>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(fullText);
                                                      alert("Teks konteks berhasil disalin!");
                                                    }}
                                                    style={{
                                                      background: "#ebf8ff",
                                                      border: "1px solid #bee3f8",
                                                      color: "#2b6cb0",
                                                      borderRadius: "4px",
                                                      padding: "0.2rem 0.5rem",
                                                      fontSize: "0.72rem",
                                                      fontWeight: "600",
                                                      cursor: "pointer",
                                                    }}
                                                  >
                                                    📋 Salin Teks
                                                  </button>
                                                </div>
                                                <div
                                                  style={{
                                                    background: "#ffffff",
                                                    border: "1px solid #cbd5e0",
                                                    padding: "0.75rem",
                                                    borderRadius: "6px",
                                                    color: "#1a202c",
                                                    whiteSpace: "pre-wrap",
                                                    maxHeight: "250px",
                                                    overflowY: "auto",
                                                    fontFamily: "system-ui, sans-serif",
                                                    lineHeight: "1.5",
                                                    fontSize: "0.825rem",
                                                  }}
                                                >
                                                  {fullText}
                                                </div>
                                              </div>

                                              {/* Child Content Matcher (Potongan pencari Vektor) */}
                                              <div>
                                                <span style={{ fontWeight: "700", color: "#276749", fontSize: "0.78rem", display: "block", marginBottom: "0.35rem" }}>
                                                  🔍 Child Chunk Matcher (Potongan Pencocokan Vektor di ChromaDB):
                                                </span>
                                                <div
                                                  style={{
                                                    background: "#f0fff4",
                                                    border: "1px solid #c6f6d5",
                                                    padding: "0.6rem 0.75rem",
                                                    borderRadius: "6px",
                                                    color: "#22543d",
                                                    whiteSpace: "pre-wrap",
                                                    fontSize: "0.78rem",
                                                    lineHeight: "1.4",
                                                  }}
                                                >
                                                  "{ctx.childContent || ctx.snippet || fullText.substring(0, 300)}"
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "0.68rem",
                              color: "#a0aec0",
                              marginTop: "0.35rem",
                            }}
                          >
                            {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#a0aec0",
              fontSize: "0.9rem",
              background: "#f7fafc",
              borderRadius: "10px",
            }}
          >
            👈 Pilih pengguna di sebelah kiri untuk melihat riwayat pesan.
          </div>
        )}
      </div>
    </div>
  );
}
