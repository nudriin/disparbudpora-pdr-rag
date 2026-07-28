import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/bot/telegram";

// ============================================================
// ENDPOINT POST — menerima update dari Telegram
// ============================================================
export async function POST(request: NextRequest) {
  if (!bot) {
    return NextResponse.json(
      { error: "Bot not configured" },
      { status: 500 }
    );
  }

  try {
    const update = await request.json();
    await bot.handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook] Error handling update:", err);
    // Selalu kembalikan 200 ke Telegram agar tidak di-retry terus
    return NextResponse.json({ ok: true });
  }
}

// ============================================================
// ENDPOINT GET — untuk verifikasi webhook (opsional)
// ============================================================
export async function GET() {
  return NextResponse.json({
    status: "Telegram webhook aktif",
    bot: bot ? "configured" : "not configured",
  });
}

// ============================================================
// CARA MENDAFTARKAN WEBHOOK KE TELEGRAM
// ============================================================
// Setelah deploy ke Cloud Run, jalankan perintah berikut SATU KALI
// untuk mendaftarkan URL webhook ke Telegram API:
//
//   curl -X POST \
//     "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
//     -H "Content-Type: application/json" \
//     -d '{"url": "https://<CLOUD_RUN_URL>/api/telegram-webhook"}'
//
// Untuk memeriksa status webhook:
//   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
//
// Untuk menghapus webhook (kembali ke long polling):
//   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/deleteWebhook"
// ============================================================
