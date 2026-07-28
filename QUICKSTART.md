# Quick Start — Development Lokal

Panduan cepat untuk menjalankan proyek di komputer lokal.

## Prasyarat

- [x] Node.js 20+ sudah terinstall
- [x] Python + pip sudah terinstall
- [x] chromadb sudah terinstall (`pip install chromadb`)

## Langkah Setup (sekali saja)

### 1. Install Dependencies

```powershell
npm install
```

### 2. Konfigurasi Environment

Salin `.env.local.example` → `.env.local`, lalu isi semua variabel:

```env
GOOGLE_API_KEY=your_actual_key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
ADMIN_JWT_SECRET=xxx
CHROMA_URL=http://[::1]:8000
TELEGRAM_BOT_TOKEN=xxx
```

**Generate JWT Secret:**
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Setup Database Supabase

1. Buka Dashboard Supabase → SQL Editor
2. Paste isi file `supabase/schema.sql`
3. Klik **Run**

## Cara Menjalankan (setiap kali development)

**Buka 2 terminal terpisah:**

### Terminal 1 — ChromaDB Server

```powershell
# Pakai path penuh kalau 'chroma' belum dikenal:
C:\Users\aryad\AppData\Local\Python\pythoncore-3.14-64\Scripts\chroma.exe run --path ./chroma_db --port 8000

# Atau kalau sudah di PATH (buka terminal baru setelah PATH diupdate):
chroma run --path ./chroma_db --port 8000
```

Output yang benar:
```
INFO: Started server process [xxxxx]
INFO: Waiting for application startup.
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

**Biarkan terminal ini tetap berjalan.**

### Terminal 2 — Next.js Development

```powershell
npm run dev
```

Output yang benar:
```
▲ Next.js 15.3.4
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

### Terminal 3 — Telegram Bot (LONG POLLING MODE)

> ⚠️ **PENTING:** Untuk development LOKAL, Telegram BISA mengirim update ke localhost hanya
> kalau kita pakai **LONG POLLING** (bukan Webhook). Webhook hanya bisa untuk URL HTTPS publik.
> Gunakan Terminal 3 ini untuk mode dev lokal.

```powershell
# Pastikan ChromaDB (Terminal 1) & Next.js (Terminal 2) sudah jalan.
# Lalu jalankan bot polling:
npm run bot
```

Output yang benar:
```
✅ Webhook lama sudah dibersihkan (jika ada).

🤖 Telegram Bot (LONG POLLING MODE)
   ===================================
   Provider LLM  : baca dari Supabase app_settings
   ChromaDB URL  : http://[::1]:8000
   Bot token     : 123456:...ABCD

⏳ Menunggu pesan Telegram... (Ctrl+C untuk berhenti)
```

**Setelah bot online, kirim `/start` ke bot Telegrammu — pasti ada balasan! 🎉**

## Upload Dokumen Pertama Kali

**Buka terminal ke-4** (ChromaDB, Next.js, dan Bot polling tetap berjalan):

```powershell
# Taruh file .txt dokumen pariwisata ke:
# src/scripts/data/wisata-alam.txt (atau file lain)

# Jalankan ingesti:
npm run ingest
```

Output yang benar:
```
✅ Environment variables valid.
✅ Embedding API OK (dimensi: 3072)
✅ ChromaDB OK (http://localhost:8000)
📂 Menemukan 1 file dokumen:
   - wisata-alam.txt (1432 karakter)
📄 Memproses: wisata-alam.txt
   ✂️  1 parent chunks
   📌 Parent 1/1 → 7 child chunks
   🔢 Batch 1/1 (7 chunks)...
   💾 Menyimpan 7 chunks ke ChromaDB...
   ✅ Selesai: 1 parent, 7 child (2.5s)
✅ INGESTI SELESAI
```

## Akses Admin Panel

Buka browser: **http://localhost:3000/admin**

Login:
- Email: `admin@pariwisata-palangkaraya.id`
- Password: `admin123`

**Ganti password segera setelah login pertama!**

## Troubleshooting

### Error: "ECONNREFUSED 127.0.0.1:8000"
ChromaDB belum berjalan. Pastikan Terminal 1 menjalankan `chroma run`.

### Error: "chroma: The term 'chroma' is not recognized"
PATH belum diupdate. Gunakan path penuh:
```
C:\Users\aryad\AppData\Local\Python\pythoncore-3.14-64\Scripts\chroma.exe
```

### Error: "Node.js 20 detected without native WebSocket support"
Sudah diperbaiki. Pastikan kamu pull kode terbaru:
```powershell
git pull
npm install
```

### Error: "GOOGLE_API_KEY tidak valid"
Cek API key di `.env.local`. Pastikan tidak ada spasi atau quote berlebih.

## Reuse Data ChromaDB dari Proyek Python

Kalau kamu sudah punya folder `chroma_db` dari proyek Python sebelumnya:

```powershell
# Arahkan ChromaDB server ke folder lama:
chroma run --path "D:\path\ke\proyek\python\chroma_db" --port 8000
```

Semua collection dan data akan langsung terbaca.
