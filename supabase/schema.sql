-- ================================================================
-- SCHEMA SQL - Chatbot Pariwisata Palangka Raya
-- Versi 2: Supabase digunakan untuk Auth & Data Relasional
-- Vector Store dipindah ke ChromaDB (di-deploy via Docker/Cloud Run)
-- ================================================================
-- CARA PENGGUNAAN:
-- 1. Buka Dashboard Supabase proyekmu
-- 2. Masuk ke menu "SQL Editor"
-- 3. Paste seluruh isi file ini, lalu klik "Run"
-- ================================================================

-- ================================================================
-- TABEL 1: admin_users
-- Menyimpan akun admin yang bisa login ke panel admin web.
-- Password di-hash menggunakan bcrypt sebelum disimpan.
-- ================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  -- Simpan bcrypt hash, BUKAN plain text password
  password_hash TEXT NOT NULL,
  full_name    TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABEL 2: document_sources
-- Menyimpan metadata file sumber yang telah di-ingest ke ChromaDB.
-- Digunakan untuk menampilkan daftar dokumen di admin panel.
-- ================================================================
CREATE TABLE IF NOT EXISTS document_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       TEXT NOT NULL,
  -- Nama koleksi di ChromaDB yang menyimpan chunk dokumen ini
  chroma_collection TEXT NOT NULL DEFAULT 'palangkaraya_tourism',
  -- Jumlah parent chunks yang dihasilkan dari file ini
  parent_count    INTEGER DEFAULT 0,
  -- Jumlah child chunks (yang memiliki embedding)
  child_count     INTEGER DEFAULT 0,
  -- Status: pending | processing | completed | failed
  status          TEXT NOT NULL DEFAULT 'completed',
  -- Ukuran file dalam bytes
  file_size_bytes BIGINT,
  -- Hash MD5 file untuk deteksi duplikasi
  file_hash       TEXT,
  -- ID admin yang mengupload
  uploaded_by     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABEL 3: app_settings
-- Key-value store untuk menyimpan konfigurasi aplikasi dari admin panel
-- (misal: provider LLM, model name, temperatur, dll).
-- ================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on app_settings"
  ON app_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION trigger_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_app_settings_updated_at();

-- ================================================================
-- TABEL 4: ingestion_jobs
-- Log setiap proses ingesti untuk audit trail dan monitoring.
-- ================================================================
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_source_id UUID REFERENCES document_sources(id) ON DELETE CASCADE,
  -- Status: running | completed | failed
  status           TEXT NOT NULL DEFAULT 'running',
  -- Pesan error jika status = failed
  error_message    TEXT,
  -- Statistik proses
  parents_created  INTEGER DEFAULT 0,
  children_created INTEGER DEFAULT 0,
  -- Durasi proses dalam detik
  duration_seconds FLOAT,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  finished_at      TIMESTAMPTZ
);

-- ================================================================
-- TABEL 4: conversation_history
-- Menyimpan semua percakapan bot Telegram untuk analitik dan audit.
-- ================================================================
CREATE TABLE IF NOT EXISTS conversation_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ID chat Telegram (bisa user atau grup)
  telegram_chat_id BIGINT NOT NULL,
  -- Username Telegram pengirim (opsional, bisa null jika privasi diaktifkan)
  telegram_username TEXT,
  -- Nama tampilan pengirim
  sender_name     TEXT,
  -- Pertanyaan dari pengguna
  user_message    TEXT NOT NULL,
  -- Jawaban dari bot
  bot_response    TEXT,
  -- Konteks (parent documents) yang digunakan untuk generate jawaban
  retrieved_context JSONB,
  -- Apakah pertanyaan berhasil dijawab (false jika di luar konteks)
  was_answered    BOOLEAN DEFAULT true,
  -- Waktu respon dalam milidetik
  response_time_ms INTEGER,
  -- Provider LLM yang digunakan (gemini / replicate)
  provider_used   TEXT,
  -- Nama model LLM yang dipakai (e.g. gemini-2.5-flash, meta/llama-3:ver, dst)
  model_used      TEXT,
  -- Apakah reply TERKIRIM ke Telegram (false = error parse markdown dsb)
  reply_sent      BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEX untuk performa query
-- ================================================================
-- Cari history berdasarkan chat ID (paling sering diquery)
CREATE INDEX IF NOT EXISTS conv_history_chat_id_idx
  ON conversation_history (telegram_chat_id);

-- Urutkan history berdasarkan waktu
CREATE INDEX IF NOT EXISTS conv_history_created_at_idx
  ON conversation_history (created_at DESC);

-- Filter dokumen berdasarkan status
CREATE INDEX IF NOT EXISTS doc_sources_status_idx
  ON document_sources (status);

-- ================================================================
-- FUNGSI: Auto-update kolom updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger ke tabel yang punya kolom updated_at
CREATE TRIGGER trigger_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_document_sources_updated_at
  BEFORE UPDATE ON document_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE admin_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sources     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Semua tabel hanya bisa diakses oleh service_role (backend)
-- Frontend admin panel menggunakan service_role key melalui API route Next.js,
-- BUKAN langsung dari browser (anon key tidak bisa akses tabel ini).

CREATE POLICY "Service role full access on admin_users"
  ON admin_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on document_sources"
  ON document_sources FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on ingestion_jobs"
  ON ingestion_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on conversation_history"
  ON conversation_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ================================================================
-- DATA AWAL: Admin default
-- Password: admin123 (GANTI SEGERA setelah pertama login!)
-- Hash dibuat dengan: bcrypt.hash('admin123', 12)
-- ================================================================
INSERT INTO admin_users (email, password_hash, full_name)
VALUES (
  'admin@pariwisata-palangkaraya.id',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMeSSm8mmfbfwWEj.BmjUeFb5i',
  'Administrator'
) ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- VERIFIKASI: Jalankan query ini untuk memastikan setup berhasil
-- ================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
