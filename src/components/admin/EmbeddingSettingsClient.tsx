"use client";

import { useState } from "react";
import type { EmbeddingConfig, EmbeddingProvider } from "@/retrieval/embedding";
import { EMBEDDING_PRESET_OPTIONS } from "@/retrieval/embedding";

interface EmbeddingSettingsProps {
  initialConfig: EmbeddingConfig;
  env: {
    hasGoogleApiKey: boolean;
  };
}

export default function EmbeddingSettingsClient({
  initialConfig,
  env,
}: EmbeddingSettingsProps) {
  const [provider, setProvider] = useState<EmbeddingProvider>(initialConfig.provider);
  const [model, setModel] = useState<string>(initialConfig.model);
  const [dimensions, setDimensions] = useState<number>(initialConfig.dimensions);
  const [useCustomModel, setUseCustomModel] = useState<boolean>(
    !EMBEDDING_PRESET_OPTIONS.some((opt) => opt.value.model === initialConfig.model)
  );

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handlePresetSelect(presetIndex: number) {
    const selected = EMBEDDING_PRESET_OPTIONS[presetIndex]?.value;
    if (selected) {
      setProvider(selected.provider);
      setModel(selected.model);
      setDimensions(selected.dimensions);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch("/api/admin/settings/embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          dimensions,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");

      setSaveMsg({ type: "success", text: "Pengaturan Embedding berhasil disimpan!" });
    } catch (err) {
      setSaveMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  }

  const isGoogleAvailable = provider !== "google" || env.hasGoogleApiKey;

  return (
    <form
      onSubmit={handleSave}
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.5rem",
        border: "1px solid #c5c6cd",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#091426", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="material-symbols-outlined" style={{ color: "#0058be" }}>memory</span>
          Pengaturan Embedding Model (Vector Retrieval)
        </h2>
        <p style={{ color: "#45474c", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Pilih model embedding untuk mengubah dokumen pariwisata menjadi representasi vektor numerik.
        </p>
      </div>

      {/* Warning Box */}
      <div
        style={{
          background: "#feebc8",
          border: "1px solid #fbd38d",
          borderRadius: "8px",
          padding: "0.85rem 1rem",
          fontSize: "0.825rem",
          color: "#744210",
          lineHeight: "1.45",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#dd6b20", flexShrink: 0 }}>
          warning
        </span>
        <div>
          <strong>Perhatian Penting:</strong> Jika Anda mengubah provider/dimensi embedding pada data yang sudah di-ingest, Anda harus melakukan <strong>Reset Vector & Re-ingest</strong> di menu Dokumen agar dimensi ChromaDB sesuai.
        </div>
      </div>

      {/* Quick Presets Dropdown */}
      <div>
        <label style={labelStyle}>Opsi Preset Embedding Siap Pakai</label>
        <select
          disabled={useCustomModel}
          onChange={(e) => handlePresetSelect(Number(e.target.value))}
          style={{
            ...inputStyle,
            opacity: useCustomModel ? 0.5 : 1,
          }}
          value={
            EMBEDDING_PRESET_OPTIONS.findIndex(
              (opt) => opt.value.provider === provider && opt.value.model === model
            )
          }
        >
          {EMBEDDING_PRESET_OPTIONS.map((opt, idx) => (
            <option key={idx} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
        <div style={{ marginTop: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "#45474c", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <input
              type="checkbox"
              checked={useCustomModel}
              onChange={(e) => setUseCustomModel(e.target.checked)}
            />
            Gunakan konfigurasi model / dimensi kustom (Custom Model)
          </label>
        </div>
      </div>

      {/* Provider Choice Cards */}
      <div>
        <label style={labelStyle}>Provider Embedding</label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {(["transformers", "google"] as EmbeddingProvider[]).map((p) => {
            const isSelected = provider === p;
            const isOk = p === "transformers" || env.hasGoogleApiKey;

            return (
              <label
                key={p}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  border: isSelected ? "2px solid #0058be" : "1px solid #c5c6cd",
                  background: isSelected ? "#d8e2ff" : "#ffffff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="radio"
                  name="embedding_provider"
                  checked={isSelected}
                  onChange={() => setProvider(p)}
                />
                <div>
                  <div style={{ fontWeight: "700", color: "#091426", fontSize: "0.875rem" }}>
                    {p === "transformers" ? "Transformers.js (Lokal)" : "Google AI Studio"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "600",
                      color: isOk ? "#276749" : "#ba1a1a",
                      marginTop: "0.15rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
                      {isOk ? "check_circle" : "warning"}
                    </span>
                    {p === "transformers"
                      ? "CPU lokal (Tanpa API Key)"
                      : env.hasGoogleApiKey
                      ? "GOOGLE_API_KEY OK"
                      : "API Key belum di-set"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Model Name */}
      <div>
        <label style={labelStyle}>Nama Model Embedding</label>
        <input
          type="text"
          value={model}
          disabled={!useCustomModel}
          onChange={(e) => setModel(e.target.value)}
          placeholder={provider === "transformers" ? "Contoh: Xenova/multilingual-e5-small" : "Contoh: gemini-embedding-001"}
          style={{
            ...inputStyle,
            opacity: !useCustomModel ? 0.6 : 1,
            background: !useCustomModel ? "#f7f9fb" : "white",
          }}
        />
      </div>

      {/* Vector Dimensions */}
      <div>
        <label style={labelStyle}>Dimensi Output Vektor (Output Dimensions)</label>
        <input
          type="number"
          value={dimensions}
          disabled={!useCustomModel}
          onChange={(e) => setDimensions(Number(e.target.value))}
          style={{
            ...inputStyle,
            opacity: !useCustomModel ? 0.6 : 1,
            background: !useCustomModel ? "#f7f9fb" : "white",
          }}
        />
        <p style={{ fontSize: "0.75rem", color: "#75777d", marginTop: "0.25rem" }}>
          Jumlah elemen numerik vektor. (e.g. 384 untuk multilingual-e5-small, 3072 untuk gemini-embedding-001).
        </p>
      </div>

      {saveMsg && (
        <div
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "8px",
            background: saveMsg.type === "success" ? "#f0fff4" : "#ffdad6",
            color: saveMsg.type === "success" ? "#276749" : "#ba1a1a",
            fontSize: "0.85rem",
            fontWeight: "600",
            border: `1px solid ${saveMsg.type === "success" ? "#c6f6d5" : "#ffdad6"}`,
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

      <button
        type="submit"
        disabled={saving || !isGoogleAvailable}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          background: saving || !isGoogleAvailable ? "#75777d" : "#091426",
          color: "white",
          border: "none",
          fontWeight: "600",
          fontSize: "0.875rem",
          cursor: saving || !isGoogleAvailable ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
          save
        </span>
        {saving
          ? "Menyimpan..."
          : !isGoogleAvailable
          ? "GOOGLE_API_KEY Belum Terpasang"
          : "Simpan Pengaturan Embedding"}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: "600",
  color: "#091426",
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "6px",
  border: "1px solid #c5c6cd",
  fontSize: "0.9rem",
  background: "#ffffff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
