"use client";

import { useEffect, useState } from "react";
import type { GeneratorConfig, LLMProvider } from "@/generation/types";

interface GeneratorSettingsProps {
  initialConfig: GeneratorConfig;
  env: {
    geminiKeyPresent: boolean;
    replicateKeyPresent: boolean;
  };
}

const GEMINI_PRESETS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
];

const REPLICATE_PRESETS = [
  "meta/meta-llama-3.1-405b-instruct",
  "meta/meta-llama-3.1-70b-instruct",
  "meta/meta-llama-3-70b-instruct",
  "mistralai/mixtral-8x7b-instruct-v0.1",
  "mistralai/mistral-7b-instruct-v0.2",
];

export default function GeneratorSettingsClient({
  initialConfig,
  env,
}: GeneratorSettingsProps) {
  const [provider, setProvider] = useState<LLMProvider>(initialConfig.provider);
  const [model, setModel] = useState<string>(initialConfig.model);
  const [temperature, setTemperature] = useState<number>(initialConfig.temperature);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(initialConfig.maxOutputTokens);
  const [useCustomModel, setUseCustomModel] = useState<boolean>(
    !GEMINI_PRESETS.includes(initialConfig.model) &&
    !REPLICATE_PRESETS.includes(initialConfig.model)
  );

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Test form
  const [testQuestion, setTestQuestion] = useState<string>(
    "Apa saja destinasi wisata alam di Palangka Raya?"
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    answer: string;
    wasAnswered: boolean;
    provider: string;
    model: string;
    elapsedMs: number;
    contextCount: number;
  }>(null);

  // Ketika provider berganti, reset model preset
  useEffect(() => {
    if (!useCustomModel) {
      setModel(
        provider === "gemini" ? GEMINI_PRESETS[0] : REPLICATE_PRESETS[0]
      );
    }
  }, [provider, useCustomModel]);

  const currentPresets = provider === "gemini" ? GEMINI_PRESETS : REPLICATE_PRESETS;
  const keyAvailable = provider === "gemini" ? env.geminiKeyPresent : env.replicateKeyPresent;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/settings/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          temperature,
          maxOutputTokens,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      setSaveMsg("✅ Pengaturan berhasil disimpan!");
    } catch (err) {
      setSaveMsg("❌ Gagal: " + (err as Error).message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  async function handleTest() {
    if (!testQuestion.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/test-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generator: { provider, model, temperature, maxOutputTokens },
          question: testQuestion,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal tes");
      setTestResult(body);
    } catch (err) {
      alert("Error: " + (err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
      {/* ==== FORM SETTINGS ==== */}
      <form onSubmit={handleSave} style={{
        background: "white", borderRadius: "12px", padding: "1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)", display: "flex",
        flexDirection: "column", gap: "1.25rem",
      }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#2d3748", margin: 0 }}>
            ⚙️ Pengaturan Generator LLM
          </h2>
          <p style={{ color: "#718096", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Pilih provider dan model yang akan digunakan oleh chatbot Telegram.
          </p>
        </div>

        {/* Provider */}
        <div>
          <label style={labelStyle}>Provider LLM</label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {(["gemini", "replicate"] as LLMProvider[]).map((p) => (
              <label key={p} style={{
                flex: 1, display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem", borderRadius: "8px", border:
                  provider === p
                    ? "2px solid #3182ce"
                    : "1px solid #e2e8f0",
                background: provider === p ? "#ebf8ff" : "white",
                cursor: "pointer", fontSize: "0.9rem",
              }}>
                <input
                  type="radio"
                  name="provider"
                  checked={provider === p}
                  onChange={() => setProvider(p)}
                />
                <div>
                  <div style={{ fontWeight: "600" }}>
                    {p === "gemini" ? "🤖 Google Gemini" : "🦙 Replicate (LLaMA, Mixtral, dll)"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color:
                    (p === "gemini" ? env.geminiKeyPresent : env.replicateKeyPresent)
                      ? "#38a169" : "#e53e3e"
                  }}>
                    {(p === "gemini" ? env.geminiKeyPresent : env.replicateKeyPresent)
                      ? "✅ API key OK"
                      : "⚠️ API key tidak ditemukan"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label style={labelStyle}>
            Model
            <span style={{ marginLeft: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#4a5568", fontWeight: "400", marginLeft: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={useCustomModel}
                  onChange={(e) => setUseCustomModel(e.target.checked)}
                  style={{ marginRight: "0.25rem" }}
                />
                Custom model name
              </label>
            </span>
          </label>
          {useCustomModel ? (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "gemini"
                  ? "Contoh: gemini-2.5-flash"
                  : "Contoh: owner/model:version"
              }
              style={inputStyle}
            />
          ) : (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={inputStyle}
            >
              {currentPresets.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          <p style={{ fontSize: "0.75rem", color: "#a0aec0", marginTop: "0.25rem" }}>
            {provider === "gemini"
              ? "Daftar model Gemini: https://ai.google.dev/gemini-api/docs/models"
              : "Cari model Replicate di: https://replicate.com/explore (format: owner/model:version)"}
          </p>
        </div>

        {/* Temperature */}
        <div>
          <label style={labelStyle}>
            Temperature: <strong>{temperature.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: "0.7rem", color: "#a0aec0" }}>
            <span>0.0 (Faktual)</span>
            <span>0.5 (Seimbang)</span>
            <span>1.0 (Kreatif)</span>
          </div>
        </div>

        {/* Max output tokens */}
        <div>
          <label style={labelStyle}>Max Output Tokens: {maxOutputTokens}</label>
          <input
            type="number" min="64" max="8192" step="64"
            value={maxOutputTokens}
            onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {saveMsg && (
          <div style={{
            padding: "0.65rem 1rem", borderRadius: "6px",
            background: saveMsg.startsWith("✅") ? "#f0fff4" : "#fff5f5",
            color: saveMsg.startsWith("✅") ? "#22543d" : "#742a2a",
            fontSize: "0.85rem", fontWeight: "500",
          }}>
            {saveMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !keyAvailable}
          style={{
            padding: "0.75rem 1rem", borderRadius: "6px",
            background: saving || !keyAvailable ? "#a0aec0" : "#3182ce",
            color: "white", border: "none", fontWeight: "600",
            cursor: saving || !keyAvailable ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Menyimpan..." : !keyAvailable ? "API key belum ada" : "💾 Simpan Pengaturan"}
        </button>
      </form>

      {/* ==== TEST CONTAINER ==== */}
      <div style={{
        background: "white", borderRadius: "12px", padding: "1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)", display: "flex",
        flexDirection: "column", gap: "1rem",
      }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#2d3748", margin: 0 }}>
            🧪 Test Generator
          </h2>
          <p style={{ color: "#718096", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Uji konfigurasi LLM saat ini sebelum menerapkannya ke bot.
          </p>
        </div>

        <div>
          <label style={labelStyle}>Pertanyaan Uji</label>
          <textarea
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <button
          onClick={handleTest}
          disabled={testing || !testQuestion.trim() || !keyAvailable}
          style={{
            padding: "0.65rem 1rem", borderRadius: "6px",
            background: testing ? "#a0aec0" : "#38a169",
            color: "white", border: "none", fontWeight: "600",
            cursor: testing || !testQuestion.trim() || !keyAvailable
              ? "not-allowed" : "pointer",
          }}
        >
          {testing ? "⏳ Menjalankan RAG pipeline..." : "🚀 Jalankan Test"}
        </button>

        {testResult && (
          <div style={{
            padding: "1rem", borderRadius: "8px", background: "#f7fafc",
            border: "1px solid #e2e8f0", display: "flex",
            flexDirection: "column", gap: "0.5rem",
          }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap",
              fontSize: "0.75rem" }}>
              <span style={badgeStyle(testResult.provider === "gemini" ? "#3182ce" : "#805ad5")}>
                Provider: {testResult.provider}
              </span>
              <span style={badgeStyle("#4a5568")}>Model: {testResult.model}</span>
              <span style={badgeStyle(testResult.wasAnswered ? "#38a169" : "#e53e3e")}>
                {testResult.wasAnswered ? "✅ Terjawab" : "❌ Tidak ada informasi"}
              </span>
              <span style={badgeStyle("#d69e2e")}>
                ⏱️ {(testResult.elapsedMs / 1000).toFixed(2)}s
              </span>
              <span style={badgeStyle("#718096")}>
                📚 {testResult.contextCount} konteks
              </span>
            </div>
            <div style={{
              background: "white", borderRadius: "6px", padding: "0.75rem",
              fontSize: "0.875rem", color: "#2d3748", whiteSpace: "pre-wrap",
              border: "1px solid #e2e8f0", maxHeight: "320px", overflowY: "auto",
            }}>
              {testResult.answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.85rem", fontWeight: "600",
  color: "#2d3748", marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", borderRadius: "6px",
  border: "1px solid #cbd5e0", fontSize: "0.9rem", background: "white",
  boxSizing: "border-box",
};

function badgeStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "white", padding: "0.2rem 0.55rem",
    borderRadius: "9999px", fontWeight: "500",
  };
}
