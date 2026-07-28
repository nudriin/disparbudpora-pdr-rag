"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";

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
        setError(data.error ?? "Login gagal.");
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
        alignItems: "center",
        justifyContent: "center",
        background: "#091426",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "2.5rem",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: "400px",
          border: "1px solid #1e293b",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#d8e2ff",
              color: "#0058be",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem auto",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
              lock
            </span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#091426", margin: 0, letterSpacing: "-0.01em" }}>
            Admin Panel
          </h1>
          <p style={{ color: "#45474c", marginTop: "0.35rem", fontSize: "0.875rem" }}>
            Tourism Intelligence Palangka Raya
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#091426",
                marginBottom: "0.4rem",
              }}
            >
              Email Administrator
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "0.75rem 0.85rem",
                border: "1px solid #c5c6cd",
                borderRadius: "8px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              placeholder="admin@palangkaraya.go.id"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#091426",
                marginBottom: "0.4rem",
              }}
            >
              Kata Sandi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "0.75rem 0.85rem",
                border: "1px solid #c5c6cd",
                borderRadius: "8px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              style={{
                background: "#ffdad6",
                border: "1px solid #ffdad6",
                color: "#ba1a1a",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                error
              </span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.8rem",
              background: loading ? "#75777d" : "#091426",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s ease",
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              login
            </span>
            {loading ? "Masuk..." : "Masuk ke Admin Panel"}
          </button>
        </form>
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
