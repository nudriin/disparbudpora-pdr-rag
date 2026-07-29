import AuthedLayout from "@/components/admin/AuthedLayout";
import GeneratorSettingsClient from "@/components/admin/GeneratorSettingsClient";
import EmbeddingSettingsClient from "@/components/admin/EmbeddingSettingsClient";
import RetrievalSettingsClient from "@/components/admin/RetrievalSettingsClient";
import { getGeneratorConfig, getEmbeddingConfig, getRetrievalConfig } from "@/config/settings";
import type { GeneratorConfig } from "@/generation/types";
import type { EmbeddingConfig } from "@/retrieval/embedding";

export default async function SettingsPage() {
  const [generatorConfig, embeddingConfig, retrievalConfig] = await Promise.all([
    getGeneratorConfig() as Promise<GeneratorConfig>,
    getEmbeddingConfig() as Promise<EmbeddingConfig>,
    getRetrievalConfig(),
  ]);

  const env = {
    geminiKeyPresent: !!process.env.GOOGLE_API_KEY,
    replicateKeyPresent: !!process.env.REPLICATE_API_TOKEN,
  };

  return (
    <AuthedLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--text-primary)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--text-primary)" }}>
              settings
            </span>
            Pengaturan AI Chatbot (LLM, Embedding & Retrieval)
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Kelola provider LLM (Generator Jawaban), Embedding Model (Vector Retrieval), dan Strategi Retrieval chatbot.
          </p>
        </div>

        {/* Section Embedding Settings */}
        <EmbeddingSettingsClient
          initialConfig={embeddingConfig}
          env={{
            hasGoogleApiKey: env.geminiKeyPresent,
            hasReplicateKey: env.replicateKeyPresent,
          }}
        />

        {/* Section Retrieval Settings (HyDE, nResults, minSimilarity) */}
        <RetrievalSettingsClient initialConfig={retrievalConfig} />

        {/* Section Generator Settings & Test RAG */}
        <GeneratorSettingsClient initialConfig={generatorConfig} env={env} />
      </div>
    </AuthedLayout>
  );
}
