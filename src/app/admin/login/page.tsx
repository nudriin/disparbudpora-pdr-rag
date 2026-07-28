"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f0f4f8", fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        background: "white", padding: "2.5rem", borderRadius: "12px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1a202c", margin: 0 }}>
            🗺️ Admin Panel
          </h1>
          <p style={{ color: "#718096", marginTop: "0.5rem", fontSize: "0.9rem" }}>
            Chatbot Pariwisata Palangka Raya
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600",
              color: "#4a5568", marginBottom: "0.4rem" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid #e2e8f0",
                borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box",
                outline: "none", transition: "border-color 0.2s"
              }}
              placeholder="admin@example.com"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600",
              color: "#4a5568", marginBottom: "0.4rem" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid #e2e8f0",
                borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030",
              padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem",
              fontSize: "0.875rem"
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.75rem", background: loading ? "#a0aec0" : "#3182ce",
              color: "white", border: "none", borderRadius: "8px", fontSize: "1rem",
              fontWeight: "600", cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s"
            }}
          >
            {loading ? "Masuk..." : "Masuk"}
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
