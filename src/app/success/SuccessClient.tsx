'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? undefined;

  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const [reminderEmail, setReminderEmail] = useState('');
const [reminderMsg, setReminderMsg] = useState<string | null>(null);
const [reminderErr, setReminderErr] = useState<string | null>(null);

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
    setReminderErr(err.message || 'Something went wrong. Please try again.');
  }
}


async function handleEmailReminder(e: React.FormEvent) {
  e.preventDefault();
  setReminderErr(null);
  setReminderMsg(null);

  if (!sessionId) {
    setReminderErr('Missing session ID. Please contact me if this keeps happening.');
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
    setReminderErr(err.message || 'Something went wrong. Please try again.');
  }
}


  async function handleGenerate() {
    if (!sessionId) {
      setError('Missing Stripe session ID. Please contact support.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
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
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!sessionId) {
      setError('Missing Stripe session ID. Please contact support.');
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
      setError(err.message || 'Error downloading PDF.');
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
              disabled={isLoading || !sessionId}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Brewing your Elf mischief…' : 'Generate my 30-day Elf plan'}
            </button>

            {!sessionId && (
              <p className="text-xs text-center text-amber-300">
                No session ID found in the URL. If you reached this page by mistake,
                drop me a message and I&apos;ll sort it.
              </p>
            )}
          </div>
        )}

        {plan && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
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
                  onClick={() => window.print()}
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:border-slate-400"
                >
                  Print
                </button>
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
        {/* <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs hover:border-slate-400"
        >
          Print
        </button> */}
      </div>
    </div>
    {/* ...existing plan box... */}
  </section>
)}

              </div>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-700 max-h-[60vh] overflow-auto text-sm leading-relaxed p-4 whitespace-pre-wrap">
              {plan}
            </div>
            <section className="mt-6 space-y-2 border-t border-slate-700 pt-4">
  <h3 className="text-sm font-semibold">Email this plan to yourself</h3>
  <p className="text-xs text-slate-300">
    I&apos;ll send the full 30-day Elf plan to your inbox so it&apos;s easy to find
    later on your phone.
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

            <section className="mt-6 space-y-2 border-t border-slate-700 pt-4">
  <h3 className="text-sm font-semibold">Get nightly Elf email reminders</h3>
  <p className="text-xs text-slate-300">
    I can email you each evening around 9pm with that night&apos;s Elf idea, so you
    don&apos;t have to remember to open this page when you&apos;re tired.
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
              Tip: you can tweak any of the ideas to fit your house, and skip nights
              if your Elf &quot;forgets&quot; to move. No guilt, just magic.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
