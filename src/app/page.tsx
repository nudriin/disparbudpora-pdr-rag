"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/admin/ThemeContext";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  // Interactive Live Chat Sandbox State
  const [query, setQuery] = useState("Apa saja destinasi wisata alam utama di Palangka Raya?");
  const [loading, setLoading] = useState(false);
  const [chatResult, setChatResult] = useState<null | {
    answer: string;
    wasAnswered: boolean;
    elapsedMs: number;
    contextCount: number;
  }>(null);

  async function handleSendTest() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setChatResult(null);

    try {
      const res = await fetch("/api/admin/test-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mendapatkan respon");
      setChatResult(data);
    } catch (err) {
      setChatResult({
        answer: `Maaf, terjadi kendala saat memproses jawaban: ${(err as Error).message}`,
        wasAnswered: false,
        elapsedMs: 0,
        contextCount: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const suggestionChips = [
    "Wisata Alam Utama",
    "Alamat Disparbudpora",
    "Kuliner Khas",
    "Taman Sebangau",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-page)",
        backgroundImage: "radial-gradient(var(--border-color) 1.2px, transparent 1.2px)",
        backgroundSize: "24px 24px",
        fontFamily: "inherit",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* ============================================================ */}
      {/* 1. TOP NAVBAR */}
      {/* ============================================================ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg-header)",
          borderBottom: "1px solid var(--border-color)",
          backdropFilter: "blur(12px)",
          padding: "0.85rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Brand Badge & Live Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                // background: "#1E1F24",
                color: "#A1EBB4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                travel_explore
              </span>
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                Disparbudpora AI
              </div>
              {/* <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                Palangka Raya Intelligence
              </div> */}
            </div>
          </div>

          {/* <span
            style={{
              fontSize: "0.7rem",
              fontWeight: "800",
              color: "#0D381B",
              background: "#A1EBB4",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
            className="desktop-only"
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0D381B" }} />
            PDR RAG Active
          </span> */}
        </div>

        {/* Center: Navigation Links */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.75rem",
            fontSize: "0.85rem",
            fontWeight: "700",
            color: "var(--text-secondary)",
          }}
          className="desktop-nav"
        >
          <a href="#hero" style={{ textDecoration: "none", color: "inherit" }}>
            Beranda
          </a>
          <a href="#architecture" style={{ textDecoration: "none", color: "inherit" }}>
            Arsitektur PDR
          </a>
          <a href="#destinations" style={{ textDecoration: "none", color: "inherit" }}>
            Destinasi
          </a>
          <a href="#evaluation" style={{ textDecoration: "none", color: "inherit" }}>
            Ragas Evaluasi
          </a>
        </nav>

        {/* Right: Theme Switcher & Admin Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={toggleTheme}
            title={`Beralih ke mode ${theme === "light" ? "gelap" : "terang"}`}
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              padding: "0.45rem 0.75rem",
              borderRadius: "999px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              fontWeight: "700",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: theme === "light" ? "#FF9800" : "#B5B4FF" }}>
              {theme === "light" ? "light_mode" : "dark_mode"}
            </span>
            <span className="theme-text-label">{theme === "light" ? "Terang" : "Gelap"}</span>
          </button>

          <Link
            href="/admin"
            style={{
              background: "var(--dark-card-bg)",
              color: "white",
              textDecoration: "none",
              padding: "0.5rem 1.1rem",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: "800",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#A1EBB4" }}>
              dashboard
            </span>
            Admin Panel
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2.5rem 1.5rem", maxWidth: "1240px", margin: "0 auto", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "3rem" }}>

        {/* ============================================================ */}
        {/* 2. SPLIT HERO SECTION WITH DASHED LINE & ASTERISK ACCENTS */}
        {/* ============================================================ */}
        <section
          id="hero"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem",
            alignItems: "center",
            paddingTop: "1rem",
          }}
        >
          {/* Left Column: Asymmetric Hero Text */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#2E6B45" }}>
                asterisk
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "var(--input-bg)",
                  border: "1.5px dashed var(--border-color)",
                  color: "var(--text-primary)",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#A1EBB4" }}>
                  location_on
                </span>
                Pariwisata Kota Cantik Palangka Raya
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)",
                fontWeight: "800",
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              Eksplorasi Pariwisata & Informasi Daerah Berbasis AI PDR
            </h1>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Layanan Chatbot Telegram Disparbudpora berbasis Parent Document Retrieval (PDR) yang menyajikan rekomendasi wisata alam, kebudayaan, event daerah, dan informasi dinas secara akurat dari basis pengetahuan resmi.
            </p>

            {/* Quick Metrics Bar */}
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", margin: "0.25rem 0" }}>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)" }}>&lt; 1.5s</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>Waktu Respons</div>
              </div>
              <div style={{ borderLeft: "1.5px dashed var(--border-color)", paddingLeft: "1.25rem" }}>
                <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)" }}>PDR RAG</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>Parent-Child Chunking</div>
              </div>
              <div style={{ borderLeft: "1.5px dashed var(--border-color)", paddingLeft: "1.25rem" }}>
                <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)" }}>Telegram</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>24/7 Akses Publik</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#A1EBB4",
                  color: "#0D381B",
                  textDecoration: "none",
                  padding: "0.8rem 1.6rem",
                  borderRadius: "999px",
                  fontSize: "0.9rem",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  boxShadow: "0 4px 15px rgba(161, 235, 180, 0.3)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  send
                </span>
                Chat via Telegram
              </a>

              <Link
                href="/admin"
                style={{
                  background: "var(--dark-card-bg)",
                  color: "white",
                  textDecoration: "none",
                  padding: "0.8rem 1.6rem",
                  borderRadius: "999px",
                  fontSize: "0.9rem",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#A1EBB4" }}>
                  dashboard
                </span>
                Admin Dashboard
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive AI Sandbox Live Showcase Card with Dashed Corner Circle Accent */}
          <div
            style={{
              position: "relative",
              background: "var(--bg-surface)",
              borderRadius: "24px",
              padding: "1.6rem",
              border: "1px solid var(--border-color)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              overflow: "hidden",
            }}
          >
            {/* Dashed Corner Circle Accent */}
            <div
              style={{
                position: "absolute",
                top: "-22px",
                right: "-22px",
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                border: "1.5px dashed var(--border-color)",
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#A1EBB4" }}>
                  science
                </span>
                <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  Simulasi PDR RAG Engine
                </span>
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: "700", background: "var(--input-bg)", padding: "0.2rem 0.55rem", borderRadius: "999px", color: "var(--text-secondary)", border: "1px dashed var(--border-color)" }}>
                Live Demo
              </span>
            </div>

            {/* Chips Preset */}
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const q = idx === 0 ? "Apa saja destinasi wisata alam utama di Palangka Raya?"
                      : idx === 1 ? "Dimana alamat kantor Disparbudpora Kota Palangka Raya?"
                        : idx === 2 ? "Apa makanan khas dan kuliner lokal Palangka Raya?"
                          : "Bagaimana cara berkunjung ke Taman Nasional Sebangau?";
                    setQuery(q);
                  }}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "999px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    lightbulb
                  </span>
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik pertanyaan wisata..."
                style={{
                  flex: 1,
                  padding: "0.65rem 0.85rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendTest()}
              />
              <button
                onClick={handleSendTest}
                disabled={loading || !query.trim()}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: "12px",
                  background: loading ? "var(--text-secondary)" : "#A1EBB4",
                  color: "#0D381B",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "..." : "Kirim"}
              </button>
            </div>

            {/* AI Output Preview Container */}
            {chatResult ? (
              <div style={{ background: "var(--input-bg)", borderRadius: "14px", padding: "1rem", border: "1px solid var(--border-color)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: "700" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span>
                    {(chatResult.elapsedMs / 1000).toFixed(2)}s
                  </span>
                  <span>{chatResult.contextCount} Konteks Parent PDR</span>
                </div>
                <div style={{ color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {chatResult.answer}
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--input-bg)", borderRadius: "14px", padding: "1.25rem", border: "1px dashed var(--border-color)", fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center" }}>
                Klik <strong>Kirim</strong> di atas untuk menguji respon sistem RAG secara langsung.
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* DASHED ACCENT DIVIDER WITH ASTERISK ICON */}
        {/* ============================================================ */}
        <div style={{ position: "relative", width: "100%", margin: "0.5rem 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", borderTop: "1.5px dashed var(--border-color)" }} />
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 2,
              background: "var(--bg-page)",
              padding: "0 0.75rem",
              color: "#2E6B45",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#2E6B45" }}>
              asterisk
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. BENTO GRID MATRIX (CORE CAPABILITIES) WITH DASHED ACCENTS */}
        {/* ============================================================ */}
        <section id="architecture">
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#2E6B45" }}>
                asterisk
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)", background: "var(--input-bg)", padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px dashed var(--border-color)" }}>
                Arsitektur Sistem
              </span>
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.4rem", marginBottom: 0 }}>
              Keunggulan Parent Document Retrieval (PDR)
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {/* Bento 1: Mint Card Large */}
            <div
              style={{
                position: "relative",
                background: "var(--mint-accent)",
                color: "var(--mint-text)",
                borderRadius: "22px",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid rgba(13, 56, 27, 0.15)",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", bottom: "-20px", right: "-20px", width: "70px", height: "70px", borderRadius: "50%", border: "1.5px dashed rgba(13, 56, 27, 0.3)" }} />
              <div>
                <span className="material-symbols-outlined" style={{ fontSize: "36px", marginBottom: "0.75rem" }}>
                  account_tree
                </span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800", margin: "0 0 0.5rem 0" }}>
                  Parent-Child Chunking Strategy
                </h3>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.55, margin: 0, opacity: 0.9 }}>
                  Dokumen dipotong menjadi Child Chunk (200 karakter) untuk pencarian presisi di database vektor, lalu sistem mengembalikan Parent Chunk (1000 karakter) ke LLM agar narasi dan detail tidak terpotong.
                </p>
              </div>
              <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", fontWeight: "800", background: "rgba(13,56,27,0.12)", padding: "0.35rem 0.75rem", borderRadius: "999px", width: "fit-content", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>bolt</span>
                Menjaga Konteks Dokumen Utuh
              </div>
            </div>

            {/* Bento 2: Dark Charcoal Card */}
            <div
              style={{
                position: "relative",
                background: "var(--dark-card-bg)",
                color: "var(--dark-card-text)",
                borderRadius: "22px",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "70px", height: "70px", borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.2)" }} />
              <div>
                <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#A1EBB4", marginBottom: "0.75rem" }}>
                  smart_toy
                </span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800", margin: "0 0 0.5rem 0" }}>
                  Telegram Bot Instant Access
                </h3>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.55, margin: 0, opacity: 0.85 }}>
                  Terintegrasi langsung dengan Telegram Bot API. Masyarakat dan wisatawan dapat berinteraksi 24/7 tanpa registrasi atau unduhan aplikasi tambahan.
                </p>
              </div>
              <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", fontWeight: "800", background: "rgba(255,255,255,0.1)", padding: "0.35rem 0.75rem", borderRadius: "999px", width: "fit-content", color: "#A1EBB4", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>smart_toy</span>
                Respon Cepat & Mudah
              </div>
            </div>

            {/* Bento 3: Lavender Card */}
            <div
              style={{
                position: "relative",
                background: "var(--lavender-accent)",
                color: "var(--lavender-text)",
                borderRadius: "22px",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid rgba(28, 26, 94, 0.15)",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", bottom: "-20px", left: "-20px", width: "70px", height: "70px", borderRadius: "50%", border: "1.5px dashed rgba(28, 26, 94, 0.3)" }} />
              <div>
                <span className="material-symbols-outlined" style={{ fontSize: "36px", marginBottom: "0.75rem" }}>
                  database
                </span>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800", margin: "0 0 0.5rem 0" }}>
                  ChromaDB Vector Store
                </h3>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.55, margin: 0, opacity: 0.9 }}>
                  Pencarian kueri berbasis vektor numerik multidimensi untuk pencocokan makna semantik terkalibrasi tinggi.
                </p>
              </div>
              <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", fontWeight: "800", background: "rgba(28,26,94,0.12)", padding: "0.35rem 0.75rem", borderRadius: "999px", width: "fit-content", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>search</span>
                Multilingual Embedding
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* DASHED ACCENT DIVIDER WITH ASTERISK ICON */}
        {/* ============================================================ */}
        <div style={{ position: "relative", width: "100%", margin: "0.5rem 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", borderTop: "1.5px dashed var(--border-color)" }} />
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 2,
              background: "var(--bg-page)",
              padding: "0 0.75rem",
              color: "#2E6B45",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#2E6B45" }}>
              asterisk
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. DESTINASI PARIWISATA KOTA CANTIK SHOWCASE */}
        {/* ============================================================ */}
        <section id="destinations">
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#2E6B45" }}>
                asterisk
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)", background: "var(--input-bg)", padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px dashed var(--border-color)" }}>
                Basis Pengetahuan Dokumen
              </span>
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.4rem", marginBottom: 0 }}>
              Destinasi Unggulan Terintegrasi Sistem
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {[
              { title: "Taman Nasional Sebangau", icon: "forest", desc: "Hutan rawa gambut & habitat Orangutan Kalimantan." },
              { title: "Kereng Bangkirai", icon: "directions_boat", desc: "Dermaga susur sungai air hitam & kapal hias." },
              { title: "Bukit Tangkiling", icon: "landscape", desc: "Wisata alam batu purba & pemandangan kota." },
              { title: "Museum Balanga", icon: "museum", desc: "Pusat sejarah & warisan budaya Dayak Kalteng." },
              { title: "Rumah Betang", icon: "holiday_village", desc: "Rumah adat tradisional simbol keharmonisan." },
              { title: "Bundaran Besar", icon: "photo_camera", desc: "Ikon tugu jantung titik nol Kota Palangka Raya." },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "20px",
                  padding: "1.25rem",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border-color)",
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                    {item.icon}
                  </span>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 0.25rem 0" }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. RAGAS SCIENTIFIC BENCHMARKING SECTION */}
        {/* ============================================================ */}
        <section
          id="evaluation"
          style={{
            position: "relative",
            background: "var(--bg-surface)",
            borderRadius: "24px",
            padding: "2rem",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: "-24px", right: "-24px", width: "80px", height: "80px", borderRadius: "50%", border: "1.5px dashed var(--border-color)" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)", background: "var(--input-bg)", padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px dashed var(--border-color)" }}>
                Evaluasi & Audit Performa
              </span>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.4rem", margin: 0 }}>
                Pengujian Kualitas Kuantitatif Ragas
              </h2>
            </div>
            <Link
              href="/admin/history"
              style={{
                fontSize: "0.8rem",
                fontWeight: "800",
                color: "#0D381B",
                background: "#A1EBB4",
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                download
              </span>
              Export Dataset Ragas
            </Link>
          </div>

          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            Seluruh respon AI dievaluasi menggunakan framework Ragas (Retrieval-Augmented Generation Assessment) untuk memastikan kualitas respon memenuhi 4 standar utama:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {[
              { metric: "Faithfulness", score: "95%+", desc: "Bebas dari halusinasi teks" },
              { metric: "Answer Relevance", score: "92%+", desc: "Relevan dengan intent user" },
              { metric: "Context Precision", score: "90%+", desc: "Presisi potongan dokumen PDR" },
              { metric: "Context Recall", score: "94%+", desc: "Kelengkapan konteks referensi" },
            ].map((m, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--input-bg)",
                  borderRadius: "16px",
                  padding: "1rem",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--text-secondary)" }}>
                  {m.metric}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", margin: "0.2rem 0" }}>
                  {m.score}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. TEXTURED GREEN GRAIN CTA BANNER (MATCHING REFERENCE IMAGE) */}
        {/* ============================================================ */}
        <section
          style={{
            position: "relative",
            background: "#1E422B",
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
            color: "#FFFFFF",
            borderRadius: "24px",
            padding: "3rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "1.25rem",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Dashed Corner Accents */}
          <div style={{ position: "absolute", top: "-24px", left: "-24px", width: "80px", height: "80px", border: "1.5px dashed rgba(255,255,255,0.3)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: "-24px", right: "-24px", width: "80px", height: "80px", border: "1.5px dashed rgba(255,255,255,0.3)", borderRadius: "50%" }} />

          <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#A1EBB4" }}>
            asterisk
          </span>
          <h2 style={{ fontSize: "2rem", fontWeight: "800", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            Siap Menjelajahi Pariwisata Palangka Raya?
          </h2>
          <p style={{ fontSize: "0.95rem", opacity: 0.9, margin: 0, maxWidth: "600px", lineHeight: 1.5 }}>
            Ajukan pertanyaan, dapatkan jawaban relevan, dan telusuri sumber dokumen resmi dengan cepat.
          </p>
          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "#A1EBB4",
                color: "#0D381B",
                textDecoration: "none",
                padding: "0.75rem 1.6rem",
                borderRadius: "999px",
                fontSize: "0.9rem",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Chat via Telegram
            </a>
            <Link
              href="/admin"
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "#ffffff",
                textDecoration: "none",
                padding: "0.75rem 1.6rem",
                borderRadius: "999px",
                fontSize: "0.9rem",
                fontWeight: "700",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              Admin Dashboard
            </Link>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 7. FOOTER */}
      {/* ============================================================ */}
      <footer
        style={{
          borderTop: "1.5px dashed var(--border-color)",
          background: "var(--bg-surface)",
          padding: "1.5rem 2rem",
          marginTop: "2rem",
          fontSize: "0.825rem",
          color: "var(--text-secondary)",
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#2E6B45" }}>
              asterisk
            </span>
            <span style={{ fontWeight: "800", color: "var(--text-primary)" }}>
              Disparbudpora AI
            </span>
            <span>• Dinas Kebudayaan, Pariwisata, Kepemudaan & Olahraga Kota Palangka Raya</span>
          </div>

          <div>
            © {new Date().getFullYear()} All rights reserved.
          </div>
        </div>
      </footer>

      {/* Global Responsive Styles */}
      <style jsx global>{`
        @media (max-width: 868px) {
          .desktop-nav, .desktop-only {
            display: none !important;
          }
          .theme-text-label {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
