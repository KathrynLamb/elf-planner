// src/app/success/SuccessClient.tsx (or wherever it lives)
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ElfVibe = 'silly' | 'kind' | 'calm';

type ElfSession = {
  sessionId: string;
  childName: string;
  ageRange: string;
  startDate: string;
  vibe: ElfVibe;
};

// Inside SuccessClient.tsx, near the top:
type ChatMessage = {
  id: string;
  from: 'elf' | 'parent';
  text: string;
};



export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? undefined;

  const [elfSession, setElfSession] = useState<ElfSession | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderErr, setReminderErr] = useState<null | string>(null);
  const [reminderMsg, setReminderMsg] = useState<null | string>(null);

  // Inside the component:
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
const [chatInput, setChatInput] = useState('');
const [chatLoading, setChatLoading] = useState(false);
const [hotlineDone, setHotlineDone] = useState(false);

// Kick off the hotline on mount (once we have a sessionId)
useEffect(() => {
  if (!sessionId) return;
  if (chatMessages.length > 0) return;

  let cancelled = false;

  async function startHotline() {
    try {
      setChatLoading(true);
      const res = await fetch('/api/elf-hotline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        console.error('Elf hotline start failed');
        return;
      }

      const data = await res.json();
      if (cancelled) return;

      setChatMessages([
        {
          id: 'elf-0',
          from: 'elf',
          text: data.reply,
        },
      ]);
      setHotlineDone(data.done ?? false);
    } finally {
      if (!cancelled) setChatLoading(false);
    }
  }

  startHotline();

  return () => {
    cancelled = true;
  };
}, [sessionId, chatMessages.length]);

  // 1) Load session details from Redis via API
  useEffect(() => {
    console.log("Session id", sessionId)
    if (!sessionId) return;

    let cancelled = false;

    async function loadSession() {
      setSessionLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/elf-session?sessionId=${sessionId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            throw new Error(
              data?.message || 'Could not load your Elf session details.',
            );
          }
        }

        const data = await res.json();
        console.log("DATA", data)
        if (!cancelled) {
          setElfSession(data.session as ElfSession);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(
            err.message ||
              "I couldn't find your Elf details. If this keeps happening, go back to the homepage and refill the form.",
          );
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function handleSendHotline(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !sessionId) return;
  
    const userText = chatInput.trim();
    setChatInput('');
  
    const userMsg: ChatMessage = {
      id: `parent-${Date.now()}`,
      from: 'parent',
      text: userText,
    };
  
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
  
    try {
      const res = await fetch('/api/elf-hotline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userText }),
      });
  
      if (!res.ok) {
        console.error('Elf hotline turn failed');
        return;
      }
  
      const data = await res.json();
  
      const elfMsg: ChatMessage = {
        id: `elf-${Date.now()}`,
        from: 'elf',
        text: data.reply,
      };
  
      setChatMessages((prev) => [...prev, elfMsg]);
      setHotlineDone(Boolean(data.done));
    } finally {
      setChatLoading(false);
    }
  }
  

  async function handleGenerate() {
    setError(null);

    if (!elfSession) {
      setError(
        "I couldn't find your Elf details. If this keeps happening, go back to the homepage and refill the form.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: elfSession.sessionId,
          childName: elfSession.childName,
          ageRange: elfSession.ageRange,
          startDate: elfSession.startDate,
          vibe: elfSession.vibe,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.message || 'Something went wrong generating your plan.',
        );
      }

      const data = (await res.json()) as { plan: string };
      setPlan(data.plan);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!sessionId) {
      setError('Missing session ID. Please contact support.');
      return;
    }

    try {
      const res = await fetch(`/api/plan-pdf?sessionId=${sessionId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Error generating PDF.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'elf-plan.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error downloading PDF.');
    }
  }

  async function handleEmailPlan(e: React.FormEvent) {
    e.preventDefault();
    setReminderErr(null);
    setReminderMsg(null);

    if (!sessionId) {
      setReminderErr(
        'Missing session ID. Please contact me if this keeps happening.',
      );
      return;
    }

    try {
      const res = await fetch('/api/email-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reminderEmail, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Error sending email.');
      }

      setReminderMsg(
        'Sent! Check your inbox for your full Elf plan. If it’s not there, peek in spam or Promotions.',
      );
    } catch (err: any) {
      console.error(err);
      setReminderErr(err.message || 'Something went wrong. Please try again.');
    }
  }

  async function handleEmailReminder(e: React.FormEvent) {
    e.preventDefault();
    setReminderErr(null);
    setReminderMsg(null);

    if (!sessionId) {
      setReminderErr(
        'Missing session ID. Please contact me if this keeps happening.',
      );
      return;
    }

    try {
      const res = await fetch('/api/subscribe-email-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reminderEmail, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Error saving reminder.');
      }

      setReminderMsg(
        'Got it – I’ll email you each evening with that night’s Elf idea.',
      );
    } catch (err: any) {
      console.error(err);
      setReminderErr(err.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900/80 border border-slate-700 shadow-xl p-6 md:p-8 space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            Payment complete
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Your Elf-on-the-Shelf plan is ready to conjure 🎄
          </h1>
          <p className="text-sm text-slate-300">
            Click the button below to generate your personalised 30-day Elf plan:
            daily setups and short notes from your Elf.
          </p>
        </header>

        {!plan && (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={
                isLoading ||
                !sessionId ||
                sessionLoading ||
                !elfSession
              }
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? 'Brewing your Elf mischief…'
                : sessionLoading || !elfSession
                ? 'Loading your Elf details…'
                : 'Generate my 30-day Elf plan'}
            </button>

            {!sessionId && (
              <p className="text-xs text-center text-amber-300">
                No session ID found in the URL. If you reached this page by mistake,
                go back to the homepage and start again.
              </p>
            )}
          </div>
        )}

        {plan && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 elf-print-hide">
              <h2 className="text-lg font-semibold">Your Elf plan</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(plan);
                  }}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:border-slate-400"
                >
                  Copy all
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:border-slate-400"
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-700 max-h-[60vh] overflow-auto text-sm leading-relaxed p-4 whitespace-pre-wrap">
              {plan}
            </div>

            {/* Email full plan */}
            <section className="mt-6 space-y-2 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold">Email this plan to yourself</h3>
              <p className="text-xs text-slate-300">
                I&apos;ll send the full 30-day Elf plan to your inbox so it&apos;s easy
                to find later on your phone.
              </p>

              <form
                onSubmit={handleEmailPlan}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={reminderEmail}
                  onChange={(e) => setReminderEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
                >
                  Email me my plan
                </button>
              </form>

              {reminderErr && (
                <p className="text-[11px] text-red-400">{reminderErr}</p>
              )}
              {reminderMsg && (
                <p className="text-[11px] text-emerald-300">{reminderMsg}</p>
              )}
            </section>

            {/* Nightly reminder signup */}
            <section className="mt-6 space-y-2 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold">Get nightly Elf email reminders</h3>
              <p className="text-xs text-slate-300">
                I can email you each evening around 9pm with that night&apos;s Elf idea,
                so you don&apos;t have to remember to open this page when you&apos;re
                tired.
              </p>

              <form
                onSubmit={handleEmailReminder}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={reminderEmail}
                  onChange={(e) => setReminderEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950"
                >
                  Save email reminders
                </button>
              </form>

              {reminderErr && (
                <p className="text-[11px] text-red-400">{reminderErr}</p>
              )}
              {reminderMsg && (
                <p className="text-[11px] text-emerald-300">{reminderMsg}</p>
              )}
            </section>

            <p className="text-[11px] text-slate-400">
              Tip: you can tweak any of the ideas to fit your house, and skip nights if
              your Elf &quot;forgets&quot; to move. No guilt, just magic.
            </p>
          </section>
        )}
      </div>

      <section className="mt-6 space-y-3 border border-slate-700 rounded-2xl p-4 bg-slate-950/70">
  <h2 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
    <span className="text-lg">☎️</span>
    Elf Hotline with Merry
  </h2>
  <p className="text-xs text-slate-300">
    Merry will ask you a few quick questions, like a cosy phone call, so your Elf plan feels
    ridiculously personal. Totally optional, but highly recommended.
  </p>

  <div className="max-h-60 overflow-auto space-y-2 text-sm bg-slate-900/70 border border-slate-700 rounded-xl p-3">
    {chatMessages.map((m) => (
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
    {chatLoading && (
      <p className="text-[12px] text-emerald-200">Merry is thinking…</p>
    )}
  </div>

  <form onSubmit={handleSendHotline} className="flex gap-2">
    <input
      type="text"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      placeholder={
        hotlineDone
          ? 'Merry has everything she needs – you can generate your plan!'
          : 'Type what you’d say to Merry on the phone…'
      }
      disabled={chatLoading || hotlineDone}
      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs disabled:opacity-60"
    />
    <button
      type="submit"
      disabled={chatLoading || hotlineDone}
      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
    >
      Send
    </button>
  </form>

  {hotlineDone && (
    <p className="text-[11px] text-emerald-300">
      Merry has everything she needs – hit “Generate my 30-day Elf plan” whenever you&apos;re ready.
    </p>
  )}
</section>

    </main>
  );
}
