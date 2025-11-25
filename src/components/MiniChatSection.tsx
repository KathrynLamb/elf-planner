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

  // Always keep view pinned to the latest message
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isThinking, hasPreview]);

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
          "Oops, the North Pole wifi dropped. Please try again in a moment."
      );
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  }

  return (
    <section
      id="mini-chat"
      className="relative w-full bg-slate-950 text-slate-50"
    >
      {/* This wrapper makes the chat feel like a full-screen view on mobile */}
      <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-0 sm:px-4 sm:py-12">
        <div className="relative flex flex-1 flex-col rounded-none border-x-0 border-t-0 border-b border-slate-800 bg-gradient-to-b from-slate-900/95 to-slate-950 sm:rounded-3xl sm:border sm:shadow-[0_24px_80px_rgba(15,23,42,0.9)]">
          {/* Chat header (like a Messenger convo header) */}
          <header className="flex items-center gap-3 border-b border-slate-800/70 px-4 py-3 sm:px-5 sm:py-4">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 shadow-md sm:h-10 sm:w-10" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold sm:text-base">
                Merry the Elf
              </span>
              <span className="text-[11px] text-emerald-300 sm:text-xs">
                Typically replies in seconds
              </span>
            </div>
          </header>

          {/* Messages + upsell scroll area */}
          <div
            ref={chatScrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5"
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
                      ? "max-w-[88%] rounded-2xl bg-slate-800/95 px-4 py-3 text-left text-sm text-slate-50 sm:text-[15px]"
                      : "max-w-[88%] rounded-2xl bg-emerald-400 px-4 py-3 text-right text-sm text-slate-950 shadow-lg shadow-emerald-400/40 sm:text-[15px]"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/90 px-3 py-2 text-[11px] text-slate-200">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.12s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:0.24s]" />
                  <span>Merry is thinking…</span>
                </div>
              </div>
            )}

            {hasPreview && (
              <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-left text-xs text-slate-100 sm:text-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Ready to get your full plan?
                </p>
                <p className="mb-3 text-[11px] text-slate-200 sm:text-xs">
                  Check out securely with PayPal and Merry will conjure your
                  full 24-night Elf plan – emailed to you each morning so you
                  have all day to grab anything you need.
                </p>
                <GeneratePlanButton sessionId={sessionId} />
              </div>
            )}

            {/* Padding at bottom so last bubble doesn't sit under the input */}
            <div className="h-3 sm:h-4" />
          </div>

          {/* Error message */}
          {error && (
            <p className="px-4 pb-1 text-[11px] text-rose-300 sm:px-5 sm:text-xs">
              {error}
            </p>
          )}

          {/* Input row – sticks to bottom like Messenger */}
          <form
            onSubmit={handleSend}
            className="sticky bottom-0 border-t border-slate-800/80 bg-slate-950/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 sm:rounded-b-3xl sm:px-5 sm:pb-3"
          >
            <div className="flex items-end gap-2">
              <div className="flex flex-1 items-center rounded-full bg-slate-900/90 px-4 py-2.5 ring-1 ring-emerald-400/40 focus-within:ring-emerald-300/90">
                <input
                  className="flex-1 bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none sm:text-[15px]"
                  placeholder="Tell Merry about your kid and December…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoCapitalize="sentences"
                  autoCorrect="on"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="inline-flex h-11 min-w-[70px] items-center justify-center rounded-full bg-emerald-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
