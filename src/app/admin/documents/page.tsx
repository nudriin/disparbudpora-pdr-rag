import { getSupabaseAdmin } from "@/lib/supabase/client";
import AuthedLayout from "@/components/admin/AuthedLayout";
import DocumentsClient from "@/components/admin/DocumentsClient";

async function getDocuments() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("document_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <AuthedLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "var(--text-primary)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--text-primary)" }}>
              description
            </span>
            Manajemen Dokumen & Vector Store
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Upload dokumen pariwisata, pantau status ingesti PDR, dan kelola database vektor ChromaDB.
          </p>
        </div>
        <DocumentsClient initialDocuments={documents} />
      </div>
    </AuthedLayout>
  );
}
