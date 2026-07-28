"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

interface Props {
  adminDisplayName: string;
  children: React.ReactNode;
}

export default function AuthedClientLayout({ adminDisplayName, children }: Props) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "#f7f9fb" }}>
      {/* Sidebar Google Stitch Deep Navy (Desktop + Mobile Drawer) */}
      <div className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}>
        <AdminSidebar
          adminName={adminDisplayName}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </div>

      {/* Area Konten Utama */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {/* Top App Header Bar */}
        <header
          style={{
            height: "64px",
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #c5c6cd",
            padding: "0 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Left: Hamburger Toggle (Mobile) + Judul Sistem & Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="hamburger-btn"
              style={{
                background: "none",
                border: "none",
                color: "#091426",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
              }}
              title="Buka Navigasi Sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "26px" }}>
                menu
              </span>
            </button>

            <h1 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#091426", margin: 0, letterSpacing: "-0.01em" }}>
              Tourism Intelligence
            </h1>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: "700",
                color: "#0058be",
                background: "#d8e2ff",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Beta
            </span>
          </div>

          {/* Right: User Status & Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "#45474c" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px", cursor: "pointer", color: "#45474c" }}
            >
              notifications
            </span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px", cursor: "pointer", color: "#45474c" }}
            >
              help_outline
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #091426 0%, #2170e4 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "0.85rem",
              }}
            >
              {adminDisplayName[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Canvas Isi Halaman */}
        <main className="main-content-canvas" style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {children}
        </main>
      </div>

      {/* Global Responsive CSS Styles */}
      <style jsx global>{`
        @media (max-width: 1023px) {
          .sidebar-container:not(.mobile-open) .admin-sidebar {
            display: none !important;
          }
          .hamburger-btn {
            display: flex !important;
          }
          .main-content-canvas {
            padding: 1rem !important;
          }
        }
        @media (min-width: 1024px) {
          .hamburger-btn {
            display: none !important;
          }
          .mobile-close-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
