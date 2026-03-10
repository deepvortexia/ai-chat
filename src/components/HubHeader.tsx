"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
}

interface Props {
  /** Called after a successful sign-in so parent can refresh credits display */
  onCreditsChange?: (credits: number) => void;
}

export default function HubHeader({ onCreditsChange }: Props) {
  const supabase = createClient();
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail]     = useState("");
  const [authStep, setAuthStep] = useState<"form" | "sent">("form");
  const [authMsg, setAuthMsg] = useState("");
  const [sending, setSending] = useState(false);
  const fetchingRef = useRef(false);

  // ── Auth state ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        loadProfile(data.session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, credits")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data as Profile);
        onCreditsChange?.(data.credits ?? 0);
      }
    } finally {
      fetchingRef.current = false;
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
    setSending(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) { setAuthMsg(error.message); }
    else        { setAuthStep("sent"); }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  const displayName = profile?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ?? "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const credits   = profile?.credits ?? 0;

  return (
    <>
      {/* ── Floating particles ─────────────────────────────────────────── */}
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="particle-dot"
          style={{
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${7 + i}s`,
          }}
        />
      ))}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="hub-header">
        {/* Logo */}
        <div className="logo-zone">
          <span className="orbit-ring orbit-ring-1" />
          <span className="orbit-ring orbit-ring-2" />
          <span className="orbit-ring orbit-ring-3" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Deep Vortex AI" className="logo-img" width={96} height={96} />
        </div>

        <h1 className="hub-title">DΞΞP VORTΞX AI</h1>
        <p className="hub-subtitle">AI Chat Suite</p>
        <p className="hub-tagline">4 frontier models · one interface</p>

        {/* Pills */}
        <div className="pills-row">
          <a href="https://deepvortexai.art" className="hub-pill clickable" style={{ textDecoration: "none" }}>
            <span className="pill-icon">🏠</span>
            <span>Hub</span>
          </a>

          {user ? (
            <div className="hub-pill credits-pill">
              <span className="pill-icon">🏆</span>
              <span>{credits} credits</span>
            </div>
          ) : (
            <button className="hub-pill credits-pill clickable" onClick={() => setShowAuth(true)}>
              <span className="pill-icon">🏆</span>
              <span>Sign in — get 2 free credits</span>
            </button>
          )}

          <a href="https://deepvortexai.art/#pricing" className="hub-pill buy-pill" style={{ textDecoration: "none" }}>
            <span className="pill-icon">💳</span>
            <span>Buy Credits</span>
          </a>

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
            <button className="hub-pill clickable signin-pill" onClick={() => setShowAuth(true)}>
              <span className="pill-icon">🔐</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Auth Modal ────────────────────────────────────────────────── */}
      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuth(false)}>✕</button>

            {authStep === "form" ? (
              <>
                <p className="modal-title">Welcome to Deep Vortex AI</p>
                <p className="modal-subtitle">Sign in to start chatting with frontier models</p>

                <button className="google-btn" onClick={handleGoogleSignIn}>
                  <span>🔐</span> Continue with Google
                </button>

                <div className="divider"><span>or</span></div>

                <form onSubmit={handleMagicLink}>
                  <input
                    type="email" placeholder="your@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="email-input" required
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
