import { GeneratePlanButton } from "./GeneratePlanButton";
import * as React from "react";

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

  // scroll container for messages (the thing that should scroll, not the whole page)
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

  // Always keep view pinned to the latest message
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
      className="relative w-full bg-slate-950 px-4 pb-10 pt-12 sm:px-6 sm:pb-16 sm:pt-16"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* Heading */}
        <header className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Try a free mini chat with Merry
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-slate-300 sm:text-base">
            Type one or two sentences about your kid and December. Merry will
            reply with a tiny preview of a few Elf mornings she&apos;d plan just
            for you.
          </p>
        </header>

        {/* Chat shell – designed to feel like a real chat app, especially on mobile */}
        <div
          className="
            relative mx-auto flex w-full max-w-2xl flex-col
            rounded-3xl border border-slate-800/80 bg-slate-900/80
            shadow-[0_24px_80px_rgba(15,23,42,0.9)]
            overflow-hidden
            h-[min(540px,calc(100vh-10rem))]
            sm:h-auto sm:min-h-[420px]
          "
        >
          {/* subtle twinkle background */}
          <div className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen">
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.25),_transparent_55%)]" />
          </div>

          {/* Chat header like Messenger */}
          <div className="relative z-10 flex items-center gap-3 border-b border-slate-800/70 bg-slate-950/80 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-rose-500 shadow-md" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-50">
                Merry the Elf
              </span>
              <span className="text-[11px] text-emerald-300">
                Typically replies in seconds
              </span>
            </div>
          </div>

          {/* Messages scroll area */}
          <div
            ref={chatScrollRef}
            className="
              relative z-10 flex-1 overflow-y-auto
              px-3 py-4 sm:px-4 sm:py-5
              space-y-3
            "
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
                      ? "max-w-[80%] rounded-2xl bg-slate-800/95 px-4 py-3 text-left text-sm text-slate-50"
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
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/95 px-3 py-2 text-[11px] text-slate-200">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.12s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:0.24s]" />
                  <span>Merry is thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Input bar – sticks to bottom of chat card, like Messenger */}
          <form
            onSubmit={handleSend}
            className="
              relative z-10 border-t border-slate-800/70 bg-slate-950/90
              px-3 py-3 sm:px-4
            "
          >
            <div className="flex items-center gap-2">
              <input
                className="
                  flex-1 rounded-full border border-emerald-400/60
                  bg-slate-900/95 px-4 py-3 text-sm text-white
                  placeholder:text-slate-500
                  focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60
                "
                placeholder="Tell Merry about your kid and December…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="
                  rounded-full bg-emerald-400 px-5 py-2.5
                  text-sm font-semibold text-slate-950
                  shadow-lg shadow-emerald-400/40
                  transition hover:bg-emerald-300
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                Send
              </button>
            </div>

            {error && (
              <p className="mt-2 text-[11px] text-rose-300 sm:text-xs">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Upsell once they’ve seen a preview */}
        {hasPreview && (
          <div className="mx-auto w-full max-w-2xl rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-left text-sm text-slate-100">
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
    </section>
  );
}
