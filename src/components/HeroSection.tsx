// src/components/HeroSection.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const AGE_RANGES = ['3–4 years', '4–6 years', '6–8 years', '8+ years'];

type ElfVibe = 'silly' | 'kind' | 'calm';

export default function HeroSection() {
  const router = useRouter();

  const [childName, setChildName] = useState('');
  const [ageRange, setAgeRange] = useState(AGE_RANGES[1]);
  const [startDate, setStartDate] = useState('');
  const [vibe, setVibe] = useState<ElfVibe>('silly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!childName.trim()) {
      setError("Please add your child's name.");
      return;
    }
    if (!startDate.trim()) {
      setError('Please choose the date your Elf arrives.');
      return;
    }

    try {
      setIsLoading(true);

      // 1) Create our own session id for this plan
      const sessionId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // 2) Stash details in localStorage (handy if the user comes back later)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'elf-current-session',
          JSON.stringify({
            sessionId,
            childName,
            ageRange,
            startDate,
            vibe,
          }),
        );
      }

      // 3) Ask our API to create a PayPal order for this session
      const res = await fetch('/api/paypal-elf/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          amount: 9,
          currency: 'GBP',
          childName,
          ageRange,
          startDate,
          vibe,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Error talking to PayPal.');
      }

      const data = (await res.json()) as { approveUrl?: string };

      if (!data.approveUrl) {
        throw new Error('No PayPal approval URL returned.');
      }

      // 4) Send the user to PayPal checkout
      window.location.href = data.approveUrl;
      // After payment, PayPal will redirect back to:
      // /success?status=approved&provider=paypal&session_id=<sessionId>&token=<orderID>
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong starting PayPal checkout.');
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="hero-title"
      className="flex flex-col items-center gap-10 md:flex-row md:items-start"
    >
      {/* Left: main card */}
      <div className="w-full md:w-3/5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-black/40 backdrop-blur md:p-8">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
            Elf on the Shelf Helper
          </p>
          <h1
            id="hero-title"
            className="mb-3 text-center text-2xl font-semibold leading-tight text-slate-50 md:text-3xl"
          >
            Never scramble for Elf-on-the-Shelf ideas again
          </h1>
          <p className="mb-6 text-center text-sm text-slate-300 md:text-[15px]">
            Get a personalised 30-day Elf plan in minutes – simple nightly setups and
            little notes from your Elf, tailored to your child.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="childName"
                className="text-xs font-medium text-slate-200"
              >
                Child&apos;s name
              </label>
              <input
                id="childName"
                type="text"
                autoComplete="off"
                placeholder="e.g. Lily"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none ring-emerald-400/40 transition focus:border-emerald-400 focus:ring-2"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="ageRange"
                className="text-xs font-medium text-slate-200"
              >
                Age range
              </label>
              <select
                id="ageRange"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none ring-emerald-400/40 transition focus:border-emerald-400 focus:ring-2"
              >
                {AGE_RANGES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="startDate"
                className="text-xs font-medium text-slate-200"
              >
                Start date for your Elf
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none ring-emerald-400/40 transition focus:border-emerald-400 focus:ring-2"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-200">
                Elf vibe
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'silly', label: 'Silly' },
                    { id: 'kind', label: 'Kind' },
                    { id: 'calm', label: 'Calm' },
                  ] as { id: ElfVibe; label: string }[]
                ).map((option) => {
                  const active = vibe === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setVibe(option.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950 shadow shadow-emerald-500/30'
                          : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isLoading ? 'Opening PayPal…' : 'Get my Elf plan (£9)'}
            </button>

            <p className="text-[11px] text-slate-400">
              You&apos;ll be taken to a secure PayPal checkout. Once payment&apos;s done,
              you&apos;ll get your personalised 30-day Elf-on-the-Shelf plan.
            </p>
            <p className="text-[11px] text-slate-400">
              Perfect for busy, knackered parents who still want the magic ✨
            </p>
          </form>
        </div>

        {/* Trust strip */}
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            One-off payment, no subscription
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Instant plan + PDF download
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            14-day “not for us” refund promise
          </span>
        </div>
      </div>

      {/* Right visual column */}
      <div className="hidden w-full md:block md:w-2/5">
        <div className="relative mx-auto max-w-sm">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-emerald-500/30 via-sky-500/10 to-fuchsia-500/30 opacity-60 blur-2xl" />
          <div className="relative space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl shadow-black/50">
            <p className="text-xs font-semibold text-emerald-300">
              Your Elf plan preview
            </p>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-[11px] leading-relaxed text-slate-100">
              <p className="font-semibold text-slate-50">Day 1: Hello, [Name]!</p>
              <p className="mt-1">
                <span className="font-semibold">Setup:</span> Sit your Elf on a shelf
                or table with a little paper sign that says “Hi [Name]!”.
              </p>
              <p className="mt-1 text-slate-300">
                <span className="font-semibold">Elf note:</span> “Hi [Name]! I’m your
                silly Elf, here to keep you giggling all month long.”
              </p>
              <p className="mt-3 font-semibold text-slate-50">Day 2: Book Buddy</p>
              <p className="mt-1">
                <span className="font-semibold">Setup:</span> Prop the Elf inside your
                child’s favourite storybook, peeking out.
              </p>
              <p className="mt-1 text-slate-300">
                <span className="font-semibold">Elf note:</span> “I picked your
                favourite book! Want to read it together today?”
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-[11px] text-slate-200">
              <p className="mb-1 font-semibold text-slate-50">You&apos;ll also get</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Printer-friendly PDF</li>
                <li>Full plan emailed to you</li>
                <li>Ideas you can tweak and reuse</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
