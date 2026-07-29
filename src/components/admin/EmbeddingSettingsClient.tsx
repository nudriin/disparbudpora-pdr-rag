"use client";

import { useState } from "react";
import type { EmbeddingConfig, EmbeddingProvider } from "@/retrieval/embedding";
import { EMBEDDING_PRESET_OPTIONS } from "@/retrieval/embedding";

interface EmbeddingSettingsProps {
  initialConfig: EmbeddingConfig;
  env: {
    hasGoogleApiKey: boolean;
    hasReplicateKey?: boolean;
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
      <div>
        <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--text-primary)" }}>memory</span>
          Pengaturan Embedding Model (Vector Retrieval)
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Pilih model embedding untuk mengubah dokumen pariwisata menjadi representasi vektor numerik.
        </p>
      </div>

      {/* Warning Box */}
      <div
        style={{
          background: "rgba(254, 235, 200, 0.15)",
          border: "1px solid #fbd38d",
          borderRadius: "14px",
          padding: "0.85rem 1rem",
          fontSize: "0.825rem",
          color: "var(--text-primary)",
          lineHeight: "1.45",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#FFB4A2", flexShrink: 0 }}>
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
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {(["replicate", "transformers", "google"] as EmbeddingProvider[]).map((p) => {
            const isSelected = provider === p;
            const isOk =
              p === "transformers" ||
              (p === "google" && env.hasGoogleApiKey) ||
              (p === "replicate" && env.hasReplicateKey);

            return (
              <label
                key={p}
                style={{
                  flex: "1 1 180px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.85rem",
                  borderRadius: "14px",
                  border: isSelected ? "2px solid var(--mint-text)" : "1px solid var(--border-color)",
                  background: isSelected ? "var(--mint-accent)" : "var(--input-bg)",
                  color: isSelected ? "var(--mint-text)" : "var(--text-primary)",
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
                  <div style={{ fontWeight: "800", fontSize: "0.875rem" }}>
                    {p === "replicate"
                      ? "Replicate Cloud API"
                      : p === "transformers"
                      ? "Transformers.js (Lokal)"
                      : "Google AI Studio"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      color: isOk ? (isSelected ? "var(--mint-text)" : "#276749") : "#ba1a1a",
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
                      : p === "google"
                      ? env.hasGoogleApiKey
                        ? "GOOGLE_API_KEY OK"
                        : "API Key belum di-set"
                      : env.hasReplicateKey
                      ? "REPLICATE_API_TOKEN OK"
                      : "REPLICATE_API_TOKEN belum di-set"}
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
          }}
        />
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Jumlah elemen numerik vektor. (e.g. 384 untuk multilingual-e5-small, 3072 untuk gemini-embedding-001).
        </p>
      </div>

      {saveMsg && (
        <div
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "12px",
            background: saveMsg.type === "success" ? "rgba(39,103,73,0.15)" : "rgba(186,26,26,0.15)",
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

      <button
        type="submit"
        disabled={saving || !isGoogleAvailable}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "999px",
          background: saving || !isGoogleAvailable ? "var(--text-secondary)" : "var(--dark-card-bg)",
          color: "white",
          border: "none",
          fontWeight: "700",
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
