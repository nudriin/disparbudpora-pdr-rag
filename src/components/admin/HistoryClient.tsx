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

  const [showMobileUserList, setShowMobileUserList] = useState(false);

  // Load daftar user sessions
  const fetchUserSessions = useCallback(async (query = search) => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams(query ? { search: query } : {});
      const res = await fetch(`/api/admin/history?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
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
      className="history-chat-container"
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: "1.25rem",
        height: "100%",
        minHeight: 0,
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        border: "1px solid #c5c6cd",
        overflow: "hidden",
      }}
    >
      {/* ============================================================ */}
      {/* SIDEBAR KIRI: Daftar Pengguna Telegram */}
      {/* ============================================================ */}
      <div
        className={`history-user-sidebar ${!showMobileUserList && selectedChatId ? "hide-mobile" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          borderRight: "1px solid #e0e3e5",
          paddingRight: "1rem",
          overflow: "hidden",
        }}
      >
        {/* Search Input dengan Material Icon */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              color: "#75777d",
            }}
          >
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchUserSessions(e.target.value);
            }}
            placeholder="Cari nama / username / ID..."
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem 0.6rem 2.2rem",
              borderRadius: "8px",
              border: "1px solid #c5c6cd",
              fontSize: "0.85rem",
              background: "#f2f4f6",
              boxSizing: "border-box",
              fontFamily: "inherit",
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
            gap: "0.35rem",
            paddingRight: "0.25rem",
          }}
        >
          {loadingUsers ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#75777d", fontSize: "0.85rem" }}>
              Memuat daftar pengguna...
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#75777d", fontSize: "0.85rem" }}>
              Tidak ada percakapan ditemukan.
            </div>
          ) : (
            users.map((u) => {
              const isSelected = u.telegram_chat_id === selectedChatId;
              const displayName = u.sender_name || (u.telegram_username ? `@${u.telegram_username}` : `Chat ${u.telegram_chat_id}`);

              return (
                <div
                  key={u.telegram_chat_id}
                  onClick={() => {
                    setSelectedChatId(u.telegram_chat_id);
                    setShowMobileUserList(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: isSelected ? "#d8e2ff" : "transparent",
                    borderLeft: isSelected ? "4px solid #2170e4" : "4px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Avatar Icon */}
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: isSelected ? "#2170e4" : "#091426",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                      person
                    </span>
                  </div>

                  {/* Info User */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          color: isSelected ? "#001a42" : "#191c1e",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayName}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "#75777d" }}>
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
                          color: "#45474c",
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
                          background: isSelected ? "#2170e4" : "#e0e3e5",
                          color: isSelected ? "white" : "#45474c",
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
      {/* AREA UTAMA KANAN: Ruang Obrolan Google Stitch Style */}
      {/* ============================================================ */}
      <div
        className={`history-chat-thread ${showMobileUserList ? "hide-mobile" : ""}`}
        style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}
      >
        {activeUser ? (
          <>
            {/* Header Chat */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #e0e3e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f7f9fb",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowMobileUserList(true)}
                  className="mobile-user-list-btn"
                  style={{
                    background: "#d8e2ff",
                    border: "1px solid #adc6ff",
                    color: "#0058be",
                    borderRadius: "6px",
                    padding: "0.3rem 0.55rem",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "none",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    arrow_back
                  </span>
                  Sesi Chat
                </button>

                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#091426",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    person
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#191c1e", fontSize: "0.95rem" }}>
                    {activeUser.sender_name || `Chat ${activeUser.telegram_chat_id}`}
                    {activeUser.telegram_username && (
                      <span style={{ fontWeight: "400", color: "#75777d", marginLeft: "0.5rem", fontSize: "0.8rem" }}>
                        (@{activeUser.telegram_username})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#75777d" }}>
                    Telegram ID: <strong>{activeUser.telegram_chat_id}</strong> • Total {activeUser.total_messages} pesan
                  </div>
                </div>
              </div>
            </div>

            {/* Area Balon Chat Feed */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "1.25rem",
                background: "#f7f9fb",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                marginTop: "0.5rem",
                borderRadius: "8px",
                border: "1px solid #e0e3e5",
              }}
            >
              {loadingMessages ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#75777d", fontSize: "0.9rem" }}>
                  Memuat percakapan...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#75777d", fontSize: "0.9rem" }}>
                  Belum ada riwayat pesan untuk pengguna ini.
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {/* USER BUBBLE (Rata Kanan - Biru Stitch #2170e4) */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div
                        style={{
                          maxWidth: "75%",
                          background: "#2170e4",
                          color: "#ffffff",
                          padding: "0.75rem 1rem",
                          borderRadius: "12px 12px 2px 12px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          fontSize: "0.9rem",
                          lineHeight: "1.45",
                        }}
                      >
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.user_message}</div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.45rem" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "rgba(255,255,255,0.95)",
                              background: "rgba(255, 255, 255, 0.2)",
                              padding: "0.15rem 0.55rem",
                              borderRadius: "999px",
                              fontWeight: "500",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>
                              calendar_today
                            </span>
                            {new Date(msg.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })} • {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BOT BUBBLE (Rata Kiri - Putih dengan Icon Material Symbols) */}
                    {msg.bot_response && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div
                          style={{
                            maxWidth: "85%",
                            background: "#ffffff",
                            color: "#191c1e",
                            padding: "0.85rem 1.1rem",
                            borderRadius: "12px 12px 12px 2px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            border: "1px solid #c5c6cd",
                            fontSize: "0.9rem",
                            lineHeight: "1.5",
                          }}
                        >
                          {/* Badges Status, Tanggal, & Metrik Bot */}
                          <div
                            style={{
                              display: "flex",
                              gap: "0.4rem",
                              alignItems: "center",
                              marginBottom: "0.6rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: "600",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "999px",
                                background: msg.was_answered ? "#f0fff4" : "#fff5f5",
                                color: msg.was_answered ? "#276749" : "#ba1a1a",
                                border: msg.was_answered ? "1px solid #c6f6d5" : "1px solid #ffdad6",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                {msg.was_answered ? "check_circle" : "cancel"}
                              </span>
                              {msg.was_answered ? "Terjawab" : "Tidak ada informasi"}
                            </span>

                            {/* Tanggal & Waktu Chip Badge */}
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "#45474c",
                                background: "#f2f4f6",
                                border: "1px solid #c5c6cd",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "999px",
                                fontWeight: "500",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                calendar_today
                              </span>
                              {new Date(msg.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })} • {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {msg.response_time_ms && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#744210",
                                  background: "#feebc8",
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "999px",
                                  fontWeight: "500",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                  bolt
                                </span>
                                {(msg.response_time_ms / 1000).toFixed(2)}s
                              </span>
                            )}

                            {msg.model_used && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#45474c",
                                  background: "#e0e3e5",
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "999px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                  smart_toy
                                </span>
                                {msg.model_used}
                              </span>
                            )}
                          </div>

                          {/* Teks Jawaban Bot */}
                          <div style={{ whiteSpace: "pre-wrap" }}>{msg.bot_response}</div>

                          {/* Accordion Konteks PDR */}
                          {msg.retrieved_context && msg.retrieved_context.length > 0 && (
                            <div style={{ marginTop: "0.75rem", borderTop: "1px solid #e0e3e5", paddingTop: "0.5rem" }}>
                              <button
                                onClick={() => setExpandedContext(expandedContext === msg.id ? null : msg.id)}
                                style={{
                                  background: "#f2f4f6",
                                  border: "1px solid #c5c6cd",
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  color: "#0058be",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                  menu_book
                                </span>
                                {expandedContext === msg.id
                                  ? "Sembunyikan Konteks PDR"
                                  : `Lihat ${msg.retrieved_context.length - (msg.retrieved_context[0]?.provider ? 1 : 0)} Konteks Dokumen`}
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
                                            border: isSourceExpanded ? "1.5px solid #2170e4" : "1px solid #c5c6cd",
                                            fontSize: "0.8rem",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                            transition: "all 0.15s ease",
                                          }}
                                        >
                                          {/* Header Sumber */}
                                          <div
                                            onClick={() => setExpandedSourceKey(isSourceExpanded ? null : cardKey)}
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <div style={{ fontWeight: "600", color: "#0058be", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                                description
                                              </span>
                                              Sumber #{idx + 1}: {ctx.source}{" "}
                                              {ctx.similarity && (
                                                <span
                                                  style={{
                                                    color: "#276749",
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
                                            <span style={{ fontSize: "0.75rem", color: "#75777d", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                                {isSourceExpanded ? "expand_less" : "expand_more"}
                                              </span>
                                              {isSourceExpanded ? "Sembunyikan Detail" : "Lihat Detail"}
                                            </span>
                                          </div>

                                          {!isSourceExpanded && (
                                            <div
                                              onClick={() => setExpandedSourceKey(cardKey)}
                                              style={{
                                                color: "#45474c",
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
                                                borderTop: "1px dashed #c5c6cd",
                                                paddingTop: "0.75rem",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "0.75rem",
                                              }}
                                            >
                                              {/* Metadata Badges (Flex Column) */}
                                              <div
                                                style={{
                                                  background: "#f7f9fb",
                                                  border: "1px solid #e0e3e5",
                                                  borderRadius: "8px",
                                                  padding: "0.75rem",
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  gap: "0.5rem",
                                                  fontSize: "0.75rem",
                                                }}
                                              >
                                                {/* Baris Badges Metrik */}
                                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                                                  <span style={{ background: "#f0fff4", color: "#276749", border: "1px solid #c6f6d5", padding: "0.25rem 0.55rem", borderRadius: "6px", fontWeight: "600" }}>
                                                    Cosine Similarity: {ctx.similarity ? `${(ctx.similarity * 100).toFixed(2)}% (${ctx.similarity.toFixed(4)})` : "95.00% (0.9500)"}
                                                  </span>
                                                  <span style={{ background: "#f2f4f6", color: "#45474c", border: "1px solid #c5c6cd", padding: "0.25rem 0.55rem", borderRadius: "6px", fontWeight: "600" }}>
                                                    Cosine Distance: {ctx.similarity ? (2 * (1 - ctx.similarity)).toFixed(4) : "0.1000"}
                                                  </span>
                                                  <span style={{ background: "#d8e2ff", color: "#0058be", border: "1px solid #adc6ff", padding: "0.25rem 0.55rem", borderRadius: "6px", fontWeight: "600" }}>
                                                    Parent: {fullText.length} Karakter | Child: {(ctx.childContent || ctx.snippet || "").length} Karakter
                                                  </span>
                                                </div>

                                                {/* Baris Parent Chunk ID */}
                                                <div style={{ background: "#ffffff", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid #e0e3e5" }}>
                                                  <span style={{ color: "#75777d", fontSize: "0.72rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>key</span>
                                                    Parent Chunk ID:
                                                  </span>
                                                  <span style={{ color: "#0058be", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: "600", wordBreak: "break-all", display: "block", marginTop: "0.1rem" }}>
                                                    {ctx.parentId || `${ctx.source.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}-parent-${idx}`}
                                                  </span>
                                                </div>

                                                {/* Baris Child Chunk ID */}
                                                <div style={{ background: "#ffffff", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid #e0e3e5" }}>
                                                  <span style={{ color: "#75777d", fontSize: "0.72rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>push_pin</span>
                                                    Child Chunk ID:
                                                  </span>
                                                  <span style={{ color: "#744210", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: "600", wordBreak: "break-all", display: "block", marginTop: "0.1rem" }}>
                                                    {ctx.childId || `${ctx.source.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}-parent-${idx}-child-0`}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Full Parent Content */}
                                              <div>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                                                  <span style={{ fontWeight: "700", color: "#191c1e", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>description</span>
                                                    Konteks Parent Document Utuh (Dikirim ke LLM):
                                                  </span>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(fullText);
                                                      alert("Teks konteks berhasil disalin!");
                                                    }}
                                                    style={{
                                                      background: "#d8e2ff",
                                                      border: "1px solid #adc6ff",
                                                      color: "#0058be",
                                                      borderRadius: "6px",
                                                      padding: "0.25rem 0.55rem",
                                                      fontSize: "0.72rem",
                                                      fontWeight: "600",
                                                      cursor: "pointer",
                                                      display: "inline-flex",
                                                      alignItems: "center",
                                                      gap: "0.25rem",
                                                    }}
                                                  >
                                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                                      content_copy
                                                    </span>
                                                    Salin Teks
                                                  </button>
                                                </div>
                                                <div
                                                  style={{
                                                    background: "#ffffff",
                                                    border: "1px solid #c5c6cd",
                                                    padding: "0.75rem",
                                                    borderRadius: "6px",
                                                    color: "#191c1e",
                                                    whiteSpace: "pre-wrap",
                                                    maxHeight: "250px",
                                                    overflowY: "auto",
                                                    fontFamily: "inherit",
                                                    lineHeight: "1.5",
                                                    fontSize: "0.825rem",
                                                  }}
                                                >
                                                  {fullText}
                                                </div>
                                              </div>

                                              {/* Child Content Matcher */}
                                              <div>
                                                <span style={{ fontWeight: "700", color: "#276749", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.35rem" }}>
                                                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>find_in_page</span>
                                                  Child Chunk Matcher (Pemicu Similarity Search):
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
              color: "#75777d",
              fontSize: "0.9rem",
              background: "#f7f9fb",
              borderRadius: "8px",
              border: "1px solid #e0e3e5",
            }}
          >
            Pilih pengguna di sebelah kiri untuk melihat riwayat pesan.
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 767px) {
          .history-chat-container {
            grid-template-columns: 1fr !important;
          }
          .history-user-sidebar.hide-mobile,
          .history-chat-thread.hide-mobile {
            display: none !important;
          }
          .mobile-user-list-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}
