'use client';

import { FormEvent, useState } from 'react';

type Vibe = 'silly' | 'kind' | 'calm';

export default function Home() {
  const [childName, setChildName] = useState('');
  const [ageRange, setAgeRange] = useState('4-6');
  const [startDate, setStartDate] = useState('');
  const [vibe, setVibe] = useState<Vibe>('silly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!childName || !startDate) {
      setError('Please add your child’s name and the date you start Elf on the Shelf.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName,
          ageRange,
          startDate,
          vibe,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Something went wrong starting checkout.');
      }

      const data = await res.json() as { url?: string };

      if (!data.url) {
        throw new Error('No checkout URL returned.');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900/80 border border-slate-700 shadow-xl p-6 md:p-8 space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            Elf on the Shelf Helper
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            30 days of Elf-on-the-Shelf ideas in minutes 🎄
          </h1>
          <p className="text-sm text-slate-300">
            Pop in a few details and we’ll generate a personalised 30-day Elf plan:
            daily setups + little notes from your Elf.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Child&apos;s name
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              placeholder="e.g. Lily"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Age range
            </label>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            >
              <option value="3-4">3–4 years</option>
              <option value="4-6">4–6 years</option>
              <option value="7-9">7–9 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Start date for your Elf
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Elf vibe
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['silly', 'kind', 'calm'] as Vibe[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVibe(option)}
                  className={[
                    'rounded-lg border px-2 py-2 capitalize',
                    vibe === option
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Taking you to checkout…' : 'Get my Elf plan (£9)'}
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            You&apos;ll be taken to a secure Stripe checkout. After payment you&apos;ll get
            your personalised 30-day Elf-on-the-Shelf plan instantly.
          </p>
        </form>
      </div>
    </main>
  );
}
