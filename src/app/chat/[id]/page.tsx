"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AI_MODELS, type AIModel } from "@/lib/models";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const modelId = params.id as string;
  const model: AIModel | undefined = AI_MODELS[modelId];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const justSubscribed = searchParams.get("subscribed") === "true";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!model) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center space-y-4">
          <p className="text-zinc-400 text-lg">Model not found.</p>
          <Link href="/pricing" className="text-violet-400 underline">
            View available models
          </Link>
        </div>
      </main>
    );
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          messages: [...messages, userMessage],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/pricing" className="text-zinc-500 hover:text-zinc-300 transition">
            ← Back
          </Link>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-sm`}>
            {model.icon}
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">{model.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{model.provider}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {model.traits.slice(0, 2).map((t) => (
              <span
                key={t}
                className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Welcome card shown before first message */}
          {messages.length === 0 && (
            <div className="mt-8">
              {justSubscribed && (
                <div className="mb-6 p-3 rounded-xl bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 text-sm text-center">
                  Subscription active. Welcome to Replica Hub.
                </div>
              )}
              <div className={`rounded-2xl bg-gradient-to-br ${model.color} p-px`}>
                <div className="rounded-2xl bg-zinc-950 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{model.icon}</span>
                    <div>
                      <h1 className="text-xl font-bold">{model.name}</h1>
                      <p className={`text-sm ${model.accentColor}`}>{model.tagline}</p>
                    </div>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{model.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {model.traits.map((trait) => (
                      <span
                        key={trait}
                        className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-center text-zinc-600 text-sm mt-6">
                Send a message to start the conversation
              </p>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-xs mr-2 mt-1 shrink-0`}>
                  {model.icon}
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-zinc-800 text-white rounded-tr-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-start gap-2">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-xs shrink-0`}>
                {model.icon}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-300 text-sm text-center">
              {error}
              {error.includes("subscription") && (
                <Link href="/pricing" className="ml-2 underline text-violet-400">
                  Subscribe →
                </Link>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={sendMessage} className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder={`Message ${model.name}...`}
              rows={1}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 transition max-h-36 overflow-y-auto"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r ${model.color} text-white disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90`}
            >
              Send
            </button>
          </form>
          <p className="text-xs text-zinc-600 mt-2 text-center">
            Shift+Enter for new line · 500 messages/month included
          </p>
        </div>
      </div>
    </div>
  );
}
