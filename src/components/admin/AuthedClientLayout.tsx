"use client";

import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { useTheme } from "./ThemeContext";

interface Props {
  adminDisplayName: string;
  children: React.ReactNode;
}

export default function AuthedClientLayout({ adminDisplayName, children }: Props) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", backgroundColor: "var(--bg-page)" }}>
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
            background: "var(--bg-header)",
            borderBottom: "1px solid var(--border-color)",
            padding: "0 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 40,
            transition: "background-color 0.25s ease, border-color 0.25s ease",
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
                color: "var(--text-primary)",
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

            <h1 style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
              Disparbudpora AI
            </h1>
            {/* <span
              style={{
                fontSize: "0.65rem",
                fontWeight: "700",
                color: "#1E1F24",
                background: "#A1EBB4",
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Beta
            </span> */}
          </div>

          {/* Right: User Status, Theme Switcher & Icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)" }}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === "light" ? "Ganti ke Mode Gelap (Dark Mode)" : "Ganti ke Mode Terang (Light Mode)"}
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "999px",
                padding: "0.35rem 0.75rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.78rem",
                fontWeight: "600",
                color: "var(--text-primary)",
                transition: "all 0.2s ease",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: theme === "dark" ? "#FFB4A2" : "#744210" }}>
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>

            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              notifications
            </span>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)" }}
            >
              help_outline
            </span>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1E1F24 0%, #B5B4FF 100%)",
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
