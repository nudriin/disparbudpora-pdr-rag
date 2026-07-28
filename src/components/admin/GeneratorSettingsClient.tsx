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
      alert("Error: " + (err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
      {/* ==== FORM SETTINGS (Google Stitch Design) ==== */}
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
            <span className="material-symbols-outlined" style={{ color: "#0058be" }}>tune</span>
            Pengaturan Generator LLM
          </h2>
          <p style={{ color: "#45474c", fontSize: "0.85rem", marginTop: "0.25rem" }}>
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
                    borderRadius: "8px",
                    border: isSelected ? "2px solid #0058be" : "1px solid #c5c6cd",
                    background: isSelected ? "#d8e2ff" : "#ffffff",
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
                    <div style={{ fontWeight: "700", color: "#091426", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px", color: p === "gemini" ? "#0058be" : "#744210" }}>
                        {p === "gemini" ? "smart_toy" : "psychology"}
                      </span>
                      {p === "gemini" ? "Google Gemini" : "Replicate (LLaMA)"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        color: isKeyOk ? "#276749" : "#ba1a1a",
                        marginTop: "0.15rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>
                        {isKeyOk ? "check_circle" : "warning"}
                      </span>
                      {isKeyOk ? "API key OK" : "API key belum ada"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Nama Model</label>
            <label style={{ fontSize: "0.78rem", color: "#45474c", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <input
                type="checkbox"
                checked={useCustomModel}
                onChange={(e) => setUseCustomModel(e.target.checked)}
              />
              Custom model name
            </label>
          </div>

          {useCustomModel ? (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "gemini" ? "Contoh: gemini-2.5-flash" : "Contoh: owner/model:version"}
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
        </div>

        {/* Temperature Slider */}
        <div>
          <label style={labelStyle}>
            Temperature: <strong>{temperature.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            min="0" max="1" step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#0058be" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#75777d" }}>
            <span>0.0 (Faktual / Presisi)</span>
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
          disabled={saving || !keyAvailable}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: saving || !keyAvailable ? "#75777d" : "#091426",
            color: "white",
            border: "none",
            fontWeight: "600",
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

      {/* ==== TEST CONTAINER (Google Stitch Design) ==== */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #c5c6cd",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#091426", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="material-symbols-outlined" style={{ color: "#0058be" }}>science</span>
            Test Generator RAG Pipeline
          </h2>
          <p style={{ color: "#45474c", fontSize: "0.85rem", marginTop: "0.25rem" }}>
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
            borderRadius: "8px",
            background: testing ? "#75777d" : "#0058be",
            color: "white",
            border: "none",
            fontWeight: "600",
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
              padding: "1rem",
              borderRadius: "8px",
              background: "#f7f9fb",
              border: "1px solid #c5c6cd",
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.75rem" }}>
              <span style={{ background: "#d8e2ff", color: "#0058be", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: "600" }}>
                Provider: {testResult.provider}
              </span>
              <span style={{ background: "#f2f4f6", color: "#45474c", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: "600" }}>
                Model: {testResult.model}
              </span>
              <span style={{ background: testResult.wasAnswered ? "#f0fff4" : "#ffdad6", color: testResult.wasAnswered ? "#276749" : "#ba1a1a", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: "600" }}>
                {testResult.wasAnswered ? "Terjawab" : "Tidak ada informasi"}
              </span>
              <span style={{ background: "#feebc8", color: "#744210", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: "600" }}>
                {(testResult.elapsedMs / 1000).toFixed(2)}s
              </span>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "6px",
                padding: "0.75rem",
                fontSize: "0.875rem",
                color: "#191c1e",
                whiteSpace: "pre-wrap",
                border: "1px solid #c5c6cd",
                maxHeight: "300px",
                overflowY: "auto",
                lineHeight: "1.5",
              }}
            >
              {testResult.answer}
            </div>
          </div>
        )}
      </div>
    </div>
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
