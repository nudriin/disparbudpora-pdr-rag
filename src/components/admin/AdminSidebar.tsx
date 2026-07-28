"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/documents", label: "Dokumen", icon: "description" },
  { href: "/admin/history", label: "History Chat", icon: "forum" },
  { href: "/admin/settings", label: "Settings LLM", icon: "settings" },
];

interface AdminSidebarProps {
  adminName: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({
  adminName,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const sidebarContent = (
    <aside
      className="admin-sidebar"
      style={{
        width: "260px",
        height: "100vh",
        background: "#091426",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderRight: "1px solid #1e293b",
        zIndex: isMobileOpen ? 100 : 50,
        position: isMobileOpen ? "fixed" : "sticky",
        top: 0,
        left: isMobileOpen ? 0 : undefined,
        boxShadow: isMobileOpen ? "4px 0 20px rgba(0,0,0,0.4)" : "none",
        transition: "transform 0.25s ease",
      }}
    >
      {/* Header Brand + Close Button for Mobile */}
      <div
        style={{
          padding: "1.25rem 1.25rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0, letterSpacing: "-0.01em" }}>
            Admin Panel
          </h2>
          <p style={{ fontSize: "0.72rem", color: "#8590a6", margin: "0.15rem 0 0 0" }}>
            Pariwisata Palangka Raya
          </p>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="mobile-close-btn"
            style={{
              background: "none",
              border: "none",
              color: "#8590a6",
              cursor: "pointer",
              padding: "0.2rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
              close
            </span>
          </button>
        )}
      </div>

      {/* Navigasi Utama */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                textDecoration: "none",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.65)",
                background: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                fontSize: "0.875rem",
                fontWeight: isActive ? "600" : "400",
                transition: "all 0.15s ease",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "15%",
                    bottom: "15%",
                    width: "4px",
                    backgroundColor: "#2170e4",
                    borderRadius: "0 4px 4px 0",
                  }}
                />
              )}
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: isActive ? "#2170e4" : "inherit" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Logout */}
      <div style={{ padding: "1rem 1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.25rem 0.5rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#adc6ff" }}>
            account_circle
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#ffffff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {adminName}
            </div>
            <div style={{ fontSize: "0.68rem", color: "#8590a6", letterSpacing: "0.05em", fontWeight: "600" }}>
              ONLINE
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            handleLogout();
          }}
          style={{
            width: "100%",
            padding: "0.6rem 0.85rem",
            background: "#ba1a1a",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            transition: "all 0.15s ease",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            logout
          </span>
          Keluar
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(9, 20, 38, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 90,
          }}
        />
      )}
      {sidebarContent}
    </>
  );
}
