"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_subscribed: boolean;
  message_count: number;
}

interface Props {
  onStatusChange?: (isSubscribed: boolean, messageCount: number) => void;
}

export default function HubHeader({ onStatusChange }: Props) {
  const supabase = createClient();

  // Auth state comes from the app-level AuthProvider — no local subscription needed
  const { user, ready } = useAuth();

  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [showAuth,  setShowAuth]  = useState(false);
  const [email,     setEmail]     = useState("");
  const [authStep,  setAuthStep]  = useState<"form" | "sent">("form");
  const [authMsg,   setAuthMsg]   = useState("");
  const [sending,   setSending]   = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError,   setCheckoutError]   = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Reload profile whenever the authenticated user changes
  useEffect(() => {
    if (!ready) return;
    if (user) {
      loadProfile(user.id);
    } else {
      setProfile(null);
      onStatusChange?.(false, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ready]);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, is_subscribed, message_count")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data as Profile);
      onStatusChange?.(data.is_subscribed ?? false, data.message_count ?? 0);
    }
  }

  async function startCheckout() {
    if (!user) { setShowAuth(true); return; }
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const res  = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (data.error) { setCheckoutError(data.error); return; }
      if (data.url)   { window.location.href = data.url; return; }
      setCheckoutError("Could not start checkout. Please try again.");
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true); setAuthMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) setAuthMsg(error.message);
    else       setAuthStep("sent");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    // session state is cleared automatically by AuthProvider's onAuthStateChange
    setProfile(null);
  }

  function closeAuth() {
    setShowAuth(false);
    setAuthStep("form");
    setAuthMsg("");
  }

  const displayName  = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "User";
  const initials     = displayName.slice(0, 2).toUpperCase();
  const avatarUrl    = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const isSubscribed = profile?.is_subscribed ?? false;

  return (
    <>
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="particle-dot"
          style={{ left: `${10 + i * 15}%`, animationDelay: `${i * 1.3}s`, animationDuration: `${7 + i}s` }}
        />
      ))}

      <header className="hub-header">
        <div className="logo-zone">
          <Image
            src="/real.png"
            alt="Deep Vortex AI"
            width={140}
            height={140}
            priority={true}
            className="logo-img"
            style={{ objectFit: "contain", filter: "drop-shadow(0 0 18px rgba(255,215,100,0.45)) drop-shadow(0 0 36px rgba(255,215,100,0.2))" }}
          />
        </div>

        <h1 className="hub-title">DΞΞP VORTΞX AI</h1>
        <p className="hub-subtitle">AI Chat Suite</p>
        <p className="hub-tagline">4 frontier models · one subscription</p>

        <div className="pills-row">
          <a href="https://deepvortexai.art" className="hub-pill clickable" style={{ textDecoration: "none" }}>
            <span className="pill-icon">🏠</span><span>Hub</span>
          </a>

          {/* Status pill */}
          {user ? (
            isSubscribed ? (
              <div className="hub-pill credits-pill">
                <span className="pill-icon">✦</span>
                <span>Unlimited Access</span>
              </div>
            ) : (
              <div className="hub-pill" style={{ borderColor: "rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.6)" }}>
                <span className="pill-icon">🎁</span>
                <span>Free trial active</span>
              </div>
            )
          ) : (
            <button className="hub-pill credits-pill clickable" onClick={() => setShowAuth(true)}>
              <span className="pill-icon">🎁</span>
              <span>Sign in — try it free</span>
            </button>
          )}

          {/* Subscribe CTA */}
          {!isSubscribed && (
            <>
              <button
                className="hub-pill buy-pill"
                onClick={startCheckout}
                disabled={checkoutLoading}
                style={checkoutLoading ? { opacity: 0.6, cursor: "wait" } : undefined}
              >
                <span className="pill-icon">⚡</span>
                <span>{checkoutLoading ? "Redirecting…" : "Get Unlimited Access — $6.99/mo"}</span>
              </button>
              {checkoutError && (
                <p style={{ fontSize: "0.72rem", color: "#f87171", margin: "0.2rem 0 0", textAlign: "center", width: "100%" }}>
                  {checkoutError}
                </p>
              )}
            </>
          )}

          {/* Profile / Sign In */}
          {user ? (
            <div className="hub-pill profile-pill">
              {avatarUrl ? (
                <div className="profile-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl} alt={displayName} />
                </div>
              ) : (
                <div className="profile-avatar-fb">{initials}</div>
              )}
              <span className="profile-name">{displayName}</span>
              <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
            </div>
          ) : (
            <button className="hub-pill clickable" onClick={() => setShowAuth(true)}>
              <span className="pill-icon">🔐</span><span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Auth modal — rendered via portal so drawer transforms don't clip it */}
      {showAuth && mounted && createPortal(
        <div className="modal-overlay" onClick={closeAuth}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeAuth}>✕</button>
            {authStep === "form" ? (
              <>
                <p className="modal-title">Welcome to Deep Vortex AI</p>
                <p className="modal-subtitle">Sign in to try it free, then subscribe for unlimited access</p>
                <button className="google-btn" onClick={handleGoogleSignIn}>
                  <span>🔐</span> Continue with Google
                </button>
                <div className="divider"><span>or</span></div>
                <form onSubmit={handleMagicLink}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="email-input"
                    required
                  />
                  <button type="submit" className="magic-btn" disabled={sending}>
                    {sending ? "Sending…" : "Send Magic Link"}
                  </button>
                </form>
                {authMsg && <p className="modal-msg error">{authMsg}</p>}
              </>
            ) : (
              <>
                <p className="success-icon">✉️</p>
                <p className="modal-title" style={{ textAlign: "center" }}>Check your email</p>
                <p className="modal-msg">Magic link sent to <strong>{email}</strong></p>
                <p className="modal-msg" style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.6 }}>
                  Click the link in the email, then return here to start chatting.
                </p>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
