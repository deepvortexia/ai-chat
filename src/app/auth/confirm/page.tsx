"use client";

/**
 * Implicit-flow OAuth callback page.
 *
 * With implicit flow the session arrives in the URL hash (#access_token=...).
 * The server never sees the hash, so this must be a client component.
 * Supabase (detectSessionInUrl default) parses the hash and fires SIGNED_IN
 * via onAuthStateChange — we wait for that event before redirecting so the
 * session cookie is guaranteed to be written first.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        clearTimeout(fallback);
        window.location.replace("/");
      }
    });

    // Fallback: if SIGNED_IN never fires within 3s, redirect anyway
    const fallback = setTimeout(() => {
      subscription.unsubscribe();
      window.location.replace("/");
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  if (error) {
    return (
      <main style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#0a0a0a", color: "#ff4444",
        flexDirection: "column", gap: "1rem", padding: "2rem", textAlign: "center",
      }}>
        <p style={{ fontSize: "2rem" }}>⚠️</p>
        <p style={{ maxWidth: 400 }}>Sign in failed: {error}</p>
        <a href="/" style={{ color: "#D4AF37", textDecoration: "underline", marginTop: "1rem" }}>
          Return to Home
        </a>
      </main>
    );
  }

  return (
    <main style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#0a0a0a", color: "#D4AF37",
      flexDirection: "column", gap: "1rem",
    }}>
      <p style={{ fontSize: "2rem" }}>⚡</p>
      <p>Completing sign in…</p>
    </main>
  );
}
