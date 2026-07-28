import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { retrieveParentDocuments } from "../retrieval/retriever";
import { generateAnswer, reformulateQuery } from "../generation/generator";
import { getSupabaseAdmin } from "../lib/supabase/client";
import { getGeneratorConfig, getEmbeddingConfig } from "../config/settings";
import { getRecentChatHistory, formatChatHistory } from "../lib/supabase/historyHelper";
import { POPULAR_SUGGESTIONS, getFollowUpSuggestions } from "./suggestions";

// ============================================================
// INISIALISASI BOT & SUGGESTION KEYBOARDS
// ============================================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN tidak ditemukan!");
}

export const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

// Persistent Keyboard (Tombol Bawah Chat Input)
const popularKeyboard = Markup.keyboard([
  ["🌿 Wisata Alam", "👨‍💼 Pemandu Wisata"],
  ["🏕️ Nyaru Menteng", "🍲 Kuliner & Souvenir"],
]).resize();

// Map temporary memori untuk callback action id -> teks pertanyaan
const suggestionMap = new Map<string, string>();

/**
 * Helper RAG Pipeline untuk memproses pertanyaan pengguna
 */
async function processQuestion(
  ctx: any,
  rawMessageText: string,
  chatId: number,
  senderName: string | null,
  username: string | null
) {
  const startTime = Date.now();

  // 0. Cek apakah pesan merupakan tombol saran popular
  const matchedPreset = POPULAR_SUGGESTIONS.find(
    (s) => s.label === rawMessageText || s.text === rawMessageText
  );
  const userMessage = matchedPreset ? matchedPreset.text : rawMessageText;

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

  // Indikator "typing..."
  const typingInterval = setInterval(() => {
    ctx.sendChatAction("typing").catch(() => void 0);
  }, 5000);

  try {
    // 0a. Baca konfigurasi generator & embedding dari DB
    const generatorConfig = await getGeneratorConfig();
    const embeddingConfig = await getEmbeddingConfig();
    providerUsed = generatorConfig.provider;
    modelUsed = generatorConfig.model;
    console.log(`   ⚙️  Provider LLM: ${providerUsed} | Model: ${modelUsed}`);
    console.log(`   🧬 Embedding   : ${embeddingConfig.provider} | ${embeddingConfig.model} (dim=${embeddingConfig.dimensions})`);

    // 0b. Ambil 5 riwayat percakapan terakhir dari Supabase
    const rawHistory = await getRecentChatHistory(chatId, 5);
    const chatHistoryFormatted = formatChatHistory(rawHistory);
    if (rawHistory.length > 0) {
      console.log(`   📜 Memori percakapan dimuat: ${rawHistory.length} pasang obrolan terakhir`);
    }

    // 0c. Conversational Query Reformulation
    let searchQuery = userMessage;
    if (rawHistory.length > 0) {
      searchQuery = await reformulateQuery(userMessage, chatHistoryFormatted, generatorConfig);
      if (searchQuery !== userMessage) {
        console.log(`   🔄 Kueri direformulasi: "${userMessage}" ➔ "${searchQuery}"`);
      }
    }

    // 1. Retrieval di ChromaDB
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

    // 2. Generation LLM
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

  // Formulasi 3 saran pertanyaan turunan (Inline Suggestion Buttons)
  const followUps = getFollowUpSuggestions(userMessage, answer);
  const inlineButtons = Markup.inlineKeyboard(
    followUps.map((item, idx) => {
      const actionId = `sug_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`;
      suggestionMap.set(actionId, item.text);
      return [Markup.button.callback(item.label, actionId)];
    })
  );

  // 3. Kirim jawaban ke Telegram dengan Inline Suggestion Buttons
  let replySent = false;
  try {
    await ctx.reply(answer, { parse_mode: "Markdown", ...inlineButtons });
    replySent = true;
    console.log(`   📨 Jawaban & Suggestion Buttons terkirim (Markdown).`);
  } catch (mdErr) {
    console.warn(`   ⚠️  Gagal kirim dengan Markdown: ${(mdErr as Error).message}`);
    try {
      await ctx.reply(answer, inlineButtons);
      replySent = true;
      console.log(`   📨 Jawaban & Suggestion Buttons terkirim (Plain text).`);
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
      if (insertError.code === "PGRST204") {
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
        await supabase.from("conversation_history").insert(fallbackPayload);
      }
    } else {
      console.log(`   ✅ Log percakapan berhasil disimpan ke Supabase.`);
    }
  } catch (logErr) {
    console.error(`   ⚠️  Gagal log ke Supabase: ${(logErr as Error).message}`);
  }
}

// ============================================================
// REGISTRASI HANDLER TELEGRAF
// ============================================================
if (bot) {
  bot.catch((err, ctx) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n🛑 [TELEGRAF HANDLER ERROR — GLOBAL CATCH]");
    const safeChatId = ctx?.chat?.id;
    if (safeChatId) {
      ctx
        .reply("⚠️ Maaf, terjadi kesalahan tak terduga. Silakan coba lagi nanti.", popularKeyboard)
        .catch(() => void 0);
    }
  });

  // Handler /start
  bot.start(async (ctx) => {
    console.log(`\n🚀 /start dari ${ctx.message.from.first_name} (chat ${ctx.chat.id})`);
    await ctx.reply(
      "👋 Selamat datang di Bot Pariwisata Kota Palangka Raya!\n\n" +
      "Saya dapat membantu Anda dengan informasi mengenai:\n" +
      "🏞️ Destinasi Wisata Alam\n" +
      "👨‍💼 Pemandu Wisata Resmi\n" +
      "🏕️ Bumi Perkemahan Nyaru Menteng\n" +
      "🍲 Kuliner Khas & Oleh-oleh\n\n" +
      "💡 *Silakan klik salah satu saran pertanyaan di bawah ini atau ketik pertanyaan Anda:*",
      {
        parse_mode: "Markdown",
        ...popularKeyboard,
      }
    );
  });

  // Handler /menu
  bot.command("menu", async (ctx) => {
    await ctx.reply("💡 *Menu Saran Pertanyaan Populer:*", {
      parse_mode: "Markdown",
      ...popularKeyboard,
    });
  });

  // Handler /help
  bot.help(async (ctx) => {
    const helpText =
      "💡 *Cara Menggunakan Bot Pariwisata*\n\n" +
      "Kirimkan pertanyaan Anda tentang pariwisata Kota Palangka Raya, " +
      "atau gunakan tombol saran pertanyaan di bawah untuk bertanya secara instan.\n\n" +
      "*Perintah Tersedia:*\n" +
      "• `/start` - Menampilkan ucapan selamat datang & tombol saran\n" +
      "• `/menu` - Menampilkan papan tombol saran pertanyaan populer\n" +
      "• `/help` - Petunjuk penggunaan bot";

    try {
      await ctx.reply(helpText, { parse_mode: "Markdown", ...popularKeyboard });
    } catch {
      await ctx.reply(helpText.replace(/\*/g, ""), popularKeyboard);
    }
  });

  // Handler Callback Query untuk Inline Suggestion Buttons
  bot.action(/^sug_/, async (ctx) => {
    const actionId = ctx.match.input;
    const questionText = suggestionMap.get(actionId);
    await ctx.answerCbQuery();

    if (questionText && ctx.chat?.id) {
      console.log(`\n🔘 [Inline Suggestion Clicked] "${questionText}"`);
      const senderName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ");
      await processQuestion(ctx, questionText, ctx.chat.id, senderName, ctx.from.username ?? null);
    } else {
      await ctx.reply("Silakan ketik pertanyaan Anda secara langsung 😊", popularKeyboard);
    }
  });

  // Handler Pesan Teks
  bot.on(message("text"), async (ctx) => {
    const userMessageText = ctx.message.text;
    const chatId = ctx.message.chat.id;
    const username = ctx.message.from.username ?? null;
    const senderName =
      [ctx.message.from.first_name, ctx.message.from.last_name]
        .filter(Boolean)
        .join(" ") || null;

    await processQuestion(ctx, userMessageText, chatId, senderName, username);
  });
}