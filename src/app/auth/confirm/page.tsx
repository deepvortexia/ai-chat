"use client";

/**
 * Implicit-flow OAuth callback page.
 *
 * With implicit flow the session arrives in the URL hash (#access_token=...).
 * The server never sees the hash, so this must be a client component.
 *
 * @supabase/ssr's createBrowserClient does not auto-parse the hash — we must
 * call getSession() explicitly to trigger hash extraction and cookie writing,
 * then redirect once the session is confirmed.
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

    const handleCallback = async () => {
      // Explicitly call getSession() to trigger hash parsing and write the
      // session cookie — createBrowserClient does not do this automatically.
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        window.location.replace("/");
        return;
      }

      // Hash not yet parsed — wait for SIGNED_IN as a fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          window.location.replace("/");
        }
      });

      // Last-resort redirect after 3s
      setTimeout(() => {
        subscription.unsubscribe();
        window.location.replace("/");
      }, 3000);
    };

    handleCallback();
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
