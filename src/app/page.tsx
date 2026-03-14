"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import HubHeader from "@/components/HubHeader";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const FREE_TRIAL_LIMIT         = 8;
const SUBSCRIBER_MONTHLY_LIMIT = 450;

const MODELS = [
  {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    icon: "✦",
    skill: "Writing & Analysis",
    description: "Best for writing, analysis & nuanced conversation",
    color: "#a855f7",
    gradient: "linear-gradient(135deg,#a855f7,#7c3aed)",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek v3.1",
    provider: "DeepSeek",
    icon: "🧠",
    skill: "Coding & Logic",
    description: "Fast & affordable, great for general tasks",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
  },
  {
    id: "gpt5",
    name: "GPT-5",
    provider: "OpenAI",
    icon: "⚡",
    skill: "Frontier Reasoning",
    description: "OpenAI's most capable model — powerful reasoning, coding and analysis.",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg,#06b6d4,#0284c7)",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    icon: "◆",
    skill: "Deep Reasoning",
    description: "Advanced reasoning & complex problem solving",
    color: "#f97316",
    gradient: "linear-gradient(135deg,#f97316,#ea580c)",
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];
interface Message { role: "user" | "assistant"; content: string; }

export default function ChatPage() {
  const supabase = createClient();

  // Session from app-level AuthProvider — single source of truth, no race conditions
  const { session, ready: authReady } = useAuth();
  const isAuthenticated = !!session;

  const [selectedModel, setSelectedModel]       = useState<ModelId>("claude-sonnet");
  const [activeDrawer,  setActiveDrawer]        = useState<"models" | "account" | null>(null);
  const [isSubscribed,  setIsSubscribed]        = useState(false);
  const [messageCount,  setMessageCount]        = useState(0);
  const [messages,      setMessages]            = useState<Message[]>([]);
  const [streamContent, setStreamContent]       = useState("");
  const [input,         setInput]               = useState("");
  const [loading,       setLoading]             = useState(false);
  const [error,         setError]               = useState<string | null>(null);
  const [showPaywall,   setShowPaywall]         = useState(false);
  const [showMonthlyLimit, setShowMonthlyLimit] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const model = MODELS.find((m) => m.id === selectedModel)!;

  // When a user logs in (userId changes), clear any stale paywall state.
  // This prevents false-positive payment popups from a previous session.
  useEffect(() => {
    if (session?.user?.id) {
      setShowPaywall(false);
      setShowMonthlyLimit(false);
      setError(null);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  const refreshStatus = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_subscribed, message_count")
      .eq("id", session.user.id)
      .single();
    if (data) {
      const subscribed = data.is_subscribed ?? false;
      const count      = data.message_count  ?? 0;
      setIsSubscribed(subscribed);
      setMessageCount(count);
      // Only trigger paywall/limit modals AFTER a real message — not on mount
      if (!subscribed && count >= FREE_TRIAL_LIMIT)         setShowPaywall(true);
      if (subscribed  && count >= SUBSCRIBER_MONTHLY_LIMIT) setShowMonthlyLimit(true);
    }
  }, [session, supabase]);

  async function startCheckout() {
    try {
      const res  = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (data.error) { setError(data.error); return; }
      if (data.url)   { window.location.href = data.url; return; }
      setError("Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Gate at send time — open account drawer if no session
    if (!session) {
      setActiveDrawer("account");
      return;
    }
    const freshSession = session;

    const userMsg: Message = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError(null);
    setStreamContent("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pass token explicitly — cookies alone can silently fail in serverless
          "Authorization": `Bearer ${freshSession.access_token}`,
        },
        signal: ctrl.signal,
        body: JSON.stringify({ modelId: selectedModel, messages: history }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; paywall?: boolean; monthlyLimit?: boolean; authRequired?: boolean };
        if (res.status === 401 || data.authRequired) {
          // Session expired mid-session — sign out clears AuthProvider context;
          // open account drawer so user can re-authenticate cleanly
          await supabase.auth.signOut();
          setMessages((p) => p.slice(0, -1));
          setActiveDrawer("account");
        } else if (data.paywall && session) {
          // Only show paywall if there IS a valid session (real billing limit).
          // Never show it for an auth error misrouted as a paywall response.
          setShowPaywall(true);
          setMessages((p) => p.slice(0, -1));
        } else if (data.monthlyLimit && session) {
          setShowMonthlyLimit(true);
          setMessages((p) => p.slice(0, -1));
        } else {
          setError(data.error ?? "Something went wrong.");
        }
        return;
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = dec.decode(value, { stream: true });
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const p = JSON.parse(payload) as { text?: string; error?: string };
            if (p.error) { setError(p.error); return; }
            if (p.text)  { acc += p.text; setStreamContent(acc); }
          } catch { /* partial */ }
        }
      }

      if (acc) setMessages((prev) => [...prev, { role: "assistant", content: acc }]);
      await refreshStatus();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Network error. Please try again.");
      }
    } finally {
      setStreamContent("");
      setLoading(false);
      abortRef.current = null;
    }
  }

  function selectModel(id: ModelId) {
    setSelectedModel(id);
    setMessages([]);
    setError(null);
    setShowPaywall(false);
    setShowMonthlyLimit(false);
    setActiveDrawer(null);
  }

  const trialEnded = !isSubscribed && messageCount >= FREE_TRIAL_LIMIT;

  return (
    <div className="app-shell">

      {/* Drawer backdrop */}
      {activeDrawer && (
        <div className="drawer-backdrop" onClick={() => setActiveDrawer(null)} />
      )}

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="top-bar">
        <div className="top-logo">
          <Image
            src="/logotinyreal.webp"
            alt="Deep Vortex AI Logo"
            width={32}
            height={32}
            priority
            style={{ objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(0,0,0,0.7)) drop-shadow(0 0 2px rgba(0,0,0,1))" }}
          />
          <h1 className="top-title">DΞΞP VORTΞX AI</h1>
        </div>

        {/* Current model pill */}
        <button
          className="top-model-pill"
          style={{ borderColor: model.color, color: model.color }}
          onClick={() => setActiveDrawer(activeDrawer === "models" ? null : "models")}
        >
          <span style={{ fontSize: "0.9rem" }}>{model.icon}</span>
          <span>{model.name}</span>
        </button>
      </header>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div className="messages-area">
        {messages.length === 0 && !loading ? (
          <div className="chat-empty">
            <span className="empty-icon">{model.icon}</span>
            <span className="empty-title">Start a conversation</span>
            <span className="empty-sub" style={{ color: model.color }}>
              {model.name} · {model.skill}
            </span>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="msg-avatar" style={{ background: model.gradient }}>
                    {model.icon}
                  </div>
                )}
                <div className={`msg-bubble ${msg.role}`}>{msg.content}</div>
              </div>
            ))}

            {loading && (
              <div className="msg-row assistant">
                <div className="msg-avatar" style={{ background: model.gradient }}>
                  {model.icon}
                </div>
                <div className="msg-bubble assistant">
                  {streamContent ? (
                    <>{streamContent}<span className="cursor-blink" /></>
                  ) : (
                    <div className="skeleton-row">
                      <span className="skeleton-dot" />
                      <span className="skeleton-dot" />
                      <span className="skeleton-dot" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {error && !showPaywall && (
          <div className="chat-error">
            {error}
            {error.toLowerCase().includes("subscri") && (
              <a onClick={startCheckout} style={{ cursor: "pointer" }}>Subscribe →</a>
            )}
          </div>
        )}

        {/* Trial status hint (non-intrusive) */}
        {!isSubscribed && !trialEnded && messages.length > 0 && (
          <p style={{
            textAlign: "center", fontSize: "0.65rem",
            color: "rgba(212,175,55,0.3)", marginBottom: "0.5rem",
          }}>
            {FREE_TRIAL_LIMIT - messageCount} free message{FREE_TRIAL_LIMIT - messageCount !== 1 ? "s" : ""} remaining
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Floating input ───────────────────────────────────────────────── */}
      <div className={`input-float${activeDrawer ? " hidden" : ""}`}>
        {/* Sign-in prompt — only shown once auth state has resolved */}
        {authReady && !isAuthenticated ? (
          <button
            className="signin-prompt"
            onClick={() => setActiveDrawer("account")}
          >
            <span style={{ fontSize: "0.9rem" }}>🔐</span>
            Sign in to start chatting — it&apos;s free
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", opacity: 0.7 }}>→</span>
          </button>
        ) : isAuthenticated ? (
          <form className="input-row" onSubmit={sendMessage}>
            <textarea
              className="chat-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder={`Message ${model.name}…`}
              rows={1}
              disabled={loading || showPaywall || showMonthlyLimit}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {loading ? (
              <button
                type="button"
                className="stop-btn"
                onClick={() => abortRef.current?.abort()}
              >
                ■
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim() || showPaywall || showMonthlyLimit}
                style={{ background: model.gradient }}
              >
                ↑
              </button>
            )}
          </form>
        ) : null}
        <p className="input-hint">
          {isAuthenticated ? "Shift+Enter for new line" : "Free trial · no credit card required"}
        </p>
      </div>

      {/* ── Models drawer (always mounted) ───────────────────────────────── */}
      <div className={`bottom-drawer${activeDrawer === "models" ? " open" : ""}`}>
        <div className="drawer-handle" />
        <p className="drawer-title">Select Model</p>
        <div className="model-drawer-grid">
          {MODELS.map((m) => {
            const active = m.id === selectedModel;
            return (
              <button
                key={m.id}
                className={`model-card${active ? " active" : ""}`}
                style={active ? { borderColor: m.color } : undefined}
                onClick={() => selectModel(m.id)}
              >
                <span
                  className="mc-glow"
                  style={{ background: m.gradient, opacity: active ? 0.06 : 0 }}
                />
                <span className="mc-icon">{m.icon}</span>
                <span className="mc-name" style={{ color: active ? m.color : undefined }}>
                  {m.name}
                </span>
                <span className="mc-provider">{m.provider}</span>
                <span className="mc-desc">{m.description}</span>
                {active && (
                  <span className="mc-active" style={{ color: m.color }}>● Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Account drawer (always mounted — keeps HubHeader auth listener alive) */}
      <div className={`bottom-drawer account-drawer${activeDrawer === "account" ? " open" : ""}`}>
        <div className="drawer-handle" />
        <HubHeader
          onStatusChange={(sub, count) => {
            setIsSubscribed(sub);
            setMessageCount(count);
          }}
        />
      </div>

      {/* ── Bottom navigation ────────────────────────────────────────────── */}
      <nav className="bottom-nav">
        <button
          className={`nav-tab${!activeDrawer ? " active" : ""}`}
          onClick={() => setActiveDrawer(null)}
        >
          <span className="nav-icon">💬</span>
          <span className="nav-label">Chat</span>
        </button>
        <button
          className={`nav-tab${activeDrawer === "models" ? " active" : ""}`}
          onClick={() => setActiveDrawer(activeDrawer === "models" ? null : "models")}
        >
          <span className="nav-icon">⊞</span>
          <span className="nav-label">Models</span>
        </button>
        <button
          className={`nav-tab${activeDrawer === "account" ? " active" : ""}`}
          onClick={() => setActiveDrawer(activeDrawer === "account" ? null : "account")}
        >
          <span className="nav-icon">◎</span>
          <span className="nav-label">Account</span>
        </button>
      </nav>

      {/* ── Paywall modal ────────────────────────────────────────────────── */}
      {showPaywall && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div style={{
            background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.45)",
            borderRadius: 20, padding: "2.2rem 2rem 1.8rem",
            maxWidth: 400, width: "100%", textAlign: "center",
            boxShadow: "0 0 60px rgba(212,175,55,0.12)",
          }}>
            <p style={{ fontSize: "2.2rem", marginBottom: "0.6rem" }}>⚡</p>
            <p className="modal-title" style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
              Free Trial Complete
            </p>
            <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.55)", marginBottom: "1.6rem", lineHeight: 1.65 }}>
              You&apos;ve used all {FREE_TRIAL_LIMIT} free messages.
              Subscribe to unlock unlimited access to all 4 frontier AI models.
            </p>
            <button
              onClick={startCheckout}
              style={{
                width: "100%", padding: "0.85rem 1.4rem", borderRadius: 50,
                background: "linear-gradient(135deg,#B8860B,#D4AF37)",
                border: "none", color: "#0a0a0a",
                fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: "0.75rem",
              }}
            >
              ⚡ Get Unlimited Access — $6.99/mo
            </button>
            <p style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.35)" }}>
              Cancel anytime · Instant access after payment
            </p>
          </div>
        </div>
      )}

      {/* ── Monthly limit modal ──────────────────────────────────────────── */}
      {showMonthlyLimit && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div style={{
            background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.35)",
            borderRadius: 20, padding: "2.2rem 2rem 1.8rem",
            maxWidth: 400, width: "100%", textAlign: "center",
            boxShadow: "0 0 60px rgba(212,175,55,0.08)",
          }}>
            <p style={{ fontSize: "2.2rem", marginBottom: "0.9rem" }}>💬</p>
            <p style={{ fontSize: "0.93rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.7, marginBottom: "1.6rem" }}>
              You&apos;ve reached your monthly limit. You&apos;ve been chatting a lot — go take care of your friends.
            </p>
            <button
              onClick={() => setShowMonthlyLimit(false)}
              style={{
                padding: "0.72rem 1.8rem", borderRadius: 50,
                border: "1px solid rgba(212,175,55,0.4)",
                background: "transparent", color: "#E8C87C",
                fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
