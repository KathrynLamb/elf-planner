// src/components/MiniChatSection.tsx
"use client";

import * as React from "react";
import { GeneratePlanButton } from "./GeneratePlanButton";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function MiniChatSection() {
  const [sessionId] = React.useState(() => {
    if (typeof window === "undefined") return "";
    const existing = window.localStorage.getItem("elf-mini-session-id");
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem("elf-mini-session-id", id);
    return id;
  });

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "m-1",
      role: "assistant",
      content:
        "Hey there. Tell me about your kiddos and what kind of elf experience you are looking for. 🎄",
    },
  ]);

  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasPreview, setHasPreview] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);

  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

  // keep view pinned to latest message
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    const userMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      role: "user",
      content: text,
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setError(null);
    setIsLoading(true);
    setIsThinking(true);

    try {
      const res = await fetch("/api/elf-mini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHasPreview(true);
    } catch (err: any) {
      console.error("[MiniChatSection] error", err);
      setError(
        err?.message ||
          "Oops, the North Pole wifi dropped. Please try again in a moment.",
      );
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  }

  return (
    <section
      id="mini-chat"
      className="relative flex w-full items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-start">
        {/* Copy */}
        <header className="w-full max-w-xl text-center lg:text-left">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Try a free mini chat with Merry
          </h2>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Type one or two sentences about your kid and December. Merry will
            reply with a tiny preview of a few Elf mornings she&apos;d plan just
            for you.
          </p>
        </header>

        {/* Phone-style chat mockup */}
        <div className="w-full max-w-sm lg:max-w-md">
          <div className="relative mx-auto rounded-[36px] border border-slate-800 bg-slate-950/95 shadow-[0_24px_90px_rgba(0,0,0,0.9)]">
            {/* Status bar notch-ish */}
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-20 rounded-full bg-slate-700/80" />
            </div>

            {/* Top bar like Messenger */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 via-rose-500 to-amber-400 shadow-md" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-50">
                    Merry the Elf
                  </span>
                  <span className="text-[11px] text-emerald-300">
                    Typically replies in seconds
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-6 w-6 rounded-full border border-slate-700/80" />
                <span className="h-6 w-6 rounded-full border border-slate-700/80" />
              </div>
            </div>

            {/* Chat area with twinkle background */}
            <div className="relative">
              <div className="absolute inset-0 bg-[url('/twinkle.png')] bg-cover bg-center opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/85 to-slate-950/95" />

              <div
                ref={chatScrollRef}
                className="relative flex max-h-[420px] min-h-[260px] flex-col space-y-3 overflow-y-auto px-3 pb-4 pt-3 sm:px-4 sm:pt-4"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "assistant"
                        ? "flex justify-start"
                        : "flex justify-end"
                    }
                  >
                    <div
                      className={
                        m.role === "assistant"
                          ? "max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800/95 px-4 py-2.5 text-left text-[13px] text-slate-50 shadow-md shadow-black/30"
                          : "max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-400 px-4 py-2.5 text-right text-[13px] text-slate-950 shadow-md shadow-emerald-500/40"
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-800/95 px-3 py-2 text-[11px] text-slate-200 shadow-md shadow-black/30">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.12s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:0.24s]" />
                      </span>
                      <span>Merry is thinking…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="px-4 pt-2 text-[11px] text-rose-300 sm:text-xs">
                {error}
              </p>
            )}

            {/* Input like Messenger */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-slate-800 bg-slate-900/95 px-3 py-3 sm:px-4"
            >
              <div className="flex-1 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-[13px] text-white shadow-inner shadow-slate-900/70">
                <input
                  className="w-full bg-transparent text-[13px] text-white placeholder:text-slate-500 focus:outline-none"
                  placeholder="Tell Merry about your kid and December…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="inline-flex h-10 min-w-[72px] items-center justify-center rounded-full bg-emerald-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </div>

          {/* Upsell once they’ve seen a preview */}
          {hasPreview && (
            <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-left text-sm text-slate-100">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Ready to get your full plan?
              </p>
              <p className="mb-3 text-xs text-slate-200 sm:text-sm">
                Check out securely with PayPal and Merry will conjure your full
                24-night Elf plan.
              </p>
              <GeneratePlanButton sessionId={sessionId} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
