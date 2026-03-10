"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HubHeader from "@/components/HubHeader";
import { createClient } from "@/lib/supabase/client";

// ── Model definitions ──────────────────────────────────────────────────────
const MODELS = [
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    replicateId: "openai/gpt-5",
    icon: "◆",
    skill: "Ultimate Reasoning & Creativity",
    badge: "State of the Art",
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
    badge: "Advanced Reasoning",
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
    badge: "Multimodal",
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
    badge: "Cost-Efficient",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];
interface Message { role: "user" | "assistant"; content: string; }

// ── Page ───────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const supabase = createClient();

  const [selectedModel, setSelectedModel] = useState<ModelId>("gpt-5");
  const [credits, setCredits]             = useState<number | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [streamContent, setStreamContent] = useState("");
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const model = MODELS.find((m) => m.id === selectedModel)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // Real-time credits refresh after each message
  const refreshCredits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();
    if (data) setCredits(data.credits ?? 0);
  }, [supabase]);

  // ── Send ───────────────────────────────────────────────────────────────
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
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong.");
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
      await refreshCredits();
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
      {/* Hub-identical header */}
      <HubHeader onCreditsChange={setCredits} />

      {/* Credits sync indicator */}
      {credits !== null && (
        <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
          {credits} credit{credits !== 1 ? "s" : ""} remaining · 1 credit per message
        </p>
      )}

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
              onClick={() => { setSelectedModel(m.id); setMessages([]); setError(null); }}
            >
              <span className="tab-glow" style={{ background: m.gradient, position: "absolute", inset: 0, opacity: active ? 0.07 : 0, pointerEvents: "none" }} />
              <span className="tab-icon">{m.icon}</span>
              <p className="tab-name" style={{ color: active ? m.color : "var(--text-bright)" }}>{m.name}</p>
              <p className="tab-skill">{m.skill}</p>
              <span className="tab-badge" style={{ color: m.color, borderColor: m.color }}>
                {active && <span className="selected-dot" />}
                {active ? "Active" : m.badge}
              </span>
            </button>
          );
        })}
      </div>

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
                      <div className="typing-dots"><span /><span /><span /></div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="chat-error">
              {error}
              {(error.toLowerCase().includes("credit") ||
                error.toLowerCase().includes("subscri")) && (
                <a href="https://deepvortexai.art/#pricing">Buy Credits →</a>
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
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder={`Message ${model.name}…`}
              rows={1}
              disabled={loading}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {loading ? (
              <button type="button" className="stop-btn" onClick={() => abortRef.current?.abort()}>
                Stop
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim()}
                style={{ background: model.gradient }}
              >
                Send
              </button>
            )}
          </form>
          <p className="input-hint">Shift+Enter for new line · 1 credit per message</p>
        </div>
      </div>
    </div>
  );
}
