# Panduan Deploy ke Google Cloud Run

Panduan lengkap untuk men-deploy **Chatbot Pariwisata Palangka Raya** ke Google Cloud Run menggunakan Docker.

## Arsitektur Production

```
Internet
   │
   ├─── Telegram API ──────────────────────────────┐
   │                                               │
   └─── Browser Admin ────────────────────────────►│
                                                   ▼
                                    ┌──────────────────────────┐
                                    │   Google Cloud Run       │
                                    │   (Next.js App)          │
                                    │                          │
                                    │  /api/telegram-webhook   │
                                    │  /admin (UI Panel)       │
                                    │  /api/admin/*            │
                                    └──────┬───────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
          ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐
          │   Supabase      │   │   ChromaDB        │   │  Google AI API   │
          │  (Auth + Data   │   │  (Vector Store)   │   │  (Gemini LLM +   │
          │   Relasional)   │   │  Cloud Run / VM   │   │   Embedding)     │
          └─────────────────┘   └──────────────────┘   └──────────────────┘
```

## Prasyarat

- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) terinstall
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) terinstall dan berjalan
- Akun Google Cloud dengan billing aktif
- Project Google Cloud sudah dibuat

---

## Langkah 1: Persiapan Google Cloud Project

```bash
# Login ke Google Cloud
gcloud auth login

# Set project aktif (ganti YOUR_PROJECT_ID)
gcloud config set project YOUR_PROJECT_ID

# Aktifkan API yang diperlukan
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Langkah 2: Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Masuk ke **SQL Editor** → paste isi file `supabase/schema.sql` → klik **Run**
3. Catat nilai berikut dari **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Langkah 3: Deploy ChromaDB ke Cloud Run

ChromaDB perlu berjalan sebagai service terpisah. Deploy sebagai Cloud Run service:

```bash
# Deploy ChromaDB sebagai Cloud Run service
gcloud run deploy chromadb \
  --image chromadb/chroma:latest \
  --platform managed \
  --region asia-southeast2 \
  --port 8000 \
  --memory 2Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 3 \
  --no-allow-unauthenticated \
  --set-env-vars="IS_PERSISTENT=TRUE,ANONYMIZED_TELEMETRY=FALSE"
```

> **Catatan:** `--no-allow-unauthenticated` membuat ChromaDB hanya bisa diakses oleh service lain dalam project yang sama menggunakan service account. Catat URL ChromaDB yang dihasilkan.

Dapatkan URL ChromaDB:
```bash
gcloud run services describe chromadb \
  --platform managed \
  --region asia-southeast2 \
  --format "value(status.url)"
```

---

## Langkah 4: Simpan Secrets di Secret Manager

Simpan semua environment variable sensitif di Secret Manager (lebih aman dari env vars biasa):

```bash
# Buat secrets (jalankan satu per satu, ganti nilai dengan yang sebenarnya)

echo -n "your_google_api_key" | \
  gcloud secrets create GOOGLE_API_KEY --data-file=-

echo -n "https://your-project.supabase.co" | \
  gcloud secrets create SUPABASE_URL --data-file=-

echo -n "your_supabase_anon_key" | \
  gcloud secrets create SUPABASE_ANON_KEY --data-file=-

echo -n "your_supabase_service_role_key" | \
  gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-

echo -n "your_telegram_bot_token" | \
  gcloud secrets create TELEGRAM_BOT_TOKEN --data-file=-

# Generate JWT secret yang kuat
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" | \
  gcloud secrets create ADMIN_JWT_SECRET --data-file=-

# URL ChromaDB dari langkah 3
echo -n "https://chromadb-xxx-as.a.run.app" | \
  gcloud secrets create CHROMA_URL --data-file=-
```

---

## Langkah 5: Build dan Push Docker Image

### 5a. Buat Artifact Registry Repository

```bash
gcloud artifacts repositories create chatbot-pariwisata \
  --repository-format docker \
  --location asia-southeast2 \
  --description "Chatbot Pariwisata Palangka Raya"
```

### 5b. Konfigurasi Docker untuk Artifact Registry

```bash
gcloud auth configure-docker asia-southeast2-docker.pkg.dev
```

### 5c. Build dan Push Image

```bash
# Dari direktori root proyek (D:\Nurdin\Skripsi Sheila\program\backend)
# Ganti YOUR_PROJECT_ID dengan project ID aktual

IMAGE="asia-southeast2-docker.pkg.dev/YOUR_PROJECT_ID/chatbot-pariwisata/app:latest"

# Build image
docker build -t $IMAGE .

# Push ke Artifact Registry
docker push $IMAGE
```

---

## Langkah 6: Deploy Aplikasi ke Cloud Run

```bash
# Ganti YOUR_PROJECT_ID dengan project ID aktual
PROJECT_ID="YOUR_PROJECT_ID"
IMAGE="asia-southeast2-docker.pkg.dev/$PROJECT_ID/chatbot-pariwisata/app:latest"
REGION="asia-southeast2"

gcloud run deploy chatbot-pariwisata \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated \
  --set-secrets="GOOGLE_API_KEY=GOOGLE_API_KEY:latest,\
NEXT_PUBLIC_SUPABASE_URL=SUPABASE_URL:latest,\
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY:latest,\
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,\
TELEGRAM_BOT_TOKEN=TELEGRAM_BOT_TOKEN:latest,\
ADMIN_JWT_SECRET=ADMIN_JWT_SECRET:latest,\
CHROMA_URL=CHROMA_URL:latest" \
  --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
```

Setelah deploy selesai, catat URL yang dihasilkan. Formatnya:
```
https://chatbot-pariwisata-xxx-as.a.run.app
```

---

## Langkah 7: Update NEXT_PUBLIC_APP_URL

URL publik perlu diset agar admin panel tahu base URL-nya:

```bash
SERVICE_URL=$(gcloud run services describe chatbot-pariwisata \
  --platform managed \
  --region asia-southeast2 \
  --format "value(status.url)")

# Update env var
gcloud run services update chatbot-pariwisata \
  --platform managed \
  --region asia-southeast2 \
  --set-env-vars="NEXT_PUBLIC_APP_URL=$SERVICE_URL"
```

---

## Langkah 8: Daftarkan Webhook Telegram

Setelah app berjalan, daftarkan webhook ke Telegram API:

```bash
# Ganti nilai di bawah dengan yang sesuai
BOT_TOKEN="your_telegram_bot_token"
CLOUD_RUN_URL="https://chatbot-pariwisata-xxx-as.a.run.app"

# Daftarkan webhook
curl -X POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${CLOUD_RUN_URL}/api/telegram-webhook\"}"

# Verifikasi webhook terdaftar
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

---

## Langkah 9: Upload Dokumen via Admin Panel

1. Buka browser → `https://your-cloud-run-url.a.run.app/admin`
2. Login dengan:
   - Email: `admin@pariwisata-palangkaraya.id`
   - Password: `admin123` (**ganti segera setelah login!**)
3. Masuk ke halaman **Dokumen**
4. Upload file `.txt` dokumen pariwisata
5. Tunggu proses ingesti selesai (status berubah ke ✅ Selesai)

---

## Pengembangan Lokal dengan Docker Compose

Untuk development lokal, gunakan Docker Compose untuk menjalankan ChromaDB dan app sekaligus:

```yaml
# docker-compose.yml (letakkan di root proyek)
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    environment:
      - IS_PERSISTENT=TRUE
      - ANONYMIZED_TELEMETRY=FALSE
    volumes:
      - chroma_data:/chroma/chroma

  app:
    build: .
    ports:
      - "3000:8080"
    env_file:
      - .env.local
    environment:
      - CHROMA_URL=http://chromadb:8000
    depends_on:
      - chromadb

volumes:
  chroma_data:
```

Jalankan:
```bash
docker-compose up -d
```

Atau untuk development lokal **tanpa Docker** (cara paling simpel):
```bash
# Install ChromaDB server via pip (Python harus sudah terinstall)
pip install chromadb

# Terminal 1: Jalankan ChromaDB server
# Ganti path sesuai lokasi folder chroma_db kamu
# Bisa pakai folder baru, atau folder chroma_db dari proyek Python yang sudah ada
chroma run --path ./chroma_db --port 8000

# Terminal 2: Jalankan Next.js
npm run dev
```

> **Catatan:** Jika kamu sudah punya `chroma_db` dari proyek Python (berisi `chroma.sqlite3`),
> arahkan `--path` ke folder tersebut dan semua data lama akan langsung bisa diakses.

---

## Update Aplikasi

Untuk deploy ulang setelah ada perubahan kode:

```bash
PROJECT_ID="YOUR_PROJECT_ID"
IMAGE="asia-southeast2-docker.pkg.dev/$PROJECT_ID/chatbot-pariwisata/app:latest"

# Build ulang
docker build -t $IMAGE .
docker push $IMAGE

# Deploy ulang (Cloud Run otomatis rolling update tanpa downtime)
gcloud run deploy chatbot-pariwisata \
  --image $IMAGE \
  --platform managed \
  --region asia-southeast2
```

---

## Monitoring dan Logs

```bash
# Lihat log real-time
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=chatbot-pariwisata"

# Atau via console
gcloud run services logs read chatbot-pariwisata \
  --platform managed \
  --region asia-southeast2 \
  --limit 50
```

---

## Estimasi Biaya (Asia Southeast 2 / Jakarta)

| Komponen       | Spesifikasi      | Estimasi/bulan     |
|----------------|------------------|--------------------|
| Cloud Run App  | 1 vCPU, 1GB RAM  | ~$5–15 (tergantung traffic) |
| Cloud Run ChromaDB | 1 vCPU, 2GB RAM, min 1 instance | ~$20–30 |
| Artifact Registry | <1 GB storage | ~$0.10 |
| Secret Manager | <10 secrets      | ~$0.06 |
| **Total**      |                  | **~$25–45/bulan**  |

> **Tip hemat:** Set `--min-instances 0` untuk Cloud Run App agar scale-to-zero saat tidak ada traffic. ChromaDB sebaiknya tetap `--min-instances 1` agar tidak cold start.

---

## Troubleshooting

### Error: "ChromaDB tidak dapat dijangkau"
- Pastikan ChromaDB Cloud Run service berjalan: `gcloud run services list`
- Pastikan `CHROMA_URL` env var sudah benar (gunakan URL internal jika dalam VPC, atau URL public jika tidak)

### Error: "GOOGLE_API_KEY tidak valid"
- Cek secret di Secret Manager: `gcloud secrets versions access latest --secret=GOOGLE_API_KEY`
- Pastikan API "Generative Language API" sudah diaktifkan di Cloud Console

### Error: Bot Telegram tidak merespons
- Verifikasi webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Cek log Cloud Run untuk error di `/api/telegram-webhook`
- Pastikan URL webhook menggunakan HTTPS (bukan HTTP)

### Cold Start lambat
- Tambahkan `--min-instances 1` untuk menghindari cold start
- Pertimbangkan menggunakan Cloud Run dengan CPU always-allocated
