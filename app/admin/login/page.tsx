"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/admin");
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--dark)",
    }}>
      <div style={{
        background: "var(--white)",
        padding: "3rem 2.5rem",
        width: 380,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="/logo.png"
            alt="My Creation"
            style={{ height: 70, margin: "0 auto 1rem", mixBlendMode: "multiply" }}
          />
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.6rem",
            fontWeight: 300,
            color: "var(--dark)",
            marginBottom: "0.3rem",
          }}>
            Admin Login
          </h2>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            My Creation — Dashboard Access
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              border: "1px solid var(--border-dk)",
              padding: "0.75rem 1rem",
              fontFamily: "'Jost', sans-serif",
              fontSize: "0.85rem",
              marginBottom: "1rem",
              outline: "none",
              background: "var(--cream)",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              border: "1px solid var(--border-dk)",
              padding: "0.75rem 1rem",
              fontFamily: "'Jost', sans-serif",
              fontSize: "0.85rem",
              marginBottom: "1rem",
              outline: "none",
              background: "var(--cream)",
            }}
          />
          {error && (
            <p style={{ fontSize: "0.72rem", color: "#e53935", marginBottom: "0.5rem" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "var(--muted)" : "var(--burg)",
              color: "white",
              border: "none",
              padding: "0.85rem",
              fontFamily: "'Jost', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
