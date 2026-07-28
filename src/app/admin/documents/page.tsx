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
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1a202c", marginBottom: "0.5rem" }}>
        Manajemen Dokumen
      </h1>
      <p style={{ color: "#718096", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Upload dokumen pariwisata, lihat status ingesti, dan kelola vector store.
      </p>
      <DocumentsClient initialDocuments={documents} />
    </div>
    </AuthedLayout>
  );
}
