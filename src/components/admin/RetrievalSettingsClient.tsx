"use client";

import { useState } from "react";
import type { RetrievalConfig } from "@/generation/types";

interface RetrievalSettingsClientProps {
  initialConfig: RetrievalConfig;
}

export default function RetrievalSettingsClient({
  initialConfig,
}: RetrievalSettingsClientProps) {
  const [useHyde, setUseHyde] = useState<boolean>(initialConfig.useHyde);
  const [nResults, setNResults] = useState<number>(initialConfig.nResults);
  const [minSimilarity, setMinSimilarity] = useState<number>(initialConfig.minSimilarity);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    marginBottom: "0.4rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.85rem",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    fontSize: "0.9rem",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/settings/retrieval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useHyde, nResults, minSimilarity }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      setSaveMsg({ type: "success", text: "Pengaturan retrieval berhasil disimpan!" });
    } catch (err) {
      setSaveMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  }

  const hydeExplanation = useHyde
    ? "HyDE aktif: LLM akan menghasilkan jawaban hipotesis terlebih dahulu sebelum mencari konteks di database vektor. Akurasi lebih tinggi, latensi +1-2 detik."
    : "HyDE nonaktif: Query pengguna langsung di-embed dan dicari di database vektor. Latensi lebih cepat namun akurasi lebih rendah untuk query yang ambigu.";

  return (
    <form
      onSubmit={handleSave}
      style={{
        background: "var(--bg-surface)",
        borderRadius: "22px",
        padding: "1.5rem",
        border: "1px solid var(--border-color)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: "1.15rem",
            fontWeight: "800",
            color: "var(--text-primary)",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span className="material-symbols-outlined" style={{ color: "var(--text-primary)" }}>
            manage_search
          </span>
          Pengaturan Retrieval (Pencarian Konteks)
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Kontrol strategi pengambilan konteks dari ChromaDB untuk jawaban chatbot.
        </p>
      </div>

      {/* HyDE Toggle */}
      <div>
        <label style={labelStyle}>
          HyDE (Hypothetical Document Embeddings)
        </label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {/* Toggle Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem 1.25rem",
              borderRadius: "14px",
              border: `2px solid ${useHyde ? "var(--mint-text)" : "var(--border-color)"}`,
              background: useHyde ? "var(--mint-accent)" : "var(--input-bg)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => setUseHyde((v) => !v)}
          >
            {/* Switch */}
            <div
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "999px",
                background: useHyde ? "var(--mint-text)" : "var(--border-color)",
                position: "relative",
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: "3px",
                  left: useHyde ? "25px" : "3px",
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "0.875rem",
                  color: useHyde ? "var(--mint-text)" : "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {useHyde ? "auto_fix_high" : "search"}
                </span>
                {useHyde ? "HyDE Aktif" : "HyDE Nonaktif"}
              </div>
              <div
                style={{
                  fontSize: "0.77rem",
                  color: useHyde ? "var(--mint-text)" : "var(--text-secondary)",
                  marginTop: "0.2rem",
                  lineHeight: "1.4",
                }}
              >
                {hydeExplanation}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* nResults */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.4rem",
          }}
        >
          <label style={{ ...labelStyle, margin: 0 }}>Jumlah Kandidat (nResults): {nResults}</label>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>
            {nResults <= 5 ? "Cepat & Ringkas" : nResults >= 20 ? "Komprehensif" : "Seimbang"}
          </span>
        </div>
        <input
          type="range"
          min="3"
          max="30"
          step="1"
          value={nResults}
          onChange={(e) => setNResults(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--text-primary)" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.72rem",
            color: "var(--text-secondary)",
          }}
        >
          <span>3 (Cepat)</span>
          <span>15 (Seimbang)</span>
          <span>30 (Komprehensif)</span>
        </div>
        <p style={{ fontSize: "0.77rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
          Jumlah child chunks yang diambil dari ChromaDB sebelum difilter similarity.
          Nilai lebih besar = konteks lebih luas, tetapi lebih lambat.
        </p>
      </div>

      {/* minSimilarity */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.4rem",
          }}
        >
          <label style={{ ...labelStyle, margin: 0 }}>
            Min. Similarity: {minSimilarity.toFixed(2)}
          </label>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>
            {minSimilarity < 0.25
              ? "Toleran (Recall Tinggi)"
              : minSimilarity > 0.55
              ? "Ketat (Presisi Tinggi)"
              : "Seimbang"}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          value={minSimilarity}
          onChange={(e) => setMinSimilarity(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--text-primary)" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.72rem",
            color: "var(--text-secondary)",
          }}
        >
          <span>0.0 (Semua diterima)</span>
          <span>0.4 (Seimbang)</span>
          <span>0.8 (Sangat ketat)</span>
        </div>
        <p style={{ fontSize: "0.77rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
          Ambang batas minimum skor cosine similarity. Chunk di bawah nilai ini akan dibuang.
          Nilai rendah = lebih banyak konteks (recall tinggi), nilai tinggi = konteks lebih tepat.
        </p>
      </div>

      {/* Save Feedback */}
      {saveMsg && (
        <div
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "12px",
            background:
              saveMsg.type === "success" ? "rgba(39,103,73,0.15)" : "rgba(186,26,26,0.15)",
            color: saveMsg.type === "success" ? "#A1EBB4" : "#FFB4A2",
            fontSize: "0.85rem",
            fontWeight: "700",
            border: `1px solid ${saveMsg.type === "success" ? "#2E6B45" : "#FFB4A2"}`,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            {saveMsg.type === "success" ? "check_circle" : "error"}
          </span>
          {saveMsg.text}
        </div>
      )}

      {/* Save Button */}
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "999px",
          background: saving ? "var(--text-secondary)" : "var(--dark-card-bg)",
          color: "white",
          border: "none",
          fontWeight: "700",
          fontSize: "0.875rem",
          cursor: saving ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          save
        </span>
        {saving ? "Menyimpan..." : "Simpan Pengaturan Retrieval"}
      </button>
    </form>
  );
}
