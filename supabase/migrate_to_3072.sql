-- ================================================================
-- MIGRASI: Ubah dimensi vektor dari 768 ke 3072
-- Jalankan ini di Supabase SQL Editor jika tabel sudah ada
-- ================================================================
-- PERINGATAN: Script ini akan menghapus data di tabel embeddings!
-- Ini wajar karena kamu perlu re-ingest dengan model baru.
-- ================================================================

-- 1. Hapus data embeddings lama (dimensi 768 tidak kompatibel dengan 3072)
TRUNCATE TABLE embeddings;

-- 2. Hapus kolom embedding lama
ALTER TABLE embeddings DROP COLUMN IF EXISTS embedding;

-- 3. Tambah kolom embedding baru dengan dimensi 3072
ALTER TABLE embeddings ADD COLUMN embedding VECTOR(3072);

-- 4. Hapus index lama
DROP INDEX IF EXISTS embeddings_embedding_idx;

-- 5. Buat index HNSW baru dengan dimensi 3072
CREATE INDEX embeddings_embedding_idx
  ON embeddings
  USING hnsw (embedding vector_cosine_ops);

-- 6. Update fungsi match_documents agar pakai dimensi 3072
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding  VECTOR(3072),
  match_threshold  FLOAT  DEFAULT 0.5,
  match_count      INT    DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  parent_id   UUID,
  content     TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.parent_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE
    1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY
    e.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- 7. Buat fungsi insert_embedding (helper untuk skrip ingest.ts)
CREATE OR REPLACE FUNCTION insert_embedding(
  p_parent_id  UUID,
  p_content    TEXT,
  p_embedding  float8[],
  p_metadata   JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO embeddings (parent_id, content, embedding, metadata)
  VALUES (p_parent_id, p_content, p_embedding::vector, p_metadata)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Verifikasi hasil migrasi
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'embeddings' AND column_name = 'embedding';
