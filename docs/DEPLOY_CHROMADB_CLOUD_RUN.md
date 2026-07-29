# Panduan Deploy ChromaDB ke Google Cloud Run + Vercel Backend

Dokumen ini berisi panduan langkah-demi-langkah mendeploy **ChromaDB Vector Database** ke **Google Cloud Run** menggunakan persistent volume / Cloud Storage, dan menyambungkannya dengan **Next.js Backend** yang dideploy di **Vercel**.

---

## 🏛️ Arsitektur Hybrid (Vercel + Google Cloud Run)

```
                     ┌───────────────────────────────┐
                     │   Telegram User / Browser     │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │     Vercel Serverless         │
                     │  (Next.js App & Admin Panel)  │
                     └───────┬───────────────┬───────┘
                             │               │
            ┌────────────────┘               └────────────────┐
            ▼                                                 ▼
┌───────────────────────┐                         ┌───────────────────────┐
│ Google Cloud Run      │                         │ Supabase PostgreSQL   │
│ (ChromaDB Vector DB)  │                         │ (History & Metadata)  │
└───────────┬───────────┘                         └───────────────────────┘
            │
            ▼
┌───────────────────────┐
│ Cloud Storage Bucket  │
│ (Persist Vektor Data) │
└───────────────────────┘
```

---

## 📋 Prasyarat

- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) terinstall & terautentikasi
- Project Google Cloud aktif dengan Billing terhubung
- Akun Vercel terhubung ke Repository Github project

---

## 🚀 Langkah 1: Autentikasi Google Cloud & Set Project

Buka **Terminal** atau **Google Cloud Shell**, lalu jalankan perintah berikut:

```bash
# Login ke akun Google Cloud
gcloud auth login

# Set ID Project Google Cloud Anda (ganti YOUR_GCP_PROJECT_ID)
gcloud config set project YOUR_GCP_PROJECT_ID

# Aktifkan service API yang diperlukan
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 📦 Langkah 2: Buat Cloud Storage Bucket untuk Data Vektor

Agar data embedding vektor **tidak hilang** saat container Cloud Run mati atau restart (*Scale to 0*), kita perlu membuat bucket penyimpanan Cloud Storage:

```bash
# Buat bucket penyimpanan (ganti nama bucket dengan nama unik Anda)
gcloud storage buckets create gs://chromadb-data-pdr --location=asia-southeast2
```

---

## 🛠️ Langkah 3: Deploy Service ChromaDB ke Google Cloud Run

Gunakan image resmi Docker `chromadb/chroma:latest` dan pasang (*mount*) Cloud Storage Bucket yang telah dibuat ke folder data ChromaDB:

```bash
gcloud run deploy chromadb-service \
  --image=chromadb/chroma:latest \
  --region=asia-southeast2 \
  --execution-environment=gen2 \
  --port=8000 \
  --memory=2Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --allow-unauthenticated \
  --add-volume=name=chroma-storage,type=cloud-storage,bucket=chromadb-data-pdr \
  --add-volume-mount=volume=chroma-storage,mount-path=/chroma/chroma \
  --set-env-vars="IS_PERSISTENT=TRUE,ANONYMIZED_TELEMETRY=FALSE,PERSIST_DIRECTORY=/chroma/chroma"
```

### 💡 Penjelasan Parameter:
- `--allow-unauthenticated`: Mengizinkan Vercel API Route mengirim kueri HTTP REST ke ChromaDB.
- `--add-volume` & `--mount-volume`: Menghubungkan Google Cloud Storage ke folder `/chroma/chroma`.
- `--memory=2Gi`: Memastikan RAM cukup untuk pencarian semantik vektor multidimensi.

---

## 🔗 Langkah 4: Dapatkan URL HTTP Cloud Run

Setelah proses deploy selesai, Cloud Run akan memberikan URL publik Service:

```bash
# Ambil URL publik ChromaDB Cloud Run
gcloud run services describe chromadb-service \
  --region=asia-southeast2 \
  --format="value(status.url)"
```

**Output contoh:**
`https://chromadb-service-xxxxxx-et.a.run.app`

---

## ⚡ Langkah 5: Set Environment Variable di Vercel

1. Masuk ke **Dashboard Vercel** ➔ Buka project Next.js Anda.
2. Navigasi ke **Settings** ➔ **Environment Variables**.
3. Tambahkan variabel baru:
   - **Key**: `CHROMA_URL`
   - **Value**: `https://chromadb-service-xxxxxx-et.a.run.app` (sesuai URL Langkah 4)
4. Simpan (**Save**) dan jalankan **Redeploy** pada project Vercel Anda.

---

## 📥 Langkah 6: Jalankan Ingest Dokumen (Populate Vektor Data)

Dari komputer lokal Anda, masukkan URL ChromaDB Cloud Run ke file `.env` lokal:

```env
CHROMA_URL=https://chromadb-service-xxxxxx-et.a.run.app
```

Jalankan skrip ingest untuk mengisi database vektor di Cloud Run:

```bash
npm run ingest
```

Data Parent & Child Chunk dokumen pariwisata akan terkirim ke Cloud Run dan otomatis tersimpan permanen di Cloud Storage Bucket!
