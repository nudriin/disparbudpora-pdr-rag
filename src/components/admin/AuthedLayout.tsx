import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AdminSidebar from "./AdminSidebar";

/**
 * Wrapper untuk page admin yang butuh auth.
 * Dipanggil langsung dari page.tsx, bukan dari layout.tsx,
 * karena layout.tsx juga membungkus /admin/login.
 */
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <AdminSidebar adminName={session.fullName ?? session.email} />
      <main
        style={{
          flex: 1,
          background: "#f7fafc",
          padding: "2rem",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
