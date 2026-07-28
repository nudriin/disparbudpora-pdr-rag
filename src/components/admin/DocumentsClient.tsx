"use client";

import { useState, useRef, useCallback } from "react";

interface DocumentSource {
  id: string;
  file_name: string;
  status: string;
  parent_count: number;
  child_count: number;
  file_size_bytes: number | null;
  created_at: string;
}

interface Props {
  initialDocuments: DocumentSource[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#38a169", processing: "#d69e2e",
  pending: "#718096", failed: "#e53e3e",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "✅ Selesai", processing: "⏳ Proses",
  pending: "🕐 Menunggu", failed: "❌ Gagal",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsClient({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ id: string; fileName: string } | null>(null);
  const [chunksData, setChunksData] = useState<any>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refreshDocuments() {
    const res = await fetch("/api/admin/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
  }

  const handleUpload = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadMsg(null);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    try {
      const res = await fetch("/api/admin/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadMsg({ type: "error", text: data.error ?? "Upload gagal." });
        return;
      }

      setUploadMsg({ type: "success", text: `✅ ${data.message}` });
      if (fileRef.current) fileRef.current.value = "";
      await refreshDocuments();
    } catch {
      setUploadMsg({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setUploading(false);
    }
  }, []);

  async function handleDelete(docId: string, fileName: string) {
    if (!confirm(`Hapus dokumen "${fileName}"? Semua chunk-nya di ChromaDB akan dihapus.`)) return;

    setDeletingId(docId);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Hapus gagal.");
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleResetVector() {
    if (!confirm(
      "⚠️ PERINGATAN: Reset Vector akan menghapus SEMUA data embedding di ChromaDB.\n\n" +
      "Kamu perlu menjalankan ulang proses ingest setelah reset.\n\n" +
      "Lanjutkan?"
    )) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/documents/reset-vector", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Reset gagal.");
        return;
      }
      alert("✅ Vector store berhasil direset. Jalankan ulang ingest untuk mengisi kembali.");
      await refreshDocuments();
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setResetting(false);
    }
  }

  async function handleView(docId: string, fileName: string) {
    setViewingDoc({ id: docId, fileName });
    setLoadingChunks(true);
    setChunksData(null);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`);
      const data = await res.json();
      if (res.ok) {
        setChunksData(data.chunks);
      } else {
        alert(data.error ?? "Gagal mengambil data chunk.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setLoadingChunks(false);
    }
  }

  return (
    <div>
      {/* Upload Form */}
      <div style={{
        background: "white", borderRadius: "12px", padding: "1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)", marginBottom: "1.5rem"
      }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", color: "#2d3748" }}>
          📤 Upload Dokumen Baru
        </h2>
        <form onSubmit={handleUpload}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600",
                color: "#4a5568", marginBottom: "0.4rem" }}>
                File dokumen (.txt, .pdf, .xlsx, .csv)
              </label>
              <input
                type="file"
                ref={fileRef}
                accept=".txt,.pdf,.xlsx,.csv"
                multiple
                required
                style={{
                  width: "100%", padding: "0.5rem", border: "1.5px solid #e2e8f0",
                  borderRadius: "8px", fontSize: "0.9rem", boxSizing: "border-box"
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "#a0aec0", marginTop: "0.3rem" }}>
                Format yang didukung: .txt, .pdf, .xlsx, .csv. Bisa upload beberapa file sekaligus.
              </p>
            </div>
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: "0.65rem 1.5rem", background: uploading ? "#a0aec0" : "#3182ce",
                color: "white", border: "none", borderRadius: "8px", fontWeight: "600",
                cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap"
              }}
            >
              {uploading ? "⏳ Mengupload..." : "Upload & Ingest"}
            </button>
          </div>
        </form>

        {uploadMsg && (
          <div style={{
            marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem",
            background: uploadMsg.type === "success" ? "#f0fff4" : "#fff5f5",
            color: uploadMsg.type === "success" ? "#276749" : "#c53030",
            border: `1px solid ${uploadMsg.type === "success" ? "#9ae6b4" : "#fed7d7"}`,
          }}>
            {uploadMsg.text}
          </div>
        )}
      </div>

      {/* Tabel Dokumen + Tombol Reset */}
      <div style={{
        background: "white", borderRadius: "12px", padding: "1.5rem",
        boxShadow: "0 1px 8px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#2d3748", margin: 0 }}>
            📋 Daftar Dokumen ({documents.length})
          </h2>
          <button
            onClick={handleResetVector}
            disabled={resetting}
            style={{
              padding: "0.5rem 1rem", background: resetting ? "#a0aec0" : "#e53e3e",
              color: "white", border: "none", borderRadius: "8px", fontSize: "0.85rem",
              fontWeight: "600", cursor: resetting ? "not-allowed" : "pointer"
            }}
          >
            {resetting ? "⏳ Mereset..." : "🗑️ Reset Semua Vector"}
          </button>
        </div>

        {documents.length === 0 ? (
          <p style={{ color: "#a0aec0", textAlign: "center", padding: "3rem 0" }}>
            Belum ada dokumen. Upload dokumen pertama kamu di atas.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                  {["Nama File", "Status", "Parent / Child", "Ukuran", "Tanggal Upload", "Aksi"].map((h) => (
                    <th key={h} style={{ padding: "0.6rem 0.75rem", color: "#4a5568", fontWeight: "600", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: "1px solid #f0f4f8" }}>
                    <td style={{ padding: "0.75rem", color: "#2d3748", fontWeight: "500" }}>
                      📄 {doc.file_name}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{
                        color: STATUS_COLORS[doc.status] ?? "#718096",
                        fontWeight: "600", fontSize: "0.8rem"
                      }}>
                        {STATUS_LABELS[doc.status] ?? doc.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", color: "#718096" }}>
                      {doc.parent_count} / {doc.child_count}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#718096" }}>
                      {formatBytes(doc.file_size_bytes)}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#718096", whiteSpace: "nowrap" }}>
                      {new Date(doc.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleView(doc.id, doc.file_name)}
                          style={{
                            padding: "0.35rem 0.75rem", background: "#ebf8ff",
                            color: "#3182ce", border: "1px solid #bee3f8", borderRadius: "6px",
                            fontSize: "0.8rem", cursor: "pointer"
                          }}
                        >
                          Lihat
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={deletingId === doc.id}
                          style={{
                            padding: "0.35rem 0.75rem", background: deletingId === doc.id ? "#a0aec0" : "#fff5f5",
                            color: "#c53030", border: "1px solid #fed7d7", borderRadius: "6px",
                            fontSize: "0.8rem", cursor: deletingId === doc.id ? "not-allowed" : "pointer"
                          }}
                        >
                          {deletingId === doc.id ? "..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal View Chunks */}
      {viewingDoc && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000,
          padding: "2rem"
        }}>
          <div style={{
            background: "white", borderRadius: "12px", padding: "1.5rem",
            width: "100%", maxWidth: "800px", maxHeight: "90vh",
            display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#2d3748", margin: 0 }}>
                📄 Detail Chunk: {viewingDoc.fileName}
              </h2>
              <button
                onClick={() => setViewingDoc(null)}
                style={{
                  background: "none", border: "none", fontSize: "1.5rem",
                  cursor: "pointer", color: "#a0aec0", lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
              {loadingChunks ? (
                <p style={{ textAlign: "center", color: "#718096", padding: "2rem 0" }}>⏳ Memuat data chunk...</p>
              ) : chunksData && chunksData.ids && chunksData.ids.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {chunksData.ids.map((id: string, index: number) => {
                    const doc = chunksData.documents[index];
                    const meta = chunksData.metadatas[index];
                    return (
                      <div key={id} style={{
                        border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem",
                        background: "#f8fafc"
                      }}>
                        <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#4a5568", background: "#edf2f7", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                            Child ID: {id}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#718096" }}>
                            Parent Index: {meta.parent_index} | Child Index: {meta.chunk_index}
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: "1rem" }}>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.3rem" }}>Child Content (Di-embed):</h4>
                          <p style={{ fontSize: "0.85rem", color: "#4a5568", margin: 0, whiteSpace: "pre-wrap", background: "white", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            {doc}
                          </p>
                        </div>

                        <div>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "#2d3748", marginBottom: "0.3rem" }}>Parent Content (Konteks Utuh):</h4>
                          <p style={{ fontSize: "0.85rem", color: "#4a5568", margin: 0, whiteSpace: "pre-wrap", background: "white", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0", maxHeight: "150px", overflowY: "auto" }}>
                            {meta.parent_content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#718096", padding: "2rem 0" }}>Tidak ada chunk ditemukan untuk dokumen ini.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
