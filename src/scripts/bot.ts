/**
 * ============================================================
 * SKRIP: Telegram Bot — LONG POLLING MODE (Development Lokal)
 * ============================================================
 *
 * Pakai skrip INI JIKA:
 *   - Kamu sedang develop di LOKAL (localhost) tanpa public URL
 *   - Belum deploy ke Cloud Run / VPS yang punya HTTPS URL
 *   - Webhook Telegram tidak bisa menjangkau localhost
 *
 * Skrip ini menjalankan `bot.launch()` (mode long polling):
 *   Bot akan aktif tarik update dari server Telegram setiap ~2 detik,
 *   jadi bisa jalan meskipun komputer lokal tidak punya IP publik.
 *
 * ============================================================
 * CARA PAKAI:
 *   1. Pastikan ChromaDB jalan (terminal 1):
 *        chroma run --path ./chroma_db --port 8000
 *
 *   2. JALANKAN TERMINAL BARU (terminal 3):
 *        npm run bot
 *
 *   3. Buka chat bot Telegrammu → kirim /start atau tanya pertanyaan.
 *
 * CATATAN: Jangan jalankan ini bersamaan dengan webhook aktif di
 *          deploy production! Pilih salah satu: polling (dev) atau
 *          webhook (prod).
 * ============================================================
 */

import * as dotenv from "dotenv";
import * as path from "path";
import ws from "ws";

// Node.js 20 tidak punya native WebSocket — inject 'ws' untuk Supabase Realtime
(globalThis as unknown as { WebSocket: unknown }).WebSocket = ws;

// ⚠️ PENTING: dotenv.config() HARUS SEBELUM import bot (gunakan dynamic import)!
//    Di ESM/tsx, static import DI-HOIST (dijalankan sebelum top-level code),
//    jadi kode `process.env.TELEGRAM_BOT_TOKEN` di telegram.ts keburu dieksekusi
//    sebelum dotenv memuat .env.local. Solusinya: load dotenv dulu, lalu
//    dynamic import di dalam main().
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Hapus static import bot, pakai dynamic import di bawah.

async function main() {
  // Dynamic import — dieksekusi SETELAH dotenv di-load!
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { bot } = await import("../bot/telegram");

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env.local!");
    console.error("   Pastikan file .env.local berada di root proyek.");
    console.error("   Isi dengan format: TELEGRAM_BOT_TOKEN=123456:ABC-xyz...");
    process.exit(1);
  }

  if (!bot) {
    console.error("❌ Gagal menginisialisasi bot instance.");
    process.exit(1);
  }

  // Pastikan webhook tidak aktif (biar update hanya lewat polling)
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    console.log("✅ Webhook lama sudah dibersihkan (jika ada).");
  } catch (err) {
    console.warn("⚠️  Gagal menghapus webhook lama:", (err as Error).message);
  }

  console.log("\n🤖 Telegram Bot (LONG POLLING MODE)");
  console.log("   ===================================");
  console.log(`   Provider LLM  : baca dari Supabase app_settings`);
  console.log(`   ChromaDB URL  : ${process.env.CHROMA_URL}`);
  console.log(`   Bot token     : ${process.env.TELEGRAM_BOT_TOKEN?.slice(0, 6)}...${process.env.TELEGRAM_BOT_TOKEN?.slice(-4)}`);

  // Pre-load embedding model di startup (agar pertanyaan pertama dari user tidak cold start)
  try {
    const { getEmbeddingConfig } = await import("../config/settings");
    const { getEmbeddingModel } = await import("../retrieval/embedding");
    const embConfig = await getEmbeddingConfig();
    console.log(`   🧬 Embedding   : ${embConfig.provider} | ${embConfig.model} (dim=${embConfig.dimensions})`);
    getEmbeddingModel(embConfig);
    console.log(`   ✅ Embedding model ready in cache.`);
  } catch (err) {
    console.warn(`   ⚠️  Pre-load embedding warning: ${(err as Error).message}`);
  }

  console.log("\n⏳ Menunggu pesan Telegram... (Ctrl+C untuk berhenti)\n");

  // Mulai long polling (forever)
  await bot.launch({
    allowedUpdates: ["message", "callback_query", "inline_query"],
    dropPendingUpdates: false,
  });

  // Graceful shutdown untuk SIGINT (Ctrl+C) & SIGTERM
  function stopGracefully(signal: string) {
    console.log(`\n\n🛑 Menerima ${signal}, mematikan bot dengan aman...`);
    bot?.stop(signal);
    console.log("✅ Bot berhasil dimatikan. Sampai jumpa!");
    process.exit(0);
  }
  process.once("SIGINT", () => stopGracefully("SIGINT"));
  process.once("SIGTERM", () => stopGracefully("SIGTERM"));
}

main().catch((err) => {
  console.error("💥 FATAL ERROR saat menjalankan bot:", err);
  process.exit(1);
});
