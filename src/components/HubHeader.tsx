"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  const [user, setUser]         = useState<User | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail]       = useState("");
  const [authStep, setAuthStep] = useState<"form" | "sent">("form");
  const [authMsg, setAuthMsg]   = useState("");
  const [sending, setSending]   = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) { setUser(data.session.user); loadProfile(data.session.user.id); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); }
      else { setUser(null); setProfile(null); }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, is_subscribed, message_count")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data as Profile);
        onStatusChange?.(data.is_subscribed ?? false, data.message_count ?? 0);
      }
    } finally { fetchingRef.current = false; }
  }

  async function startCheckout() {
    if (!user) { setShowAuth(true); return; }
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true); setAuthMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) setAuthMsg(error.message);
    else       setAuthStep("sent");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  }

  const displayName = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "User";
  const initials    = displayName.slice(0, 2).toUpperCase();
  const avatarUrl   = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const isSubscribed = profile?.is_subscribed ?? false;

  return (
    <>
      {[...Array(6)].map((_, i) => (
        <span key={i} className="particle-dot" style={{ left: `${10 + i * 15}%`, animationDelay: `${i * 1.3}s`, animationDuration: `${7 + i}s` }} />
      ))}

      <header className="hub-header">
        <div className="logo-zone">
          <span className="orbit-ring orbit-ring-1" />
          <span className="orbit-ring orbit-ring-2" />
          <span className="orbit-ring orbit-ring-3" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Deep Vortex AI" className="logo-img" width={96} height={96} />
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
              <div className="hub-pill" style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-dim)" }}>
                <span className="pill-icon">🎁</span>
                <span>5 free messages</span>
              </div>
            )
          ) : (
            <button className="hub-pill credits-pill clickable" onClick={() => setShowAuth(true)}>
              <span className="pill-icon">🎁</span>
              <span>Sign in — 5 free messages</span>
            </button>
          )}

          {/* Subscribe CTA */}
          {!isSubscribed && (
            <button className="hub-pill buy-pill" onClick={startCheckout}>
              <span className="pill-icon">⚡</span>
              <span>Get Unlimited Access — $6.99/mo</span>
            </button>
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

      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuth(false)}>✕</button>
            {authStep === "form" ? (
              <>
                <p className="modal-title">Welcome to Deep Vortex AI</p>
                <p className="modal-subtitle">Sign in to get 5 free messages, then subscribe for unlimited access</p>
                <button className="google-btn" onClick={handleGoogleSignIn}>
                  <span>🔐</span> Continue with Google
                </button>
                <div className="divider"><span>or</span></div>
                <form onSubmit={handleMagicLink}>
                  <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="email-input" required />
                  <button type="submit" className="magic-btn" disabled={sending}>{sending ? "Sending…" : "Send Magic Link"}</button>
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
