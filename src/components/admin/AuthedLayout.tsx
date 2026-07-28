import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AdminSidebar from "./AdminSidebar";

/**
 * Wrapper layout terautentikasi dengan sidebar & top header Google Stitch design system.
 */
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const adminDisplayName = session.fullName || session.email.split("@")[0];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#f7f9fb" }}>
      {/* Sidebar Google Stitch Deep Navy */}
      <AdminSidebar adminName={adminDisplayName} />

      {/* Area Konten Utama */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {/* Top App Header Bar */}
        <header
          style={{
            height: "64px",
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #c5c6cd",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Judul Sistem & Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#091426", margin: 0 }}>
              Tourism Intelligence
            </h1>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: "700",
                color: "#0058be",
                background: "#d8e2ff",
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Beta
            </span>
          </div>

          {/* User Status & Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", color: "#45474c" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "22px", cursor: "pointer", color: "#45474c" }}
            >
              notifications
            </span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "22px", cursor: "pointer", color: "#45474c" }}
            >
              help_outline
            </span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #091426 0%, #2170e4 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "0.9rem",
              }}
            >
              {adminDisplayName[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Canvas Isi Halaman */}
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
