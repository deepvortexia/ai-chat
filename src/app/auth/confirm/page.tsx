"use client";

/**
 * Implicit-flow OAuth callback page.
 *
 * With implicit flow Supabase returns tokens in the URL hash:
 *   #access_token=...&refresh_token=...&token_type=bearer
 *
 * @supabase/ssr with a custom storage does NOT auto-parse the hash.
 * We extract the tokens manually and call setSession() to write them
 * to the .deepvortexai.art cookie before redirecting home.
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
      // Parse the URL hash manually — createBrowserClient with custom storage
      // does not do this automatically.
      const hash = window.location.hash.slice(1); // strip leading #
      const params = new URLSearchParams(hash);
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        // Write the session into the custom cookie storage
        const { error: setError } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
        if (setError) {
          setError(setError.message);
          return;
        }
        window.location.replace("/");
        return;
      }

      // No hash tokens — check if a session already exists (e.g. cross-subdomain cookie)
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { setError(sessionError.message); return; }
      if (data.session)  { window.location.replace("/"); return; }

      // Last resort: wait for SIGNED_IN then redirect, with 3s hard fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          window.location.replace("/");
        }
      });
      setTimeout(() => { subscription.unsubscribe(); window.location.replace("/"); }, 3000);
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
