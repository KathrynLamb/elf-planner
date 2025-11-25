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

  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

  // Always keep view pinned to the latest message
  React.useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

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
      className={`
        relative w-full bg-slate-950
        /* mobile: make this feel like a full-screen chat view */
        min-h-screen
      `}
    >
      {/* Visually hidden heading just for accessibility / SEO */}
      <h2 className="sr-only">Free mini chat with Merry the Elf</h2>

      <div
        className={`
          mx-auto flex w-full max-w-2xl flex-col
          /* mobile: full height chat container */
          h-[calc(100vh-80px)]
          px-0
          /* desktop/tablet: add breathing room  */
          sm:h-auto sm:max-w-4xl sm:px-4 sm:py-12
        `}
      >
        {/* Optional small heading on desktop only */}
        <header className="mb-4 hidden text-center sm:block">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
            Free taste of your Elf plan
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Chat with Merry like a messenger app and see a tiny preview before
            you buy anything.
          </p>
        </header>

        {/* Chat “app” container */}
        <div
          className={`
            flex flex-1 flex-col
            rounded-none border-y border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950
            shadow-[0_24px_80px_rgba(15,23,42,0.9)]
            sm:rounded-3xl sm:border sm:px-4 sm:py-4
          `}
        >
          {/* Top bar, like a chat app header */}
          <div className="flex items-center gap-3 border-b border-slate-800/70 px-4 py-3 sm:px-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-400 to-pink-500" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-50">
                Merry the Elf
              </span>
              <span className="text-[11px] text-emerald-300">
                Typically replies in seconds
              </span>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={chatScrollRef}
            className={`
              flex-1 space-y-3 overflow-y-auto
              px-3 py-4
              sm:px-4 sm:py-5
            `}
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
                      ? "max-w-[80%] rounded-2xl bg-slate-800/90 px-4 py-3 text-left text-sm text-slate-50"
                      : "max-w-[80%] rounded-2xl bg-emerald-400 px-4 py-3 text-right text-sm text-slate-950 shadow-lg shadow-emerald-400/40"
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
          </div>

          {/* Error */}
          {error && (
            <p className="px-4 text-xs text-rose-300 sm:px-0 sm:text-sm">
              {error}
            </p>
          )}

          {/* Input row – sits at the bottom like Messenger */}
          <form
            onSubmit={handleSend}
            className={`
              mt-2 flex items-center gap-2 border-t border-slate-800/70
              bg-slate-900/95 px-3 py-3
              sm:rounded-b-3xl sm:px-4
            `}
          >
            <input
              className="flex-1 rounded-full border border-emerald-400/60 bg-slate-950/90 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
              placeholder="Tell Merry about your kid and December…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </form>

          {/* Upsell once they’ve seen a preview */}
          {hasPreview && (
            <div className="border-t border-slate-800/70 bg-slate-900/95 px-4 py-3 text-left text-sm text-slate-100 sm:rounded-b-3xl">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
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
