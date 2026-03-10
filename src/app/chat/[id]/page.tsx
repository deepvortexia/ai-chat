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
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const justSubscribed = searchParams.get("subscribed") === "true";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

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
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setStreamingContent("");

    // Allow cancellation
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ modelId, messages: updatedMessages }),
      });

      // Non-streaming error (auth, usage gate, etc.)
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Read SSE stream token by token
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });

        // Each SSE message is "data: <json>\n\n"
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              setError(parsed.error);
              return;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingContent(accumulated);
            }
          } catch {
            // partial chunk — safe to ignore
          }
        }
      }

      // Commit the completed streamed message into the messages list
      if (accumulated) {
        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Network error. Please try again.");
      }
    } finally {
      setStreamingContent("");
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stopStream() {
    abortRef.current?.abort();
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/pricing" className="text-zinc-500 hover:text-zinc-300 transition">
            ← Back
          </Link>
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-sm`}
          >
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
          {/* Welcome card */}
          {messages.length === 0 && !loading && (
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

          {/* Committed messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-xs mr-2 mt-1 shrink-0`}
                >
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

          {/* Live streaming bubble */}
          {loading && (
            <div className="flex items-start gap-2">
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-xs shrink-0`}
              >
                {model.icon}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                {streamingContent ? (
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-0.5 h-3.5 bg-zinc-400 ml-0.5 animate-pulse align-middle" />
                  </p>
                ) : (
                  <div className="flex gap-1.5 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-300 text-sm text-center">
              {error}
              {error.toLowerCase().includes("subscription") && (
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
              disabled={loading}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 transition max-h-36 overflow-y-auto disabled:opacity-50"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {loading ? (
              <button
                type="button"
                onClick={stopStream}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={`px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r ${model.color} text-white disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90`}
              >
                Send
              </button>
            )}
          </form>
          <p className="text-xs text-zinc-600 mt-2 text-center">
            Shift+Enter for new line · 500 messages/month included
          </p>
        </div>
      </div>
    </div>
  );
}
