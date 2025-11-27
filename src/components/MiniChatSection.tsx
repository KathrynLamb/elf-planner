// src/components/MiniChatSection.tsx
"use client";

import * as React from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Phase = "discovery" | "offer" | "collectEmail" | "magicSent";

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
        "Hey there. Tell me about your kiddos and what kind of elf experience you’re looking for this December. 🎄",
    },
  ]);

  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [phase, setPhase] = React.useState<Phase>("discovery");

  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Helper to keep the latest message in view
  const scrollChatToBottom = React.useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Scroll to bottom when messages / typing indicator change
  React.useEffect(() => {
    scrollChatToBottom();
  }, [messages, isThinking, scrollChatToBottom]);

  // When viewport height changes (e.g. keyboard opens), keep bottom in view
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      scrollChatToBottom();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [scrollChatToBottom]);

  function focusSectionForMobile() {
    if (typeof window === "undefined") return;
    const isSmallScreen = window.innerWidth < 640;

    if (!isSmallScreen) {
      // Desktop: just keep the chat scrolled
      scrollChatToBottom();
      return;
    }

    const section = sectionRef.current;

    // Give iOS a moment to open the keyboard, then scroll
    setTimeout(() => {
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "end" });
      }
      scrollChatToBottom();
    }, 80);
  }

  function pushAssistantMessage(content: string) {
    const msg: ChatMessage = {
      id: `m-${Date.now()}-a-local`,
      role: "assistant",
      content,
    };
    setMessages((prev) => [...prev, msg]);
  }

  function looksLikeEmail(text: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text.trim());
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

    if (phase === "offer") {
      handleOfferPhase(text);
      return;
    }

    if (phase === "collectEmail") {
      await handleCollectEmailPhase(text);
      return;
    }

    if (phase === "magicSent") {
      pushAssistantMessage(
        "I’ve already sent your magic link — check your inbox (and spam/promotions just in case). Tap it when you’re ready, and I’ll be waiting with your full plan. 💌"
      );
      return;
    }

    await handleDiscoveryPhase(history);
  }

  async function handleDiscoveryPhase(history: ChatMessage[]) {
    if (!sessionId) {
      setError("Missing session ID. Please refresh and try again.");
      return;
    }

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
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ||
            "Something went wrong talking to Merry. Please try again."
        );
      }

      const data = (await res.json()) as {
        reply: string;
        done?: boolean;
      };

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.done && phase === "discovery") {
        const offerMessage =
          "Okay, I’ve got a really clear picture now – enough to brew a full 24-morning elf plan that actually fits your kiddo and your energy.\n\nHere’s how it works: I’ll create a 24-morning plan with simple nightly notes and materials lists so you’re not scrambling at 10pm. It’s a one-time $14.99. You’ll get a magic link by email, pay once via PayPal, then your full plan unlocks on the site and I’ll email you each night’s setup in time for bedtime.\n\nWould you like me to set up your full 24-morning plan and send your magic link?";

        pushAssistantMessage(offerMessage);
        setPhase("offer");
      }
    } catch (err: any) {
      console.error("[MiniChatSection] discovery error", err);
      setError(
        err?.message ||
          "Oops, the North Pole wifi dropped. Please try again in a moment."
      );
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  }

  function handleOfferPhase(text: string) {
    const lower = text.toLowerCase();

    const isYes =
      /^(yes|yeah|yep|sure|ok|okay|alright|go for it|do it|sounds good|let's do it|lets do it|why not)\b/.test(
        lower
      );
    const isNo = /^(no|nah|not now|maybe later|another time)/.test(lower);

    if (isNo) {
      pushAssistantMessage(
        "No worries at all — we can just keep chatting ideas, or you can come back for the full plan whenever you’re ready. For now, tell me anything else that would make this December easier for you."
      );
      setPhase("discovery");
      return;
    }

    if (isYes) {
      pushAssistantMessage(
        "Lovely! Pop the email you’d like your magic link sent to, and I’ll use that to set up your $14.99 plan."
      );
      setPhase("collectEmail");
      return;
    }

    pushAssistantMessage(
      "Totally fair! If you’d like me to go ahead and set up your full 24-morning plan for $14.99, just reply “yes”. If not, you can say “no” and we’ll just keep chatting ideas."
    );
  }

  async function handleCollectEmailPhase(text: string) {
    const email = text.trim();

    if (!looksLikeEmail(email)) {
      pushAssistantMessage(
        "That doesn’t quite look like an email address. Could you type it in the format name@example.com?"
      );
      return;
    }

    if (!sessionId) {
      setError("Missing session ID. Please refresh and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Something went wrong sending your magic link."
        );
      }

      pushAssistantMessage(
        `Got it — I’ve sent a magic link to ${email}. 💌\n\nTap it when you’re ready to unlock your full 24-morning elf plan and pay $14.99 via PayPal. Once you’re in, I’ll show you the whole plan and can email you each night’s setup in time for bedtime.`
      );
      setPhase("magicSent");
    } catch (err: any) {
      console.error("[MiniChatSection] magic link error", err);
      setError(
        err?.message ||
          "I couldn’t send the magic link just now. Please double-check your email or try again in a moment."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      id="mini-chat"
      ref={sectionRef}
      className="relative w-full bg-slate-950"
    >
      <div className="mx-auto flex min-h-[100vh] w-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-8">
        {/* Chat header */}
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

        {/* Chat card */}
        <div className="relative flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-800 bg-slate-900/70 shadow-[0_24px_80px_rgba(15,23,42,0.9)]">
          {/* Messages */}
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
                      ? "max-w-[80%] rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-left text-sm text-slate-50 whitespace-pre-line"
                      : "max-w-[80%] rounded-2xl bg-emerald-400 px-4 py-3 text-right text-sm text-slate-950 shadow-lg shadow-emerald-400/40 whitespace-pre-line"
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

          {/* Input + footer */}
          <div className="border-t border-slate-800 bg-slate-900/95 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
            {error && (
              <p className="mb-2 text-xs text-rose-300 sm:text-sm">{error}</p>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                ref={inputRef}
                className="flex-1 rounded-full border border-emerald-400/60 bg-slate-950/90 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
                placeholder={
                  phase === "collectEmail"
                    ? "Type your email, e.g. you@example.com…"
                    : "Tell Merry about your kid and December…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={focusSectionForMobile}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
