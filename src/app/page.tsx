"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HubHeader from "@/components/HubHeader";
import { createClient } from "@/lib/supabase/client";

const FREE_TRIAL_LIMIT = 10;

const MODELS = [
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    replicateId: "openai/gpt-5",
    icon: "◆",
    skill: "Ultimate Reasoning & Creativity",
    subNote: "Included in subscription",
    color: "#f97316",
    gradient: "linear-gradient(135deg,#f97316,#ea580c)",
  },
  {
    id: "claude-sonnet",
    name: "Claude 4.5",
    provider: "Anthropic",
    replicateId: "anthropic/claude-sonnet-4-5",
    icon: "✦",
    skill: "Nuanced Writing & Analysis",
    subNote: "Included in subscription",
    color: "#a855f7",
    gradient: "linear-gradient(135deg,#a855f7,#7c3aed)",
  },
  {
    id: "gemini-flash",
    name: "Gemini 2.5",
    provider: "Google",
    replicateId: "google/gemini-2.5-flash",
    icon: "⚡",
    skill: "Lightning Fast · 1M Context",
    subNote: "Included in subscription",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg,#06b6d4,#0284c7)",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek v3.1",
    provider: "DeepSeek",
    replicateId: "deepseek-ai/deepseek-v3",
    icon: "🧠",
    skill: "Coding & Logic Master",
    subNote: "Included in subscription",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];
interface Message { role: "user" | "assistant"; content: string; }

export default function ChatPage() {
  const supabase = createClient();

  const [selectedModel, setSelectedModel]   = useState<ModelId>("gpt-5");
  const [isSubscribed, setIsSubscribed]     = useState(false);
  const [messageCount, setMessageCount]     = useState(0);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [streamContent, setStreamContent]   = useState("");
  const [input, setInput]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [showPaywall, setShowPaywall]       = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const model = MODELS.find((m) => m.id === selectedModel)!;

  const trialRemaining = Math.max(0, FREE_TRIAL_LIMIT - messageCount);
  const onFreeTrial    = !isSubscribed;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // Refresh subscription status after each message
  const refreshStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_subscribed, message_count")
      .eq("id", user.id)
      .single();
    if (data) {
      setIsSubscribed(data.is_subscribed ?? false);
      setMessageCount(data.message_count ?? 0);
    }
  }, [supabase]);

  async function startCheckout() {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url, error: err } = await res.json();
    if (err) { setError(err); return; }
    if (url) window.location.href = url;
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

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
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ modelId: selectedModel, messages: history }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; paywall?: boolean };
        if (data.paywall) { setShowPaywall(true); setMessages((p) => p.slice(0, -1)); }
        else setError(data.error ?? "Something went wrong.");
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

  return (
    <div className="page-wrap">
      <HubHeader onStatusChange={(sub, count) => { setIsSubscribed(sub); setMessageCount(count); }} />

      {/* Status bar */}
      <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
        {isSubscribed
          ? "✦ Unlimited chat — subscription active"
          : trialRemaining > 0
            ? "🎁 Free trial active — try any model"
            : "Free trial ended · subscribe for unlimited access"}
      </p>

      {/* ── Model Tabs ────────────────────────────────────────────────── */}
      <p className="section-label">Select Model</p>
      <div className="model-tabs">
        {MODELS.map((m) => {
          const active = m.id === selectedModel;
          return (
            <button
              key={m.id}
              className={`model-tab${active ? " selected" : ""}`}
              style={active ? ({ borderColor: m.color } as React.CSSProperties) : undefined}
              onClick={() => { setSelectedModel(m.id); setMessages([]); setError(null); setShowPaywall(false); }}
            >
              <span className="tab-glow" style={{ background: m.gradient, position: "absolute", inset: 0, opacity: active ? 0.07 : 0, pointerEvents: "none" }} />
              <span className="tab-icon">{m.icon}</span>
              <p className="tab-name" style={{ color: active ? m.color : "var(--text-bright)" }}>{m.name}</p>
              <p className="tab-skill">{m.skill}</p>
              <span className="tab-badge" style={{ color: m.color, borderColor: m.color }}>
                {active && <span className="selected-dot" />}
                {active ? "Active" : m.subNote}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Paywall banner ────────────────────────────────────────────── */}
      {showPaywall && (
        <div style={{
          maxWidth: 900, margin: "0 auto 1rem", padding: "0 1rem",
        }}>
          <div style={{
            background: "rgba(212,175,55,0.06)",
            border: "1px solid rgba(212,175,55,0.35)",
            borderRadius: 14, padding: "1.2rem 1.5rem",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
          }}>
            <div>
              <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "var(--light-gold)", marginBottom: "0.25rem" }}>
                Free trial complete
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Your free trial is complete. Subscribe for unlimited access to all 4 models.
              </p>
            </div>
            <button
              onClick={startCheckout}
              style={{
                padding: "0.6rem 1.4rem", borderRadius: 50,
                background: "linear-gradient(135deg,#B8860B,#D4AF37)",
                border: "none", color: "#0a0a0a",
                fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              ⚡ Get Unlimited — $6.99/mo
            </button>
          </div>
        </div>
      )}

      {/* ── Chat ──────────────────────────────────────────────────────── */}
      <div className="chat-wrap">
        <div className="chat-messages">
          {messages.length === 0 && !loading ? (
            <div className="chat-empty">
              <span className="chat-empty-icon">{model.icon}</span>
              <span>
                Start a conversation with{" "}
                <strong style={{ color: model.color }}>{model.name}</strong>
              </span>
              {onFreeTrial && trialRemaining > 0 && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                  Free trial — no account needed to start
                </span>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <div className="msg-avatar" style={{ background: model.gradient }}>{model.icon}</div>
                  )}
                  <div className={`msg-bubble ${msg.role}`}>{msg.content}</div>
                </div>
              ))}

              {loading && (
                <div className="msg-row assistant">
                  <div className="msg-avatar" style={{ background: model.gradient }}>{model.icon}</div>
                  <div className="msg-bubble assistant">
                    {streamContent
                      ? <>{streamContent}<span className="cursor-blink" /></>
                      : <div className="typing-dots"><span /><span /><span /></div>}
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
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-wrap">
          <form onSubmit={sendMessage} className="chat-input-row">
            <textarea
              className="chat-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as React.FormEvent); }
              }}
              placeholder={`Message ${model.name}…`}
              rows={1}
              disabled={loading || showPaywall}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {loading ? (
              <button type="button" className="stop-btn" onClick={() => abortRef.current?.abort()}>Stop</button>
            ) : (
              <button type="submit" className="send-btn" disabled={!input.trim() || showPaywall} style={{ background: model.gradient }}>
                Send
              </button>
            )}
          </form>
          <p className="input-hint">
            Shift+Enter for new line ·{" "}
            {isSubscribed ? "Unlimited chat for subscribers" : trialRemaining > 0 ? "Free trial active" : "Subscribe for unlimited access"}
          </p>
        </div>
      </div>
    </div>
  );
}
