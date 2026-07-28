import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { retrieveParentDocuments } from "../retrieval/retriever";
import { generateAnswer, reformulateQuery } from "../generation/generator";
import { getSupabaseAdmin } from "../lib/supabase/client";
import { getGeneratorConfig, getEmbeddingConfig } from "../config/settings";
import { getRecentChatHistory, formatChatHistory } from "../lib/supabase/historyHelper";

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
// REGISTRASI HANDLER — URUTAN PENTING!
//   1) bot.start() & bot.help()  → HARUS DIDAHULUKAN
//   2) bot.on(message("text"))   → menangkap SISA pesan (pertanyaan RAG)
//   Kalau terbalik, /start masuk ke handler teks dan malah menjalani
//   RAG retrieval + generation yang akhirnya timeout.
// ============================================================
if (bot) {

  // ==========================================================
  // GLOBAL ERROR HANDLER — JANGAN SAMPAI 1 PESAN MATIKAN BOT!
  // Telegraf default jika handler throw uncaught dan timeout
  // → membunuh seluruh proses. Kita catch disini agar bot
  // bisa melanjutkan memproses pesan lain.
  // ==========================================================
  bot.catch((err, ctx) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n🛑 [TELEGRAF HANDLER ERROR — GLOBAL CATCH]");
    console.error(`   Update type: ${ctx.updateType}`);
    console.error(`   Message    : ${msg}`);
    if (err instanceof Error && err.stack) {
      console.error("   Stack:", err.stack.split("\n").slice(0, 5).join("\n"));
    }

    // Coba kirim notifikasi ke pengguna jika masih punya chat konteks
    const safeChatId = ctx?.chat?.id;
    if (safeChatId) {
      ctx
        .reply(
          "⚠️ Maaf, terjadi kesalahan tak terduga saat memproses pesan Anda.\n" +
          "Silakan coba beberapa saat lagi 🙏\n\n" +
          `_Detail: ${msg.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")}_`,
          { parse_mode: "MarkdownV2" }
        )
        .catch(() => {
          // Fallback tanpa markdown jika MarkdownV2 juga error
          return ctx
            .reply("⚠️ Maaf, terjadi kesalahan tak terduga. Silakan coba lagi nanti.")
            .catch(() => void 0);
        })
        .catch(() => void 0);
    }
  });

  // ==========================================================
  // HANDLER /start — urutan ke-1 (JANGAN setelah on('text)!)
  // ==========================================================
  bot.start(async (ctx) => {
    console.log(`\n🚀 /start dari ${ctx.message.from.first_name} (chat ${ctx.chat.id})`);
    await ctx.reply(
      "👋 Halo! Saya adalah asisten virtual pariwisata Kota Palangka Raya.\n\n" +
      "Saya dapat membantu Anda dengan informasi tentang:\n" +
      "🏞️ Destinasi wisata\n" +
      "🎭 Wisata budaya & religi\n" +
      "🌿 Wisata alam\n" +
      "📍 Lokasi dan akses\n\n" +
      "Silakan ajukan pertanyaan Anda! 😊"
    );
  });

  // ==========================================================
  // HANDLER /help — urutan ke-2
  // ==========================================================
  bot.help(async (ctx) => {
    console.log(`\n❓ /help dari ${ctx.message.from.first_name} (chat ${ctx.chat.id})`);
    const helpText =
      "💡 *Cara Menggunakan Bot*\n\n" +
      "Kirimkan pertanyaan Anda tentang pariwisata Kota Palangka Raya " +
      "dan saya akan menjawab berdasarkan informasi resmi dari " +
      "Disparbudpora Kota Palangka Raya.\n\n" +
      "*Contoh pertanyaan:*\n" +
      "• Apa saja wisata alam di Palangka Raya?\n" +
      "• Bagaimana cara menuju Danau Tahai?\n" +
      "• Apa saja kuliner khas Palangka Raya?\n\n" +
      "⚠️ Catatan: Saya hanya dapat menjawab pertanyaan seputar " +
      "pariwisata Kota Palangka Raya.";

    try {
      await ctx.reply(helpText, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply(helpText.replace(/\*/g, ""));
    }
  });

  // ==========================================================
  // HANDLER PESAN TEKS (PERTANYAAN RAG) — urutan TERAKHIR.
  // Menangkap SEMUA pesan teks yang BUKAN /start & /help.
  // ==========================================================
  bot.on(message("text"), async (ctx) => {
    const startTime = Date.now();
    const userMessage = ctx.message.text;
    const chatId = ctx.message.chat.id;
    const username = ctx.message.from.username ?? null;
    const senderName =
      [ctx.message.from.first_name, ctx.message.from.last_name]
        .filter(Boolean)
        .join(" ") || null;

    // LOG INCOMING MESSAGE
    console.log(`\n📨 [${new Date().toLocaleTimeString("id-ID")}] Pesan baru`);
    console.log(`   Dari : ${senderName ?? "Anonim"} (@${username ?? "-"})`);
    console.log(`   Chat : ${chatId}`);
    console.log(`   Teks : ${userMessage.slice(0, 120)}${userMessage.length > 120 ? "..." : ""}`);

    let answer = "Maaf, terjadi kesalahan. Silakan coba lagi.";
    let wasAnswered = false;
    let retrievedContext: Record<string, unknown>[] = [];
    let providerUsed = "-";
    let modelUsed = "-";

    // Kirim indikator "sedang mengetik..." segera (tanpa nunggu retrieval)
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => void 0);
    }, 5000);

    try {
      // 0. Baca konfigurasi generator & embedding dari DB (setting admin panel)
      const generatorConfig = await getGeneratorConfig();
      const embeddingConfig = await getEmbeddingConfig();
      providerUsed = generatorConfig.provider;
      modelUsed = generatorConfig.model;
      console.log(`   ⚙️  Provider LLM: ${providerUsed} | Model: ${modelUsed}`);
      console.log(`   🧬 Embedding   : ${embeddingConfig.provider} | ${embeddingConfig.model} (dim=${embeddingConfig.dimensions})`);

      // 0b. Ambil 5 riwayat percakapan terakhir pengguna dari Supabase
      const rawHistory = await getRecentChatHistory(chatId, 5);
      const chatHistoryFormatted = formatChatHistory(rawHistory);
      if (rawHistory.length > 0) {
        console.log(`   📜 Memori percakapan dimuat: ${rawHistory.length} pasang obrolan terakhir`);
      }

      // 0c. Conversational Query Reformulation (Contextualization)
      //     Jika ada riwayat, ubah kata ganti ambigu ("datanya", "lokasinya") menjadi kueri eksplisit
      let searchQuery = userMessage;
      if (rawHistory.length > 0) {
        searchQuery = await reformulateQuery(userMessage, chatHistoryFormatted, generatorConfig);
        if (searchQuery !== userMessage) {
          console.log(`   🔄 Kueri direformulasi: "${userMessage}" ➔ "${searchQuery}"`);
        }
      }

      // 1. Retrieval: cari parent documents di ChromaDB menggunakan searchQuery
      console.log(`   🔎 Retrieval dimuat (${searchQuery === userMessage ? "kueri asli" : "kueri reformulasi"})...`);
      const results = await Promise.race([
        retrieveParentDocuments(searchQuery, {
          nResults: 5,
          minSimilarity: 0.4,
          embeddingConfig,
        }),
        new Promise<never>((_, rej) =>
          setTimeout(
            () => rej(new Error("Retrieval timeout (ChromaDB/Embed lambat — coba test-retrieval.ts diagnosis)")),
            120000
          )
        ),
      ]);
      console.log(`   ✅ Retrieval selesai: ${results.length} konteks ditemukan`);

      // 2. Generation: hasilkan jawaban dari LLM dengan menyertakan Konteks + Memory History
      console.log(`   🧠 Generation dimuat...`);
      const generation = await Promise.race([
        generateAnswer(userMessage, results, generatorConfig, chatHistoryFormatted),
        new Promise<never>((_, rej) =>
          setTimeout(
            () => rej(new Error("Generation timeout (LLM lambat — coba model 8B / ganti ke Gemini)")),
            120000
          )
        ),
      ]);
      answer = generation.answer;
      wasAnswered = generation.wasAnswered;
      providerUsed = generation.provider;
      modelUsed = generation.model;
      retrievedContext = [
        {
          provider: generation.provider,
          model: generation.model,
        },
        ...generation.context.map((r) => ({
          source: r.source,
          similarity: r.similarity,
          parentId: r.parentId ?? null,
          childId: r.childId ?? null,
          parentContent: r.parentContent,
          childContent: r.childContent,
          snippet: r.parentContent.substring(0, 200) + "...",
        })),
      ] as Record<string, unknown>[];
      console.log(
        `   ✅ Generation selesai. Jawaban: ${answer.length} karakter ` +
        `(${generation.wasAnswered ? "✅ Terjawab" : "❌ Tidak ada info"})`
      );

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ [RAG Pipeline ERROR]: ${msg}`);
      if (err instanceof Error && err.stack) {
        console.error("   Stack:", err.stack.split("\n").slice(0, 4).join("\n"));
      }
      answer =
        "Maaf, sistem sedang mengalami gangguan teknis. " +
        "Silakan coba lagi dalam beberapa saat. 🙏\n\n" +
        `_(${msg})_`;
    } finally {
      clearInterval(typingInterval);
    }

    const responseTimeMs = Date.now() - startTime;

    // 3. Kirim jawaban ke Telegram DENGAN FALLBACK.
    let replySent = false;
    try {
      await ctx.reply(answer, { parse_mode: "Markdown" });
      replySent = true;
      console.log(`   📨 Jawaban terkirim (Markdown).`);
    } catch (mdErr) {
      console.warn(`   ⚠️  Gagal kirim dengan Markdown: ${(mdErr as Error).message}`);
      console.warn(`      → Retry dengan plain text tanpa formatting...`);
      try {
        await ctx.reply(answer);
        replySent = true;
        console.log(`   📨 Jawaban terkirim (Plain text).`);
      } catch (plainErr) {
        console.error(`   ❌ GAGAL KIRIM JAWABAN SAMA SEKALI: ${(plainErr as Error).message}`);
      }
    }

    const totalMs = Date.now() - startTime;
    console.log(
      `   ⏱️  Total: ${(totalMs / 1000).toFixed(2)}s ` +
      `(RAG: ${(responseTimeMs / 1000).toFixed(2)}s, ` +
      `Kirim: ${((totalMs - responseTimeMs) / 1000).toFixed(2)}s)`
    );

    // 4. Log percakapan ke Supabase
    try {
      const supabase = getSupabaseAdmin();
      const payload: Record<string, unknown> = {
        telegram_chat_id: chatId,
        telegram_username: username,
        sender_name: senderName,
        user_message: userMessage,
        bot_response: answer,
        retrieved_context: retrievedContext,
        was_answered: wasAnswered,
        response_time_ms: totalMs,
        provider_used: providerUsed,
        model_used: modelUsed,
        reply_sent: replySent,
      };

      const { error: insertError } = await supabase
        .from("conversation_history")
        .insert(payload);

      if (insertError) {
        console.warn(`   ⚠️  Supabase log warning: ${insertError.message}`);
        // Jika error karena kolom baru belum ada di tabel Supabase (PGRST204), retry pakai payload core
        if (insertError.code === "PGRST204") {
          console.log(`   🔄 Retrying log dengan core payload...`);
          const fallbackPayload = {
            telegram_chat_id: chatId,
            telegram_username: username,
            sender_name: senderName,
            user_message: userMessage,
            bot_response: answer,
            retrieved_context: retrievedContext,
            was_answered: wasAnswered,
            response_time_ms: totalMs,
          };
          const { error: fallbackErr } = await supabase
            .from("conversation_history")
            .insert(fallbackPayload);

          if (fallbackErr) {
            console.error(`   ❌ Fallback log error: ${fallbackErr.message}`);
          } else {
            console.log(`   ✅ Log percakapan berhasil disimpan ke Supabase (Fallback).`);
          }
        }
      } else {
        console.log(`   ✅ Log percakapan berhasil disimpan ke Supabase.`);
      }
    } catch (logErr) {
      console.error(`   ⚠️  Gagal log ke Supabase: ${(logErr as Error).message}`);
    }
  });
}