import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: menghasilkan folder .next/standalone yang berisi
  // server.js minimal — ideal untuk Docker & Cloud Run karena ukuran image kecil
  output: "standalone",

  // Paket LangChain & ChromaDB berjalan di server-side Node.js,
  // bukan di edge runtime. Daftar ini mencegah Next.js mencoba mem-bundle
  // mereka untuk browser.
  serverExternalPackages: [
    "langchain",
    "@langchain/core",
    "@langchain/community",
    "@langchain/google-genai",
    "chromadb",
    "telegraf",
    "bcryptjs",
  ],
};

export default nextConfig;
