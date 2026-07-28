"use client";

import { useEffect, useState } from "react";
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
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Ketika preset dipilih dari dropdown
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

      setSaveMsg("✅ Pengaturan Embedding berhasil disimpan!");
    } catch (err) {
      setSaveMsg("❌ Gagal: " + (err as Error).message);
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
        background: "white",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#2d3748", margin: 0 }}>
          🧬 Pengaturan Embedding Model (Vector Retrieval)
        </h2>
        <p style={{ color: "#718096", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Pilih model embedding untuk mengubah dokumen pariwisata menjadi representasi vektor numerik.
        </p>
      </div>

      {/* Warning Box */}
      <div
        style={{
          background: "#fffaf0",
          border: "1px solid #feebc8",
          borderRadius: "8px",
          padding: "0.85rem 1rem",
          fontSize: "0.825rem",
          color: "#744210",
          lineHeight: "1.4",
        }}
      >
        ⚠️ <strong>Perhatian Peting:</strong> Jika Anda mengubah provider/dimensi embedding pada data yang sudah di-ingest, Anda harus melakukan <strong>Reset Vector & Re-ingest</strong> di menu Dokumen agar dimensi ChromaDB sesuai.
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
          <label style={{ fontSize: "0.8rem", color: "#4a5568", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={useCustomModel}
              onChange={(e) => setUseCustomModel(e.target.checked)}
              style={{ marginRight: "0.35rem" }}
            />
            Gunakan konfigurasi model / dimensi kustom (Custom Model)
          </label>
        </div>
      </div>

      {/* Provider Choice */}
      <div>
        <label style={labelStyle}>Provider Embedding</label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {(["transformers", "google"] as EmbeddingProvider[]).map((p) => (
            <label
              key={p}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "8px",
                border: provider === p ? "2px solid #3182ce" : "1px solid #e2e8f0",
                background: provider === p ? "#ebf8ff" : "white",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <input
                type="radio"
                name="embedding_provider"
                checked={provider === p}
                onChange={() => setProvider(p)}
              />
              <div>
                <div style={{ fontWeight: "600" }}>
                  {p === "transformers"
                    ? "🟢 Transformers.js (Lokal Gratis)"
                    : "🔵 Google AI Studio"}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: p === "transformers" ? "#38a169" : env.hasGoogleApiKey ? "#38a169" : "#e53e3e",
                  }}
                >
                  {p === "transformers"
                    ? "✅ Run di CPU lokal (Tanpa API Key)"
                    : env.hasGoogleApiKey
                    ? "✅ GOOGLE_API_KEY OK"
                    : "⚠️ GOOGLE_API_KEY belum di-set"}
                </div>
              </div>
            </label>
          ))}
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
          placeholder={
            provider === "transformers"
              ? "Contoh: Xenova/multilingual-e5-small"
              : "Contoh: gemini-embedding-001"
          }
          style={{
            ...inputStyle,
            opacity: !useCustomModel ? 0.6 : 1,
            background: !useCustomModel ? "#f7fafc" : "white",
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
            background: !useCustomModel ? "#f7fafc" : "white",
          }}
        />
        <p style={{ fontSize: "0.75rem", color: "#a0aec0", marginTop: "0.25rem" }}>
          Jumlah elemen numerik vektor. (e.g. 384 untuk multilingual-e5-small, 3072 untuk gemini-embedding-001, 768 untuk text-embedding-004).
        </p>
      </div>

      {saveMsg && (
        <div
          style={{
            padding: "0.65rem 1rem",
            borderRadius: "6px",
            background: saveMsg.startsWith("✅") ? "#f0fff4" : "#fff5f5",
            color: saveMsg.startsWith("✅") ? "#22543d" : "#742a2a",
            fontSize: "0.85rem",
            fontWeight: "500",
          }}
        >
          {saveMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !isGoogleAvailable}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          background: saving || !isGoogleAvailable ? "#a0aec0" : "#3182ce",
          color: "white",
          border: "none",
          fontWeight: "600",
          cursor: saving || !isGoogleAvailable ? "not-allowed" : "pointer",
        }}
      >
        {saving
          ? "Menyimpan..."
          : !isGoogleAvailable
          ? "GOOGLE_API_KEY Belum Terpasang"
          : "💾 Simpan Pengaturan Embedding"}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: "600",
  color: "#2d3748",
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "6px",
  border: "1px solid #cbd5e0",
  fontSize: "0.9rem",
  background: "white",
  boxSizing: "border-box",
};
