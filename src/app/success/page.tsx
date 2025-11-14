'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? undefined;

  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-700 max-h-[60vh] overflow-auto text-sm leading-relaxed p-4 whitespace-pre-wrap">
              {plan}
            </div>

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
