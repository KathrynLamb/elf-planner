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
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Always keep view pinned to the latest message
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  function focusSectionForMobile() {
    if (typeof window === "undefined") return;
    const section = sectionRef.current;
    if (!section) return;

    // Scroll the chat section to the top of the viewport so messages stay visible
    const rect = section.getBoundingClientRect();
    const scrollY = window.scrollY + rect.top;
    window.scrollTo({ top: scrollY, behavior: "smooth" });
  }

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
      ref={sectionRef}
      className="relative w-full bg-slate-950"
    >
      {/* full viewport chat layout */}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-8">
        {/* Chat header (like Messenger conversation header) */}
        <header className="mb-3 flex items-center gap-3 sm:mb-4">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 sm:h-10 sm:w-10" />
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-slate-50 sm:text-base">
              Merry the Elf
            </p>
            <p className="text-[11px] text-emerald-300 sm:text-xs">
              Typically replies in seconds
            </p>
          </div>
        </header>

        {/* Chat card body */}
        <div className="relative flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-800 bg-slate-900/70 shadow-[0_24px_80px_rgba(15,23,42,0.9)]">
          {/* Messages scroll area */}
          <div
            ref={chatScrollRef}
            className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto rounded-3xl bg-slate-950/85 px-3 py-4 sm:px-4 sm:py-5"
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
                      ? "max-w-[80%] rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-left text-sm text-slate-50"
                      : "max-w-[80%] rounded-2xl bg-emerald-400 px-4 py-3 text-right text-sm text-slate-950 shadow-lg shadow-emerald-400/40"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
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
          </div>

          {/* Input + footer (outside scroll, stuck at bottom of section) */}
          <div className="border-t border-slate-800 bg-slate-900/95 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
            {/* Error */}
            {error && (
              <p className="mb-2 text-xs text-rose-300 sm:text-sm">{error}</p>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                className="flex-1 rounded-full border border-emerald-400/60 bg-slate-950/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                placeholder="Tell Merry about your kid and December…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={focusSectionForMobile}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>

            {/* Upsell once they’ve seen a preview */}
            {hasPreview && (
              <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-left text-sm text-slate-100 sm:p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300 sm:text-xs">
                  Ready to get your full plan?
                </p>
                <p className="mb-3 text-xs text-slate-200 sm:text-sm">
                  Check out securely with PayPal and Merry will conjure your
                  full 24-night Elf plan, with each morning’s email arriving in
                  time for you to grab anything you need for that night’s setup.
                </p>
                <GeneratePlanButton sessionId={sessionId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
