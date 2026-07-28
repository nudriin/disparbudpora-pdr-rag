"use client";

import { useState } from "react";
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
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  function handleProviderChange(newProvider: LLMProvider) {
    setProvider(newProvider);
    if (!useCustomModel) {
      setModel(newProvider === "gemini" ? GEMINI_PRESETS[0] : REPLICATE_PRESETS[0]);
    }
  }

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
      setSaveMsg({ type: "success", text: "Pengaturan generator berhasil disimpan!" });
    } catch (err) {
      setSaveMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
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
      setTestResult({
        answer: `Error: ${(err as Error).message}`,
        wasAnswered: false,
        provider,
        model,
        elapsedMs: 0,
        contextCount: 0,
      });
    } finally {
      setTesting(false);
    }
  }

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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
      {/* ==== FORM SETTINGS (Neo-Minimalist Design) ==== */}
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
            <span className="material-symbols-outlined" style={{ color: "var(--text-primary)" }}>tune</span>
            Pengaturan Generator LLM
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Pilih provider dan model AI yang akan merumuskan jawaban chatbot Telegram.
          </p>
        </div>

        {/* Provider Radio Choice Cards */}
        <div>
          <label style={labelStyle}>Provider LLM</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {(["gemini", "replicate"] as LLMProvider[]).map((p) => {
              const isSelected = provider === p;
              const isKeyOk = p === "gemini" ? env.geminiKeyPresent : env.replicateKeyPresent;

              return (
                <label
                  key={p}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.85rem",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid var(--mint-text)" : "1px solid var(--border-color)",
                    background: isSelected ? "var(--mint-accent)" : "var(--input-bg)",
                    color: isSelected ? "var(--mint-text)" : "var(--text-primary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="provider"
                    checked={isSelected}
                    onChange={() => handleProviderChange(p)}
                  />
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        {p === "gemini" ? "smart_toy" : "psychology"}
                      </span>
                      {p === "gemini" ? "Google Gemini" : "Replicate (LLaMA)"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: "700",
                        color: isKeyOk ? (isSelected ? "var(--mint-text)" : "#276749") : "#ba1a1a",
                        marginTop: "0.15rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
                        {isKeyOk ? "check_circle" : "warning"}
                      </span>
                      {isKeyOk
                        ? p === "gemini" ? "GOOGLE_API_KEY OK" : "REPLICATE_TOKEN OK"
                        : "API Key Belum Di-set"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Model Presets or Custom Input */}
        <div>
          <label style={labelStyle}>Model LLM</label>
          <select
            disabled={useCustomModel}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              ...inputStyle,
              opacity: useCustomModel ? 0.5 : 1,
            }}
          >
            {currentPresets.map((m) => (
              <option key={m} value={m}>
                {m}
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
              Gunakan nama model kustom (Custom Model)
            </label>
          </div>
        </div>

        {useCustomModel && (
          <div>
            <label style={labelStyle}>Nama Model Kustom</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Contoh: meta/meta-llama-3.1-405b-instruct"
              style={inputStyle}
            />
          </div>
        )}

        {/* Temperature Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Temperature: {temperature}</label>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>
              {temperature < 0.3 ? "Faktual & Konsisten" : temperature > 0.7 ? "Sangat Kreatif" : "Seimbang"}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--text-primary)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            <span>0.0 (Faktual)</span>
            <span>0.5 (Seimbang)</span>
            <span>1.0 (Kreatif)</span>
          </div>
        </div>

        {/* Max Output Tokens */}
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
          disabled={saving || !keyAvailable}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "999px",
            background: saving || !keyAvailable ? "var(--text-secondary)" : "var(--dark-card-bg)",
            color: "white",
            border: "none",
            fontWeight: "700",
            fontSize: "0.875rem",
            cursor: saving || !keyAvailable ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            save
          </span>
          {saving ? "Menyimpan..." : !keyAvailable ? "API Key Belum Terpasang" : "Simpan Pengaturan Generator"}
        </button>
      </form>

      {/* ==== TEST CONTAINER (Neo-Minimalist Design) ==== */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "22px",
          padding: "1.5rem",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--text-primary)" }}>science</span>
            Test Generator RAG Pipeline
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Uji responsivitas dan akurasi model LLM pilihan Anda secara langsung.
          </p>
        </div>

        <div>
          <label style={labelStyle}>Pertanyaan Uji Simulasi</label>
          <textarea
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        <button
          onClick={handleTest}
          disabled={testing || !testQuestion.trim() || !keyAvailable}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "999px",
            background: testing ? "var(--text-secondary)" : "#A1EBB4",
            color: "#0D381B",
            border: "none",
            fontWeight: "800",
            fontSize: "0.875rem",
            cursor: testing || !testQuestion.trim() || !keyAvailable ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            rocket_launch
          </span>
          {testing ? "Menjalankan RAG Pipeline..." : "Jalankan Test Simulasi"}
        </button>

        {testResult && (
          <div
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "999px",
                  background: testResult.wasAnswered ? "rgba(39,103,73,0.15)" : "rgba(186,26,26,0.15)",
                  color: testResult.wasAnswered ? "#A1EBB4" : "#FFB4A2",
                }}
              >
                {testResult.wasAnswered ? "Terjawab" : "Tidak Ada Info"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                ⏱️ {(testResult.elapsedMs / 1000).toFixed(2)}s • {testResult.provider} ({testResult.model})
              </span>
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {testResult.answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
