
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type IntroMessage = {
  id: string;
  from: 'elf' | 'parent';
  text: string;
};

type IntroApiResponse = {
  reply: string;
  done: boolean;
  introStatement: string | null;
};

export default function IntroPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<IntroMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [introStatement, setIntroStatement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kick off Merry's first question on mount
  useEffect(() => {
    let cancelled = false;

    async function startIntro() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/elf-intro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // no message yet, just start the convo
        });

        if (!res.ok) {
          throw new Error('Could not connect to Merry. Please try again.');
        }

        const data = (await res.json()) as IntroApiResponse;
        if (cancelled) return;

        setMessages([
          {
            id: 'elf-0',
            from: 'elf',
            text: data.reply,
          },
        ]);
        setDone(data.done);
        if (data.introStatement) {
          setIntroStatement(data.introStatement);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(err);
          setError(
            err.message ||
              'Something went wrong starting the chat. Please refresh and try again.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    startIntro();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || done) return;

    const text = input.trim();
    setInput('');
    setError(null);

    const parentMsg: IntroMessage = {
      id: `parent-${Date.now()}`,
      from: 'parent',
      text,
    };

    const newTranscript = [...messages, parentMsg];

    setMessages(newTranscript);
    setLoading(true);

    try {
      const res = await fetch('/api/elf-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          transcript: newTranscript.map((m) => ({
            from: m.from,
            text: m.text,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Merry got cut off. Please try again.');
      }

      const data = (await res.json()) as IntroApiResponse;

      const elfMsg: IntroMessage = {
        id: `elf-${Date.now()}`,
        from: 'elf',
        text: data.reply,
      };

      setMessages((prev) => [...prev, elfMsg]);
      setDone(data.done);
      if (data.introStatement) {
        setIntroStatement(data.introStatement);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          'Something went wrong sending your message. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    // Skip the chat and go straight into the existing flow
    router.push('/plan'); // change to your real next step route if different
  }

  function handleContinue() {
    // Move into the main Elf setup flow once intro is ready
    router.push('/plan'); // same as above – adjust to your real route
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        {/* HEADER */}
        <header className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 shadow-xl px-6 py-6 md:px-8 md:py-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 mb-2">
            Step 0 – Warm-up
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Let Merry shape your Elf plan intro ✨
          </h1>
          <p className="text-sm text-slate-300">
              Before we get into dates and payments, Merry will have a tiny cosy
              chat with you, like a phone call, to understand what kind of
              December you&apos;re hoping for. She&apos;ll turn it into a fun
              preview of what your unique 30-night Elf plan will feel like.
            </p>

        </header>

        {/* CHAT CARD */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg px-6 py-5 md:px-7 md:py-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 mb-1">
                Elf Intro Chat
              </p>
              <h2 className="text-sm md:text-base font-semibold flex items-center gap-2">
                <span className="text-lg">☎️</span>
                Talking with Merry
              </h2>
            </div>
            {!done && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-200">
                {loading ? 'Merry is thinking…' : '1–2 minutes, one-handed friendly'}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300">
            Answer like you&apos;re on a sleepy phone call. Merry will ask one
            question at a time and stop once she has enough to write a lovely
            intro for your Elf plan.
          </p>

          <div className="max-h-64 overflow-auto space-y-2 text-sm bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.from === 'elf'
                    ? 'text-[13px] text-emerald-100'
                    : 'text-[13px] text-slate-100 text-right'
                }
              >
                {m.from === 'elf' ? (
                  <span className="inline-block rounded-lg bg-emerald-500/10 border border-emerald-500/40 px-3 py-1.5">
                    <strong className="mr-1">Merry:</strong>
                    {m.text}
                  </span>
                ) : (
                  <span className="inline-block rounded-lg bg-slate-800 px-3 py-1.5">
                    {m.text}
                  </span>
                )}
              </div>
            ))}
            {loading && (
              <p className="text-[12px] text-emerald-200">Merry is thinking…</p>
            )}
            {!loading && messages.length === 0 && (
              <p className="text-[12px] text-slate-300">
                Connecting you to Merry at the North Pole…
              </p>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                done
                  ? 'Merry has what she needs – scroll down to see your intro.'
                  : 'Type what you’d say to Merry on the phone…'
              }
              disabled={loading || done}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || done || !input.trim()}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
            >
              Send
            </button>
          </form>

          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            {error ? (
              <p className="text-[11px] text-red-400">{error}</p>
            ) : done ? (
              <p className="text-[11px] text-emerald-300">
                Merry has everything she needs — your Elf plan intro is ready
                below.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Too tired to chat? You can skip this and still get a great
                plan.
              </p>
            )}

            {!done && (
              <button
                type="button"
                onClick={handleSkip}
                className="self-start md:self-auto text-[11px] text-emerald-300 underline-offset-2 hover:underline"
              >
                Skip the intro chat – continue to plan setup
              </button>
            )}
          </div>
        </section>

        {/* INTRO STATEMENT */}
        {introStatement && (
          <section className="rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-lg px-6 py-5 md:px-7 md:py-6 space-y-3">
            <h2 className="text-sm md:text-base font-semibold text-emerald-200">
              Your Elf plan intro from Merry
            </h2>
            <p className="text-sm text-slate-100 whitespace-pre-wrap">
              {introStatement}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
              <p className="text-[11px] text-slate-400">
                We&apos;ll use this as the tone-setting intro for your 30-day
                Elf plan and PDF.
              </p>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Continue to plan setup
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
