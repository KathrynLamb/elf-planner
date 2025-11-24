// src/components/HeroSection.tsx
'use client';

import { FormEvent, useState } from 'react';
// import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Vibe = 'cheeky' | 'calm' | 'kind' | 'mixed';

export default function HeroSection() {
  const router = useRouter();

  // auth state
  const [email, setEmail] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // teaser state
  const [childName, setChildName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [vibe, setVibe] = useState<Vibe>('cheeky');
  const [biggestWorry, setBiggestWorry] = useState('');
  const [teaser, setTeaser] = useState<string | null>(null);
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [teaserError, setTeaserError] = useState<string | null>(null);

  // async function handleEmailSignIn(e: FormEvent) {
  //   e.preventDefault();
  //   setAuthError(null);
  //   setAuthMessage(null);

  //   if (!email) {
  //     setAuthError('Pop your email in first.');
  //     return;
  //   }

  //   setAuthSubmitting(true);
  //   try {
  //     await signIn('email', {
  //       email,
  //       redirect: false,
  //       callbackUrl: '/intro', // after magic link, start your intro flow
  //     });

  //     setAuthMessage(
  //       'Magic link sent. Check your email on this device to finish signing in.'
  //     );
  //   } catch (err: any) {
  //     console.error(err);
  //     setAuthError(
  //       'Something went wrong sending your magic link. Please try again in a moment.'
  //     );
  //   } finally {
  //     setAuthSubmitting(false);
  //   }
  // }

  function handleGuest() {
    router.push('/intro');
  }

  async function handlePreview(e: FormEvent) {
    e.preventDefault();
    setTeaserError(null);
    setTeaser(null);

    setTeaserLoading(true);
    try {
      const res = await fetch('/api/plan-teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: childName || undefined,
          ageRange: ageRange || undefined,
          vibe,
          biggestWorry: biggestWorry || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not get a preview from Merry.');
      }

      const data = (await res.json()) as { teaser: string };
      setTeaser(data.teaser);
    } catch (err: any) {
      console.error(err);
      setTeaserError(
        err.message || 'Something went wrong getting your preview. Please try again.'
      );
    } finally {
      setTeaserLoading(false);
    }
  }

  return (
    <section aria-labelledby="hero-heading">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 shadow-2xl px-6 py-7 md:px-10 md:py-9">
        {/* Hero copy */}
        <header className="max-w-2xl space-y-3">
          <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300">
            Elf Planner
          </p>
          <h1
            id="hero-heading"
            className="text-3xl md:text-4xl font-semibold leading-tight"
          >
            30 nights of Elf-on-the-Shelf ideas, planned for tired grown-ups 🎄
          </h1>
          <p className="text-sm md:text-base text-slate-200">
            Merry the Elf will chat with you like a cosy hotline, then conjure a
            personalised 24-day Elf plan: easy nightly setups, tiny notes from
            your elf, and almost no weekday mess. You just set things out at
            night.
          </p>
        </header>

        {/* Main grid: teaser + auth */}
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)] items-start">
          {/* Teaser card */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 px-4 py-4 md:px-5 md:py-5 space-y-4">
            <h2 className="text-sm font-semibold">
              Get a sneak peek at your Elf plan
            </h2>
            <p className="text-xs text-slate-300">
              Tell Merry a tiny bit about your kid and your energy levels, and
              she&apos;ll sketch a quick preview of what your December Elf plan
              will feel like.
            </p>

            <form onSubmit={handlePreview} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="child-name"
                    className="block text-[11px] font-medium text-slate-300 uppercase tracking-[0.15em]"
                  >
                    Child&apos;s name
                  </label>
                  <input
                    id="child-name"
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="eg. Sophia"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="age-range"
                    className="block text-[11px] font-medium text-slate-300 uppercase tracking-[0.15em]"
                  >
                    Age
                  </label>
                  <input
                    id="age-range"
                    type="text"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="eg. 5, or 4–6"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="block text-[11px] font-medium text-slate-300 uppercase tracking-[0.15em]">
                    Elf vibe
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(['cheeky', 'calm', 'kind', 'mixed'] as Vibe[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVibe(v)}
                        className={[
                          'rounded-full border px-3 py-1 text-[11px]',
                          v === vibe
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400',
                        ].join(' ')}
                      >
                        {v === 'cheeky'
                          ? 'Cheeky'
                          : v === 'calm'
                          ? 'Calm'
                          : v === 'kind'
                          ? 'Kind'
                          : 'A mix'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="biggest-worry"
                    className="block text-[11px] font-medium text-slate-300 uppercase tracking-[0.15em]"
                  >
                    Biggest worry
                  </label>
                  <input
                    id="biggest-worry"
                    type="text"
                    value={biggestWorry}
                    onChange={(e) => setBiggestWorry(e.target.value)}
                    placeholder="eg. remembering every night, too much mess…"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={teaserLoading}
                className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {teaserLoading
                  ? 'Merry is dreaming up your December…'
                  : 'Preview my Elf December'}
              </button>
            </form>

            {teaserError && (
              <p className="text-[11px] text-red-400">{teaserError}</p>
            )}

            {teaser && (
              <div className="mt-3 space-y-2 rounded-xl border border-emerald-500/60 bg-slate-950/80 p-3">
                <p className="text-[11px] font-semibold text-emerald-300">
                  Merry&apos;s sneak peek
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-wrap">
                  {teaser}
                </p>
                <p className="text-[11px] text-slate-400">
                  Like the sound of that? Scroll down to see exactly what you
                  get, then unlock the full 24-night plan.
                </p>
              </div>
            )}
          </div>

          {/* Auth / CTA card */}
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-4 md:px-5 md:py-5 space-y-4">
            <h2 className="text-sm font-semibold">
              Ready for the full 24-night Elf planner?
            </h2>
            <p className="text-xs text-slate-300">
              Sign in with a magic link to save your plan for next year, or
              continue without an account if you&apos;d just like this
              December&apos;s Elf-on-the-Shelf ideas.
            </p>

            {/* <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="hero-email"
                  className="block text-[11px] font-medium text-slate-300 uppercase tracking-[0.15em]"
                >
                  Email
                </label>
                <input
                  id="hero-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {authSubmitting
                  ? 'Sending magic sign-in link…'
                  : 'Send me a magic sign-in link'}
              </button>
            </form> */}

            {authMessage && (
              <p className="text-[11px] text-emerald-300">{authMessage}</p>
            )}
            {authError && (
              <p className="text-[11px] text-red-400">{authError}</p>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleGuest}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 hover:border-emerald-400 hover:bg-slate-900/80"
              >
                Continue without an account
              </button>
              <ul className="text-[11px] text-slate-400 space-y-1">
                <li>• Takes about 2–3 minutes to get your plan.</li>
                <li>• Designed for one-handed, tired-at-11pm parents.</li>
                <li>• Mostly low-mess Elf ideas, with optional “big” nights.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[11px] text-slate-400">
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>🔒</span>
              Secure checkout with PayPal.
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>📱</span>
              Works beautifully on your phone – PDF included if you want to print.
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>✨</span>
              Built for knackered parents who still want the magic.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
