"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin",            label: "Dashboard",  icon: "📊" },
  { href: "/admin/documents",  label: "Dokumen",    icon: "📄" },
  { href: "/admin/history",    label: "History Chat", icon: "💬" },
  { href: "/admin/settings",   label: "Settings LLM", icon: "⚙️" },
];

interface AdminSidebarProps {
  adminName: string;
}

export default function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside style={{
      width: "240px", background: "#1a202c", color: "white",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: "1.5rem", borderBottom: "1px solid #2d3748" }}>
        <div style={{ fontSize: "1rem", fontWeight: "700" }}>🗺️ Admin Panel</div>
        <div style={{ fontSize: "0.75rem", color: "#a0aec0", marginTop: "0.25rem" }}>
          Pariwisata Palangka Raya
        </div>
      </div>

      {/* Navigasi */}
      <nav style={{ flex: 1, padding: "1rem 0" }}>
        {NAV_ITEMS.map((item) => {
          // /admin exact match atau prefix untuk sub-pages
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.65rem 1.5rem", textDecoration: "none",
                color: isActive ? "white" : "#a0aec0",
                background: isActive ? "#2d3748" : "transparent",
                borderLeft: isActive ? "3px solid #63b3ed" : "3px solid transparent",
                fontSize: "0.9rem", transition: "all 0.15s",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — info user & logout */}
      <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #2d3748" }}>
        <div style={{ fontSize: "0.8rem", color: "#a0aec0", marginBottom: "0.75rem",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          👤 {adminName}
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "0.5rem", background: "#e53e3e",
            color: "white", border: "none", borderRadius: "6px",
            fontSize: "0.85rem", cursor: "pointer", fontWeight: "500"
          }}
        >
          Keluar
        </button>
      </div>
    </aside>
  );
}
