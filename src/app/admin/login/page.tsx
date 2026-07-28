"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/admin/ThemeContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login gagal. Periksa kembali email & password Anda.");
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-page)",
        backgroundImage: "radial-gradient(var(--border-color) 1.2px, transparent 1.2px)",
        backgroundSize: "24px 24px",
        padding: "1.5rem",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Header Controls: Back to Home & Theme Toggle */}
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          left: "1.5rem",
          right: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: "700",
            background: "var(--bg-surface)",
            padding: "0.45rem 0.85rem",
            borderRadius: "999px",
            border: "1px solid var(--border-color)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            arrow_back
          </span>
          Kembali ke Beranda
        </Link>

        <button
          onClick={toggleTheme}
          title={`Beralih ke mode ${theme === "light" ? "gelap" : "terang"}`}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            padding: "0.45rem 0.85rem",
            borderRadius: "999px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.8rem",
            fontWeight: "700",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: theme === "light" ? "#FF9800" : "#B5B4FF" }}>
            {theme === "light" ? "light_mode" : "dark_mode"}
          </span>
          <span>{theme === "light" ? "Terang" : "Gelap"}</span>
        </button>
      </div>

      {/* Main Login Card Container with Dashed Corner Accent */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-surface)",
          padding: "2.5rem 2rem",
          borderRadius: "26px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
          width: "100%",
          maxWidth: "420px",
          border: "1px solid var(--border-color)",
          boxSizing: "border-box",
          zIndex: 5,
          overflow: "hidden",
        }}
      >
        {/* Dashed Corner Circle Accent */}
        <div
          style={{
            position: "absolute",
            top: "-22px",
            right: "-22px",
            width: "75px",
            height: "75px",
            borderRadius: "50%",
            border: "1.5px dashed var(--border-color)",
            pointerEvents: "none",
          }}
        />

        {/* Card Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.75rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#2E6B45" }}>
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
              Portal Autentikasi Administrator
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#2E6B45" }}>
              asterisk
            </span>
          </div>

          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "16px",
              background: "#196a2bff",
              color: "#A1EBB4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.85rem auto",
              // boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "26px" }}>
              admin_panel_settings
            </span>
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
            Disparbudpora AI
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem", fontSize: "0.85rem", margin: 0 }}>
            Masuk untuk mengelola basis pengetahuan pariwisata Kota Palangka Raya
          </p>
        </div>

        {/* Dashed Accent Divider */}
        <div style={{ position: "relative", width: "100%", margin: "1.25rem 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", borderTop: "1.5px dashed var(--border-color)" }} />
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 2,
              background: "var(--bg-surface)",
              padding: "0 0.5rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#2E6B45" }}>
              asterisk
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.825rem",
                fontWeight: "700",
                color: "var(--text-primary)",
                marginBottom: "0.4rem",
              }}
            >
              Email Administrator
            </label>
            <div style={{ position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "var(--text-secondary)",
                }}
              >
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "0.75rem 0.85rem 0.75rem 2.4rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  fontSize: "0.875rem",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                placeholder="admin@palangkaraya.go.id"
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.825rem",
                fontWeight: "700",
                color: "var(--text-primary)",
                marginBottom: "0.4rem",
              }}
            >
              Kata Sandi
            </label>
            <div style={{ position: "relative" }}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "18px",
                  color: "var(--text-secondary)",
                }}
              >
                lock
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "0.75rem 0.85rem 0.75rem 2.4rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  fontSize: "0.875rem",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(186,26,26,0.15)",
                border: "1px solid #FFB4A2",
                color: "#FFB4A2",
                padding: "0.75rem 1rem",
                borderRadius: "14px",
                fontSize: "0.825rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                warning
              </span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.85rem",
              background: loading ? "var(--text-secondary)" : "#A1EBB4",
              color: "#0D381B",
              border: "none",
              borderRadius: "999px",
              fontSize: "0.9rem",
              fontWeight: "800",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform 0.15s ease",
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 15px rgba(161, 235, 180, 0.25)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              login
            </span>
            {loading ? "Memverifikasi..." : "Masuk ke Admin Panel"}
          </button>
        </form>
      </div>

      {/* Footer copyright line */}
      <div style={{ marginTop: "2rem", fontSize: "0.78rem", color: "var(--text-secondary)", zIndex: 5, textAlign: "center" }}>
        © {new Date().getFullYear()} Disparbudpora Kota Palangka Raya. All rights reserved.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
