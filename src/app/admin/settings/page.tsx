import AuthedLayout from "@/components/admin/AuthedLayout";
import GeneratorSettingsClient from "@/components/admin/GeneratorSettingsClient";
import { getGeneratorConfig } from "@/config/settings";
import type { GeneratorConfig } from "@/generation/types";

export default async function SettingsPage() {
  const config = (await getGeneratorConfig()) as GeneratorConfig;
  const env = {
    geminiKeyPresent: !!process.env.GOOGLE_API_KEY,
    replicateKeyPresent: !!process.env.REPLICATE_API_TOKEN,
  };

  return (
    <AuthedLayout>
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1a202c", marginBottom: "0.5rem" }}>
        ⚙️ Pengaturan Generator LLM
      </h1>
      <p style={{ color: "#718096", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Kelola provider dan model AI yang digunakan untuk menghasilkan jawaban chatbot.
      </p>
      <GeneratorSettingsClient initialConfig={config} env={env} />
    </div>
    </AuthedLayout>
  );
}
