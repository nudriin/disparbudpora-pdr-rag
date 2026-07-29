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

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  completed: { label: "Selesai", bg: "#f0fff4", color: "#276749", icon: "check_circle" },
  processing: { label: "Proses", bg: "#feebc8", color: "#744210", icon: "hourglass_top" },
  pending: { label: "Menunggu", bg: "#f2f4f6", color: "#45474c", icon: "schedule" },
  failed: { label: "Gagal", bg: "#ffdad6", color: "#ba1a1a", icon: "cancel" },
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
  const [resettingAll, setResettingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ id: string; fileName: string } | null>(null);
  const [chunksData, setChunksData] = useState<any>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Custom Neo-Minimalist Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: "info" | "success" | "warning" | "danger" | "confirm";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  function showNotify(title: string, message: string, type: "info" | "success" | "warning" | "danger" = "info") {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      confirmText: "Tutup",
      onConfirm: () => setModalConfig((prev) => ({ ...prev, isOpen: false })),
    });
  }

  function showConfirm(title: string, message: string, onConfirm: () => void, type: "warning" | "danger" = "warning") {
    setModalConfig({
      isOpen: true,
      type: "confirm",
      title,
      message,
      confirmText: "Ya, Lanjutkan",
      cancelText: "Batal",
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  }

  // Agregasi Statistik
  const totalParentCount = documents.reduce((sum, d) => sum + (d.parent_count || 0), 0);
  const totalChildCount = documents.reduce((sum, d) => sum + (d.child_count || 0), 0);
  const totalSizeBytes = documents.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);
  const completedDocsCount = documents.filter((d) => d.status === "completed").length;

  // Filter & Sort Documents
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" ? true : doc.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "name_asc") return a.file_name.localeCompare(b.file_name);
      if (sortBy === "size_desc") return (b.file_size_bytes || 0) - (a.file_size_bytes || 0);
      return 0;
    });

  async function refreshDocuments() {
    const res = await fetch("/api/admin/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
  }

  const handleUpload = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const files = fileRef.current?.files || selectedFiles;
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

      setUploadMsg({ type: "success", text: data.message });
      if (fileRef.current) fileRef.current.value = "";
      setSelectedFiles([]);
      await refreshDocuments();
    } catch {
      setUploadMsg({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setUploading(false);
    }
  }, [selectedFiles]);

  function handleDelete(docId: string, fileName: string) {
    showConfirm(
      "Hapus Dokumen",
      `Apakah Anda yakin ingin menghapus "${fileName}"?\n\nSemua data parent & child chunk dokumen ini di ChromaDB dan Supabase akan dihapus permanen.`,
      async () => {
        setDeletingId(docId);
        try {
          const res = await fetch(`/api/admin/documents/${docId}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            showNotify("Hapus Gagal", data.error ?? "Gagal menghapus dokumen.", "danger");
            return;
          }
          setDocuments((prev) => prev.filter((d) => d.id !== docId));
          showNotify("Dokumen Dihapus", `Dokumen "${fileName}" berhasil dihapus.`, "success");
        } catch {
          showNotify("Kesalahan Jaringan", "Tidak dapat terhubung ke server. Coba lagi.", "danger");
        } finally {
          setDeletingId(null);
        }
      },
      "danger"
    );
  }

  function handleResetVector() {
    showConfirm(
      "Reset Vector Database",
      "PERINGATAN: Tindakan ini akan MENGHAPUS SEMUA DATA VEKTOR di ChromaDB!\n\nStatus seluruh dokumen di Supabase akan di-reset menjadi pending. Anda perlu menjalankan ulang ingest setelah reset.\n\nApakah Anda yakin ingin melanjutkan?",
      async () => {
        setResetting(true);
        try {
          const res = await fetch("/api/admin/documents/reset-vector", { method: "POST" });
          const data = await res.json();
          if (!res.ok) {
            showNotify("Reset Vector Gagal", data.error ?? "Gagal melakukan reset vector.", "danger");
            return;
          }
          showNotify("Reset Vector Sukses", "Koleksi ChromaDB berhasil direset 100%. Jalankan ulang ingest untuk mengisi data vektor baru.", "success");
          await refreshDocuments();
        } catch {
          showNotify("Kesalahan Jaringan", "Tidak dapat terhubung ke server. Coba lagi.", "danger");
        } finally {
          setResetting(false);
        }
      },
      "danger"
    );
  }

  function handleResetAll() {
    showConfirm(
      "Reset Dokumen & Vector Total",
      "PERINGATAN SANGAT PENTING:\n\nTindakan ini akan MENGHAPUS TOTAL SELURUH DOKUMEN di database Supabase dan SELURUH VEKTOR di ChromaDB!\n\nDaftar dokumen akan menjadi KOSONG (0 dokumen).\n\nApakah Anda yakin mau menghapus total semua dokumen?",
      async () => {
        setResettingAll(true);
        try {
          const res = await fetch("/api/admin/documents/reset-all", { method: "POST" });
          const data = await res.json();
          if (!res.ok) {
            showNotify("Reset Dokumen Gagal", data.error ?? "Gagal mereset total dokumen.", "danger");
            return;
          }
          showNotify("Reset Total Sukses", "Seluruh dokumen dan data vektor ChromaDB berhasil dihapus total.", "success");
          await refreshDocuments();
        } catch {
          showNotify("Kesalahan Jaringan", "Tidak dapat terhubung ke server. Coba lagi.", "danger");
        } finally {
          setResettingAll(false);
        }
      },
      "danger"
    );
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
        showNotify("Gagal Memuat Chunk", data.error ?? "Gagal mengambil data chunk dokumen.", "danger");
      }
    } catch {
      showNotify("Kesalahan Jaringan", "Tidak dapat terhubung ke server. Coba lagi.", "danger");
    } finally {
      setLoadingChunks(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ============================================================ */}
      {/* 📊 WIDGET STATISTIK BENTO GRID (Neo-Minimalist Design) */}
      {/* ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Stat Card 1: Total Dokumen */}
        <div
          style={{
            background: "var(--dark-card-bg)",
            color: "var(--dark-card-text)",
            borderRadius: "22px",
            padding: "1.35rem 1.25rem",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "130px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                color: "#A1EBB4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                description
              </span>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: "800",
                background: "#A1EBB4",
                color: "#0D381B",
                padding: "0.2rem 0.6rem",
                borderRadius: "999px",
              }}
            >
              {completedDocsCount}/{documents.length} Selesai
            </span>
          </div>
          <div>
            <h3 style={{ fontSize: "1.85rem", fontWeight: "800", margin: "0.75rem 0 0 0", lineHeight: 1 }}>
              {documents.length}
            </h3>
            <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "#A1EBB4", margin: "0.35rem 0 0 0", opacity: 0.9 }}>
              Total Dokumen Terdaftar
            </p>
          </div>
        </div>

        {/* Stat Card 2: Total Parent Chunks */}
        <div
          style={{
            background: "var(--mint-accent)",
            color: "var(--mint-text)",
            borderRadius: "22px",
            padding: "1.35rem 1.25rem",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "130px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.08)",
                color: "var(--mint-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                inventory_2
              </span>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "1.85rem", fontWeight: "800", margin: "0.75rem 0 0 0", lineHeight: 1 }}>
              {totalParentCount.toLocaleString()}
            </h3>
            <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--mint-text)", margin: "0.35rem 0 0 0", opacity: 0.9 }}>
              Total Parent Chunks (Context)
            </p>
          </div>
        </div>

        {/* Stat Card 3: Total Child Chunks */}
        <div
          style={{
            background: "var(--lavender-accent)",
            color: "var(--lavender-text)",
            borderRadius: "22px",
            padding: "1.35rem 1.25rem",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "130px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.08)",
                color: "var(--lavender-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                grid_view
              </span>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "1.85rem", fontWeight: "800", margin: "0.75rem 0 0 0", lineHeight: 1 }}>
              {totalChildCount.toLocaleString()}
            </h3>
            <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--lavender-text)", margin: "0.35rem 0 0 0", opacity: 0.9 }}>
              Total Child Chunks (Vectors)
            </p>
          </div>
        </div>

        {/* Stat Card 4: Total Storage Size */}
        <div
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            borderRadius: "22px",
            padding: "1.35rem 1.25rem",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "130px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                database
              </span>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: "1.85rem", fontWeight: "800", margin: "0.75rem 0 0 0", lineHeight: 1 }}>
              {formatBytes(totalSizeBytes)}
            </h3>
            <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-secondary)", margin: "0.35rem 0 0 0" }}>
              Ukuran Penyimpanan Berkas
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* UPLOAD ZONE CARD (Neo-Minimalist Design) */}
      {/* ============================================================ */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "22px",
          padding: "1.5rem",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#0058be" }}>
            upload_file
          </span>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#091426", margin: 0 }}>
            Upload & Ingest Dokumen Baru
          </h2>
        </div>
        <p style={{ color: "#45474c", fontSize: "0.85rem", margin: "0 0 1.25rem 0" }}>
          Unggah berkas data pariwisata (.pdf, .txt, .xlsx, .csv) untuk diproses menjadi Parent & Child Chunks di ChromaDB.
        </p>

        <form onSubmit={handleUpload}>
          <input
            type="file"
            ref={fileRef}
            accept=".txt,.pdf,.xlsx,.csv"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) {
                setSelectedFiles(Array.from(e.target.files));
              }
            }}
          />

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                if (fileRef.current) {
                  fileRef.current.files = e.dataTransfer.files;
                }
                setSelectedFiles(Array.from(e.dataTransfer.files));
              }
            }}
            style={{
              border: selectedFiles.length > 0 ? "2px solid #0058be" : "2px dashed #adc6ff",
              borderRadius: "10px",
              padding: "1.75rem 1.5rem",
              background: selectedFiles.length > 0 ? "#ebf8ff" : "#f7f9fb",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.6rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "42px", color: "#0058be" }}>
              cloud_upload
            </span>
            <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#091426" }}>
              Tarik & Lepas Berkas Disini, atau <span style={{ color: "#0058be", textDecoration: "underline" }}>Cari Berkas Komputer</span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#75777d", margin: 0 }}>
              Format didukung: <strong>.pdf, .txt, .xlsx, .csv</strong> (Mendukung upload banyak berkas sekaligus)
            </p>

            {/* List Berkas Terpilih */}
            {selectedFiles.length > 0 && (
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  justifyContent: "center",
                  maxWidth: "100%",
                }}
              >
                {selectedFiles.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      background: "#d8e2ff",
                      color: "#0058be",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      description
                    </span>
                    {f.name} ({formatBytes(f.size)})
                  </span>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: "0.65rem 1.5rem",
                background: uploading || selectedFiles.length === 0 ? "#75777d" : "#091426",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "0.875rem",
                cursor: uploading || selectedFiles.length === 0 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "0.75rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                auto_awesome
              </span>
              {uploading ? "Mengunggah & Ingesting..." : `Unggah ${selectedFiles.length} Berkas & Ingest`}
            </button>
          </div>
        </form>

        {uploadMsg && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              background: uploadMsg.type === "success" ? "#f0fff4" : "#ffdad6",
              color: uploadMsg.type === "success" ? "#276749" : "#ba1a1a",
              border: `1px solid ${uploadMsg.type === "success" ? "#c6f6d5" : "#ffdad6"}`,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {uploadMsg.type === "success" ? "check_circle" : "error"}
            </span>
            {uploadMsg.text}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 🔍 TABEL KELOLA DOKUMEN + FILTER & SEARCH BAR */}
      {/* ============================================================ */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "22px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Header Baris 1: Judul & Reset All Vectors */}
        <div
          style={{
            position: "relative",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px dashed var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            background: "var(--bg-surface)",
            overflow: "hidden",
          }}
        >
          {/* Dashed Corner Circle Accent */}
          <div style={{ position: "absolute", top: "-22px", right: "-22px", width: "70px", height: "70px", borderRadius: "50%", border: "1.5px dashed var(--border-color)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#2E6B45" }}>
              asterisk
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "#A1EBB4" }}>
              description
            </span>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
              Daftar Dokumen Basis Pengetahuan ({filteredDocuments.length} dari {documents.length})
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={handleResetVector}
              disabled={resetting || resettingAll}
              style={{
                padding: "0.5rem 1rem",
                background: resetting ? "var(--text-secondary)" : "#FFB4A2",
                color: "#690005",
                border: "none",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: "700",
                cursor: resetting || resettingAll ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                restart_alt
              </span>
              {resetting ? "Mereset Vector..." : "Reset Vector"}
            </button>

            <button
              onClick={handleResetAll}
              disabled={resetting || resettingAll}
              style={{
                padding: "0.5rem 1rem",
                background: resettingAll ? "var(--text-secondary)" : "#ba1a1a",
                color: "white",
                border: "none",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: "700",
                cursor: resetting || resettingAll ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                delete_sweep
              </span>
              {resettingAll ? "Mereset Dokumen..." : "Reset Total Dokumen"}
            </button>
          </div>
        </div>

        {/* Header Baris 2: Search Input, Status Filter, & Sorting */}
        <div
          style={{
            padding: "0.75rem 1.5rem 1.25rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            background: "var(--input-bg)",
          }}
        >
          {/* Input Search Nama File */}
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "18px",
                color: "#75777d",
              }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama berkas dokumen..."
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem 0.6rem 2.2rem",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                fontSize: "0.85rem",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Filter Status Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)" }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                fontSize: "0.85rem",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <option value="all">Semua Status</option>
              <option value="completed">Selesai (Completed)</option>
              <option value="processing">Proses (Processing)</option>
              <option value="pending">Menunggu (Pending)</option>
              <option value="failed">Gagal (Failed)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)" }}>Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                fontSize: "0.85rem",
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <option value="newest">Terbaru Upload</option>
              <option value="oldest">Terlama Upload</option>
              <option value="name_asc">Nama Berkas (A-Z)</option>
              <option value="size_desc">Ukuran Berkas Terbesar</option>
            </select>
          </div>
        </div>

        {/* Tabel Dokumen */}
        {filteredDocuments.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {documents.length === 0
              ? "Belum ada dokumen dalam basis pengetahuan. Unggah berkas pertama Anda di atas."
              : "Tidak ada dokumen yang cocok dengan kata kunci atau filter terpilih."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", minWidth: "750px", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: "800", width: "30%" }}>Nama File</th>
                  <th style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: "800", width: "14%" }}>Status</th>
                  <th style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: "800", width: "14%" }}>Parent / Child</th>
                  <th style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: "800", width: "10%" }}>Ukuran</th>
                  <th style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: "800", width: "14%" }}>Tanggal Upload</th>
                  <th style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: "800", width: "18%" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  const cfg = STATUS_CONFIG[doc.status] || { label: doc.status, bg: "var(--input-bg)", color: "var(--text-secondary)", icon: "info" };

                  return (
                    <tr key={doc.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-primary)", fontWeight: "700", overflow: "hidden" }}>
                        <div
                          title={doc.file_name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--text-primary)", flexShrink: 0 }}>
                            description
                          </span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.file_name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                            {cfg.icon}
                          </span>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-primary)", fontWeight: "600", whiteSpace: "nowrap" }}>
                        {doc.parent_count} / {doc.child_count}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                        {formatBytes(doc.file_size_bytes)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(doc.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => handleView(doc.id, doc.file_name)}
                            style={{
                              padding: "0.35rem 0.65rem",
                              background: "#d8e2ff",
                              color: "#0058be",
                              border: "1px solid #adc6ff",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                              visibility
                            </span>
                            Lihat
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.file_name)}
                            disabled={deletingId === doc.id}
                            style={{
                              padding: "0.35rem 0.65rem",
                              background: deletingId === doc.id ? "#e0e3e5" : "#ffdad6",
                              color: "#ba1a1a",
                              border: "1px solid #ffdad6",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: deletingId === doc.id ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                              delete
                            </span>
                            {deletingId === doc.id ? "..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal View Chunks */}
      {viewingDoc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 20, 38, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "820px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              border: "1px solid #c5c6cd",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#091426", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span className="material-symbols-outlined" style={{ color: "#0058be" }}>description</span>
                Detail Chunk: {viewingDoc.fileName}
              </h2>
              <button
                onClick={() => setViewingDoc(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#75777d",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
              {loadingChunks ? (
                <div style={{ textAlign: "center", color: "#75777d", padding: "2rem 0" }}>Memuat data chunk...</div>
              ) : chunksData && chunksData.ids && chunksData.ids.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {chunksData.ids.map((id: string, index: number) => {
                    const doc = chunksData.documents[index];
                    const meta = chunksData.metadatas[index];
                    return (
                      <div
                        key={id}
                        style={{
                          border: "1px solid #c5c6cd",
                          borderRadius: "8px",
                          padding: "1rem",
                          background: "#f7f9fb",
                        }}
                      >
                        <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#0058be", background: "#d8e2ff", padding: "0.2rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>
                            Child ID: {id}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#75777d" }}>
                            Parent Index: {meta.parent_index} | Child Index: {meta.chunk_index}
                          </span>
                        </div>

                        <div style={{ marginBottom: "0.75rem" }}>
                          <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#191c1e", marginBottom: "0.25rem" }}>Child Content (Vector Embedded):</h4>
                          <p style={{ fontSize: "0.825rem", color: "#45474c", margin: 0, whiteSpace: "pre-wrap", background: "white", padding: "0.65rem", borderRadius: "6px", border: "1px solid #e0e3e5" }}>
                            {doc}
                          </p>
                        </div>

                        <div>
                          <h4 style={{ fontSize: "0.8rem", fontWeight: "700", color: "#191c1e", marginBottom: "0.25rem" }}>Parent Content (Konteks Utuh):</h4>
                          <p style={{ fontSize: "0.825rem", color: "#45474c", margin: 0, whiteSpace: "pre-wrap", background: "white", padding: "0.65rem", borderRadius: "6px", border: "1px solid #e0e3e5", maxHeight: "150px", overflowY: "auto" }}>
                            {meta.parent_content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#75777d", padding: "2rem 0" }}>
                  Tidak ada chunk ditemukan untuk dokumen ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CUSTOM NEO-MINIMALIST POPUP MODAL */}
      {/* ============================================================ */}
      {modalConfig.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              position: "relative",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              borderRadius: "26px",
              padding: "2rem",
              maxWidth: "440px",
              width: "100%",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dashed Corner Circle Accent */}
            <div style={{ position: "absolute", top: "-22px", right: "-22px", width: "70px", height: "70px", borderRadius: "50%", border: "1.5px dashed var(--border-color)", pointerEvents: "none" }} />

            {/* Header Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#2E6B45" }}>
                asterisk
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  color: "var(--text-secondary)",
                  background: "var(--input-bg)",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "999px",
                  border: "1px dashed var(--border-color)",
                }}
              >
                Disparbudpora AI Notification
              </span>
            </div>

            {/* Modal Content */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background:
                    modalConfig.type === "danger"
                      ? "rgba(186, 26, 26, 0.15)"
                      : modalConfig.type === "success"
                      ? "rgba(161, 235, 180, 0.25)"
                      : "var(--input-bg)",
                  color:
                    modalConfig.type === "danger"
                      ? "#FFB4A2"
                      : modalConfig.type === "success"
                      ? "#A1EBB4"
                      : "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                  {modalConfig.type === "danger"
                    ? "warning"
                    : modalConfig.type === "success"
                    ? "check_circle"
                    : "info"}
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", margin: "0 0 0.35rem 0", color: "var(--text-primary)" }}>
                  {modalConfig.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {modalConfig.message}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              {modalConfig.cancelText && (
                <button
                  onClick={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "999px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {modalConfig.cancelText}
                </button>
              )}
              <button
                onClick={() => {
                  modalConfig.onConfirm?.();
                }}
                style={{
                  padding: "0.6rem 1.4rem",
                  borderRadius: "999px",
                  background: modalConfig.type === "danger" ? "#FFB4A2" : "#A1EBB4",
                  color: modalConfig.type === "danger" ? "#690005" : "#0D381B",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {modalConfig.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
