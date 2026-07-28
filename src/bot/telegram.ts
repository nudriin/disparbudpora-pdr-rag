import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { retrieveParentDocuments } from "../retrieval/retriever";
import { generateAnswer } from "../generation/generator";
import { getSupabaseAdmin } from "../lib/supabase/client";
import { getGeneratorConfig } from "../config/settings";

// ============================================================
// INISIALISASI BOT
// Bot diinisialisasi di luar handler agar tidak membuat instance
// baru di setiap request (cold start optimization).
// ============================================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN tidak ditemukan!");
}

export const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

// ============================================================
// HANDLER PESAN TEKS
// ============================================================
if (bot) {
  bot.on(message("text"), async (ctx) => {
    const startTime = Date.now();
    const userMessage = ctx.message.text;
    const chatId = ctx.message.chat.id;
    const username = ctx.message.from.username ?? null;
    const senderName =
      [ctx.message.from.first_name, ctx.message.from.last_name]
        .filter(Boolean)
        .join(" ") || null;

    // Kirim indikator "sedang mengetik..."
    await ctx.sendChatAction("typing");

    let answer = "Maaf, terjadi kesalahan. Silakan coba lagi.";
    let wasAnswered = false;
    let retrievedContext: Record<string, unknown>[] = [];

    try {
      // 0. Baca konfigurasi generator dari DB (setting admin panel)
      const generatorConfig = await getGeneratorConfig();

      // 1. Retrieval: cari parent documents yang relevan di ChromaDB
      const results = await retrieveParentDocuments(userMessage, {
        nResults: 5,
        minSimilarity: 0.4,
      });

      // 2. Generation: hasilkan jawaban dari LLM (pakai config live dari admin!)
      const generation = await generateAnswer(userMessage, results, generatorConfig);
      answer = generation.answer;
      wasAnswered = generation.wasAnswered;
      retrievedContext = [
        {
          provider: generation.provider,
          model: generation.model,
        },
        ...generation.context.map((r) => ({
          source: r.source,
          similarity: r.similarity,
          snippet: r.parentContent.substring(0, 200) + "...",
        })),
      ] as Record<string, unknown>[];

    } catch (err) {
      console.error("[Telegram Webhook] RAG pipeline error:", err);
      answer =
        "Maaf, sistem sedang mengalami gangguan teknis. " +
        "Silakan coba lagi dalam beberapa saat. 🙏";
    }

    const responseTimeMs = Date.now() - startTime;

    // 3. Kirim jawaban ke Telegram
    await ctx.reply(answer, { parse_mode: "Markdown" });

    // 4. Log percakapan ke Supabase (async, tidak memblokir response)
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("conversation_history").insert({
        telegram_chat_id: chatId,
        telegram_username: username,
        sender_name: senderName,
        user_message: userMessage,
        bot_response: answer,
        retrieved_context: retrievedContext as Record<string, unknown>[],
        was_answered: wasAnswered,
        response_time_ms: responseTimeMs,
      });
    } catch (logErr) {
      // Log error tidak boleh menggagalkan response
      console.error("[Telegram Webhook] Failed to log conversation:", logErr);
    }
  });

  // Handler untuk command /start
  bot.start((ctx) => {
    ctx.reply(
      "👋 Halo! Saya adalah asisten virtual pariwisata Kota Palangka Raya.\n\n" +
      "Saya dapat membantu Anda dengan informasi tentang:\n" +
      "🏞️ Destinasi wisata\n" +
      "🎭 Wisata budaya & religi\n" +
      "🌿 Wisata alam\n" +
      "📍 Lokasi dan akses\n\n" +
      "Silakan ajukan pertanyaan Anda! 😊"
    );
  });

  // Handler untuk command /help
  bot.help((ctx) => {
    ctx.reply(
      "💡 *Cara Menggunakan Bot*\n\n" +
      "Kirimkan pertanyaan Anda tentang pariwisata Kota Palangka Raya " +
      "dan saya akan menjawab berdasarkan informasi resmi dari " +
      "Disparbudpora Kota Palangka Raya.\n\n" +
      "*Contoh pertanyaan:*\n" +
      "• Apa saja wisata alam di Palangka Raya?\n" +
      "• Bagaimana cara menuju Danau Tahai?\n" +
      "• Apa saja kuliner khas Palangka Raya?\n\n" +
      "⚠️ Catatan: Saya hanya dapat menjawab pertanyaan seputar " +
      "pariwisata Kota Palangka Raya.",
      { parse_mode: "Markdown" }
    );
  });
}