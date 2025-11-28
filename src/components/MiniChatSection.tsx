// "use client";

// import * as React from "react";

// type ChatMessage = {
//   role: "assistant" | "user";
//   content: string;
// };

// export function MiniChatSection() {
//   const [sessionId] = React.useState(() => {
//     if (typeof window === "undefined") return "";
//     const existing = window.localStorage.getItem("elf-mini-session-id");
//     if (existing) return existing;
//     const id = crypto.randomUUID();
//     window.localStorage.setItem("elf-mini-session-id", id);
//     return id;
//   });

//   const [lastMessage, setLastMessage] = React.useState<ChatMessage>({
//     role: "assistant",
//     content:
//       "Hey there! Tell me about your kiddo(s) and what kind of elf experience you’re hoping for this December. 🎄",
//   });

//   const [input, setInput] = React.useState("");
//   const [isLoading, setIsLoading] = React.useState(false);
//   const [error, setError] = React.useState<string | null>(null);

//   async function handleSend(e: React.FormEvent) {
//     e.preventDefault();
//     if (!input.trim()) return;

//     const text = input.trim();
//     setLastMessage({ role: "user", content: text });
//     setInput("");
//     setIsLoading(true);

//     try {
//       const res = await fetch("/api/elf-mini-chat", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           sessionId,
//           messages: [{ role: "user", content: text }], // send only last message
//         }),
//       });

//       if (!res.ok) throw new Error("North Pole wifi dropped 🌨️");

//       const data = await res.json();
//       setLastMessage({ role: "assistant", content: data.reply });
//     } catch (err: any) {
//       setError(err?.message || "Something went wrong.");
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   return (
//     <section id="mini-chat" className="w-full bg-slate-950 py-16 px-4">
//       <div className="mx-auto max-w-xl text-center">
//         {/* Assistant Message */}
//         <div className="mb-8 text-left text-lg leading-relaxed text-slate-200 bg-slate-800/60 p-5 rounded-2xl shadow-lg">
//           {lastMessage.content}
//         </div>

//         {/* Input */}
//         <form onSubmit={handleSend} className="flex gap-2">
//           <input
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             className="flex-1 rounded-full bg-slate-900 border border-slate-700 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
//             placeholder="Type your reply…"
//           />
//           <button
//             type="submit"
//             disabled={isLoading}
//             className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-40"
//           >
//             {isLoading ? "Sending…" : "Send"}
//           </button>
//         </form>

//         {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
//       </div>
//     </section>
//   );
// }

// src/components/MiniChatSection.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Phase = 'discovery' | 'offer' | 'collectEmail' | 'magicSent';

export function MiniChatSection() {
  const [sessionId] = React.useState(() => {
    if (typeof window === 'undefined') return '';
    const existing = window.localStorage.getItem('elf-mini-session-id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem('elf-mini-session-id', id);
    return id;
  });

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'm-1',
      role: 'assistant',
      content:
        'Hey there. Tell me about your kiddo(s) and what kind of elf experience you’re hoping for this December. 🎄',
    },
  ]);

  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>('discovery');

  // controls when we show the big “how it works” image
  const [hasShownExplainer, setHasShownExplainer] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function pushAssistantMessage(content: string) {
    const msg: ChatMessage = {
      id: `m-${Date.now()}-a-local`,
      role: 'assistant',
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
      role: 'user',
      content: text,
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setInput('');
    setError(null);

    if (phase === 'offer') {
      handleOfferPhase(text);
      return;
    }

    if (phase === 'collectEmail') {
      await handleCollectEmailPhase(text);
      return;
    }

    if (phase === 'magicSent') {
      pushAssistantMessage(
        'I’ve already sent your magic link — check your inbox (and spam/promotions just in case). Tap it when you’re ready and I’ll be waiting with your full plan. 💌',
      );
      return;
    }

    await handleDiscoveryPhase(history);
  }

  async function handleDiscoveryPhase(history: ChatMessage[]) {
    if (!sessionId) {
      setError('Missing session ID. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    setIsThinking(true);

    try {
      const res = await fetch('/api/elf-mini-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message ||
            'Something went wrong talking to Merry. Please try again.',
        );
      }

      const data = (await res.json()) as {
        reply: string;
        done?: boolean;
      };

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // once we’ve had a few turns, reveal the explainer image in the UI
      if (!hasShownExplainer && history.length >= 3) {
        setHasShownExplainer(true);
      }

      if (data.done && phase === 'discovery') {
        const offerMessage =
          "Okay, I’ve got a really clear picture now – enough to brew a full 24-morning elf plan that actually fits your kiddo and your energy.\n\nHere’s the deal: I’ll build you a 24-morning plan with simple nightly notes and materials lists so you’re not scrambling at 10pm. It’s a one-time $14.99. You’ll get a magic link by email, pay once via PayPal, then your full plan unlocks on the site and I’ll email you each night’s setup in time for bedtime.\n\nWould you like me to set up your full 24-morning plan and send your magic link?";
        pushAssistantMessage(offerMessage);
        setPhase('offer');
      }
    } catch (err: any) {
      console.error('[MiniChatSection] discovery error', err);
      setError(
        err?.message ||
          'Oops, the North Pole wifi dropped. Please try again in a moment.',
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
        lower,
      );
    const isNo = /^(no|nah|not now|maybe later|another time)/.test(lower);

    if (isNo) {
      pushAssistantMessage(
        'No worries at all — we can just keep chatting ideas, or you can come back for the full plan whenever you’re ready. For now, tell me anything else that would make this December easier for you.',
      );
      setPhase('discovery');
      return;
    }

    if (isYes) {
      pushAssistantMessage(
        'Lovely! Pop the email you’d like your magic link sent to, and I’ll use that to set up your $14.99 plan.',
      );
      setPhase('collectEmail');
      return;
    }

    pushAssistantMessage(
      'Totally fair! If you’d like me to go ahead and set up your full 24-morning plan for $14.99, just reply “yes”. If not, you can say “no” and we’ll just keep chatting ideas.',
    );
  }

  async function handleCollectEmailPhase(text: string) {
    const email = text.trim();

    if (!looksLikeEmail(email)) {
      pushAssistantMessage(
        'That doesn’t quite look like an email address. Could you type it in the format name@example.com?',
      );
      return;
    }

    if (!sessionId) {
      setError('Missing session ID. Please refresh and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sessionId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || 'Something went wrong sending your magic link.',
        );
      }

      pushAssistantMessage(
        `Got it — I’ve sent a magic link to ${email}. 💌\n\nTap it when you’re ready to unlock your full 24-morning elf plan and pay $14.99 via PayPal. Once you’re in, I’ll show you the whole plan and can email you each night’s setup in time for bedtime.`,
      );
      setPhase('magicSent');
    } catch (err: any) {
      console.error('[MiniChatSection] magic link error', err);
      setError(
        err?.message ||
          'I couldn’t send the magic link just now. Please double-check your email or try again in a moment.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant');

  const showExplainer = hasShownExplainer;

  return (
    <section
      id="mini-chat"
      className="relative w-full rounded-3xl border border-slate-800 bg-slate-950/90 px-4 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.9)] sm:px-6 sm:py-6"
    >
      {/* header */}
      <header className="mb-4 flex items-center gap-3 sm:mb-5">
        <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 sm:h-10 sm:w-10">
          <span className="absolute inset-0 rounded-full border border-white/20" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-slate-50 sm:text-base">
            Merry the Elf
          </p>
          <p className="text-[11px] text-emerald-300 sm:text-xs">
            Typically replies in seconds
          </p>
        </div>
      </header>

      {/* main bubble + explainer */}
      <div className="space-y-4 sm:space-y-5">
        <div className="max-w-2xl rounded-3xl bg-slate-900 px-4 py-4 text-sm text-slate-50 shadow-[0_18px_45px_rgba(15,23,42,0.85)] sm:px-5 sm:py-5">
          {lastAssistant?.content}
          {isThinking && (
            <span className="mt-2 block text-[11px] text-slate-400">
              Merry is thinking…
            </span>
          )}
        </div>

        {showExplainer && (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
            <div className="relative h-[260px] w-full sm:h-[320px] md:h-[360px]">
              <Image
                src="https://img.dashhub.cc/nanobanana/1764340861091-us7cp70dl5.png"
                alt="How it works – Merry the Elf explaining the process"
                fill
                className="object-contain sm:object-cover sm:object-top"
                priority={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="mt-4 border-t border-slate-800 pt-4 sm:mt-5 sm:pt-5">
        {error && (
          <p className="mb-2 text-xs text-rose-300 sm:text-sm">{error}</p>
        )}

        <form
          onSubmit={handleSend}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            ref={inputRef}
            className="w-full flex-1 rounded-full border border-emerald-400/60 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
            placeholder={
              phase === 'collectEmail'
                ? 'Type your email, e.g. you@example.com…'
                : 'Type your reply…'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  );
}
