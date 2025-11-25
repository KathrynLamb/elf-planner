// src/components/MiniChatSection.tsx
"use client";

import * as React from "react";
import { GeneratePlanButton } from "./GeneratePlanButton";

export function MiniChatSection() {
  type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
  };

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
  const sectionRef = React.useRef<HTMLElement | null>(null);

  // Always keep view pinned to the latest message
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  function focusIntoView() {
    // On mobile, nudge the chat section so that the input + last messages
    // sit nicely above the keyboard (Safari behaviour is… quirky).
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

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
      ref={sectionRef}
      className="relative flex min-h-screen w-full items-stretch justify-center bg-slate-950 px-3 pb-[env(safe-area-inset-bottom,16px)] pt-3 sm:px-6 sm:pb-12 sm:pt-8"
    >
      {/* Chat shell – mobile should feel like a full-screen messenger view */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col rounded-3xl border border-slate-800/80 bg-slate-900/80 shadow-[0_24px_80px_rgba(15,23,42,0.9)]">
        {/* Header bar like a DM */}
        <header className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3">
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-rose-400 via-orange-400 to-yellow-300" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-50">
              Merry the Elf
            </span>
            <span className="text-[11px] font-medium text-emerald-300">
              Typically replies in seconds
            </span>
          </div>
        </header>

        {/* Messages area */}
        <div
          ref={chatScrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-3 pb-4 pt-3 sm:px-4 sm:pt-4"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "assistant" ? "flex justify-start" : "flex justify-end"
              }
            >
              <div
                className={
                  m.role === "assistant"
                    ? "inline-block max-w-[85%] rounded-2xl bg-slate-800 px-4 py-3 text-[13px] leading-relaxed text-slate-50"
                    : "inline-block max-w-[85%] rounded-2xl bg-emerald-400 px-4 py-3 text-[13px] leading-relaxed text-slate-950 shadow-lg shadow-emerald-400/40"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-2 text-[11px] text-slate-200">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.12s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:0.24s]" />
                <span>Merry is thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="px-4 text-xs text-rose-300 sm:text-[13px]">{error}</p>
        )}

        {/* Input bar – anchored to bottom of the chat container */}
        <form
          onSubmit={handleSend}
          className="mt-1 border-t border-slate-800/80 bg-slate-900/95 px-3 py-2 sm:px-4 sm:py-3"
        >
          <div className="flex items-end gap-2">
            <input
              className="flex-1 rounded-full bg-slate-800/90 px-4 py-2.5 text-[13px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              placeholder="Tell Merry about your kid and December…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={focusIntoView}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="inline-flex h-10 min-w-[3.25rem] items-center justify-center rounded-full bg-emerald-400 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>

          {/* Upsell once they’ve seen a preview */}
          {hasPreview && (
            <div className="mt-3 rounded-2xl border border-emerald-400/35 bg-emerald-400/5 p-3 text-left text-xs text-slate-100 sm:text-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Ready to get your full plan?
              </p>
              <p className="mb-2 text-[12px] text-slate-200 sm:text-xs">
                Check out securely with PayPal and Merry will conjure your full
                24-night Elf plan – with each morning’s email landing in time for
                you to grab any tiny bits you need that day.
              </p>
              <GeneratePlanButton sessionId={sessionId} />
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
