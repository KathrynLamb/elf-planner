// src/app/success/SuccessClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StoredElfPlan } from '@/lib/elfStore';
import ElfPlanSwiper from '@/components/ElfPlanSwiper';
import { SiteFooter } from '../SiteFooter';
import { getChildrenNames } from '@/lib/getChildrenNames';

type ElfVibe = 'silly' | 'kind' | 'calm';

type ElfSession = {
  sessionId: string;
  childName: string;
  ageRange: string;
  startDate: string;
  vibe: ElfVibe;
};

type ElfPlanDay = {
  dayNumber?: number;
  title?: string;
  description?: string;
  noteFromElf?: string;
  date?: string;
  weekday?: string;
  imagePrompt?: string;
};

type ElfPlanObject = {
  planOverview?: string;
  days?: ElfPlanDay[];
};

type PlanState = string | ElfPlanObject | null;

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? undefined;

  const [elfSession, setElfSession] = useState<ElfSession | null>(null);
  const [plan, setPlan] = useState<PlanState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderErr, setReminderErr] = useState<null | string>(null);
  const [reminderMsg, setReminderMsg] = useState<null | string>(null);

  const [hydratedFromSession, setHydratedFromSession] = useState(false);


    const names = getChildrenNames(elfSession);


    let title: string;
    if (names.length === 0) {
      title = "Here’s your family’s 24-night Elf plan 🎄";
    } else if (names.length === 1) {
      title = `Here’s ${names[0]}’s 24-night Elf plan 🎄`;
    } else if (names.length === 2) {
      title = `Here’s ${names[0]} & ${names[1]}’s 24-night Elf plan 🎄`;
    } else {
      const last = names[names.length - 1];
      const rest = names.slice(0, -1).join(', ');
      title = `Here’s ${rest} & ${last}’s 24-night Elf plan 🎄`;
    }

  // Derived helpers for plan shape
  const planObject =
    plan && typeof plan !== 'string' ? (plan as ElfPlanObject) : null;

  const hasPlanObject =
    !!planObject && Array.isArray(planObject.days) && planObject.days.length > 0;

  const isBrewing =
    !plan && (isLoading || sessionLoading || !hydratedFromSession);

  // Clear any stale mini-session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('elf-mini-session-id');
    }
  }, []);

  // -------- Load session from backend --------
  useEffect(() => {
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
        if (cancelled) return;

        const fullSession = data.session as StoredElfPlan;
        console.log('[Success page] full Elf session from API:', fullSession);

        // Ensure the session belongs to THIS user
        const authRes = await fetch('/api/auth/me');
        const auth = authRes.ok ? await authRes.json() : { email: null };

        if (
          fullSession.userEmail &&
          auth.email &&
          fullSession.userEmail !== auth.email
        ) {
          console.warn(
            '[Success page] Session does not belong to current user. Ignoring stale/hijacked session.',
          );

          setElfSession(null);
          setPlan(null);
          setHydratedFromSession(true);
          return;
        }

        localStorage.removeItem('elf-mini-session-id');

        setElfSession({
          sessionId: fullSession.sessionId,
          childName: fullSession.childName ?? 'your child',
          ageRange: fullSession.ageRange ?? '',
          startDate: fullSession.startDate ?? '',
          vibe: (fullSession.vibe ?? 'silly') as ElfVibe,
        });

        // If the plan is already present in the session, hydrate it
            // If a plan is already present, only hydrate it if it matches
        // the *latest* chat info. If the chat is newer than the plan,
        // treat the old plan as stale and let the Success page regenerate.
        let hydratedPlan: PlanState = null;

        if (fullSession.plan) {
          const planGeneratedAt = fullSession.planGeneratedAt ?? 0;

          // introChatTranscript is an array of { at, messages, reply }
          const transcript = Array.isArray(fullSession.introChatTranscript)
            ? fullSession.introChatTranscript
            : [];

          const lastIntroAt = transcript.reduce((max: number, turn: any) => {
            const t = typeof turn?.at === 'number' ? turn.at : 0;
            return t > max ? t : max;
          }, 0);

          const isPlanStale =
            planGeneratedAt > 0 && lastIntroAt > 0 && planGeneratedAt < lastIntroAt;

          if (isPlanStale) {
            console.log(
              '[Success page] existing plan is older than latest chat – treating as stale and regenerating',
              { planGeneratedAt, lastIntroAt },
            );
            hydratedPlan = null; // force auto-generate
          } else {
            console.log(
              '[Success page] hydrating existing plan from session',
              { planGeneratedAt, lastIntroAt },
            );
            hydratedPlan = fullSession.plan as PlanState;
          }
        }

        setPlan(hydratedPlan);


        setHydratedFromSession(true);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(
            err.message ||
              "I couldn't load your Elf session. If this keeps happening, please start again from the homepage.",
          );
        }
        setHydratedFromSession(true);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // -------- Plan text formatter (for fallback view) --------
  function formatPlanForDisplay(planState: PlanState): string {
    if (!planState) return '';

    if (typeof planState === 'string') return planState;

    const overview = planState.planOverview
      ? `${planState.planOverview.trim()}\n\n`
      : '';

    const dayLines =
      planState.days?.map((day, idx) => {
        const dayNumber = day.dayNumber ?? idx + 1;
        const title = day.title ? ` – ${day.title}` : '';
        const desc = day.description?.trim() ?? '';
        const note = day.noteFromElf
          ? `\nNote from your Elf: ${day.noteFromElf.trim()}`
          : '';

        return `Day ${dayNumber}${title}\n${desc}${note}`;
      }) ?? [];

    return overview + dayLines.join('\n\n');
  }

  const planText = formatPlanForDisplay(plan);

  // -------- Generate full plan --------
  async function handleGenerate() {
    setError(null);

    if (!sessionId) {
      setError('Missing session ID. Please contact support.');
      return;
    }

    setIsLoading(true);
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

      const data = await res.json();
      console.log('[Success page] generate-plan response:', data);

      // Try to find the plan on flexible keys
      let incoming: any =
        data.plan ?? data.planJson ?? data.planText ?? data.fullPlan;

      // Sometimes API might send back the whole session with plan inside
      if (!incoming && data.session?.plan) {
        incoming = data.session.plan;
      }

      if (!incoming) {
        throw new Error('Plan was generated but not returned by the API.');
      }

      // If it’s a string, try to JSON.parse it, but fall back to the raw string
      if (typeof incoming === 'string') {
        try {
          const parsed = JSON.parse(incoming);
          setPlan(parsed);
        } catch {
          setPlan(incoming);
        }
      } else {
        setPlan(incoming as PlanState);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // -------- Auto-generate when we can (no button, no chat) --------
  useEffect(() => {
    if (!sessionId) return;
    if (!hydratedFromSession) return;
    if (sessionLoading) return;
    if (isLoading) return;
    if (plan) return; // already have a plan (string or object)

    void handleGenerate();
  }, [sessionId, hydratedFromSession, sessionLoading, isLoading, plan]);

  // -------- Save nightly email reminders --------
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
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
      const hourLocal = 7; // 7am local

      const res = await fetch('/api/subscribe-email-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: reminderEmail,
          sessionId,
          timezone,
          hourLocal,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Error saving reminder.');
      }

      setReminderMsg(
        'Got it – once you lock in your plan, I’ll email you each day with exactly what to set up at bedtime.',
      );
    } catch (err: any) {
      console.error(err);
      setReminderErr(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (!sessionId) return null;

  const childLabel = elfSession?.childName
    ? `${elfSession.childName}’s`
    : 'your';

  // -------- JSX --------
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section
          className={`rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 ${
            hasPlanObject
              ? 'space-y-6'
              : 'grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'
          }`}
        >
          {/* LEFT */}
          <div className="space-y-6">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                Payment complete
                <span className="h-1 w-1 rounded-full bg-emerald-300" />
                Saved in your account
              </p>

              <h1 className="mb-2 text-2xl font-semibold md:text-3xl">
                {hasPlanObject || plan
                  ? title
                  : `Merry is brewing your Elf plan 🎄`}
              </h1>

              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
                  ~1 minute
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  {plan ? 'Your plan is ready' : 'Your plan is being prepared'}
                </span>
              </div>

              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </div>

            {/* BREWING INDICATOR – ONLY while no plan at all */}
            {!plan && (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 md:px-5 md:py-5">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-9 w-9 items-center justify-center">
                    <span className="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-emerald-500/30" />
                    <span className="relative inline-flex h-5 w-5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-50">
                      Merry is putting your 24-night Elf plan together…
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      This usually takes under a minute. We’re using everything
                      you shared about your kiddo and your vibe to build a
                      simple, low-effort plan.
                    </p>
                  </div>
                </div>

                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li>
                    • 24 mornings of Elf setups tailored to your child’s age and
                    vibe.
                  </li>
                  <li>
                    • You’ll be able to check, tweak, or swap any days once the
                    plan appears below.
                  </li>
                  <li>
                    • When you’re happy and commit to your plan, you can turn on
                    daily emails that tell you exactly what to set up at
                    bedtime.
                  </li>
                </ul>

                {isBrewing && (
                  <p className="text-[11px] text-emerald-300">
                    Brewing mischief and cosy moments… ✨
                  </p>
                )}
              </div>
            )}

            {/* SWIPER when we have a proper JSON plan */}
            {hasPlanObject && planObject && (
              <>
                <ElfPlanSwiper
                  days={planObject.days!.map((day) => ({
                    dayNumber: day.dayNumber!,
                    title: day.title!,
                    description: day.description!,
                    noteFromElf: day.noteFromElf ?? null,
                    morningMoment: (day as any).morningMoment ?? null,
                    materials: (day as any).materials ?? [],
                    weekday: day.weekday,
                    date: day.date,
                    imageUrl: (day as any).imageUrl ?? null,
                  }))}
                  sessionId={sessionId}
                />

         
              </>
            )}

            {/* FALLBACK: show the plan as text if it’s not in the expected JSON shape */}
            {plan && !hasPlanObject && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 md:px-5 md:py-5">
                <p className="mb-2 text-sm font-semibold text-slate-50">
                  Your Elf plan is ready 🎄
                </p>
                <p className="mb-3 text-xs text-slate-300">
                  We’ve generated your 24-morning plan, but it came back in a
                  simpler text format. You can still use this immediately —
                  each day is listed below. If this keeps happening, send me a
                  screenshot and I’ll tweak the JSON response.
                </p>
                <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-900/80 p-3 text-[11px] leading-relaxed text-slate-100 whitespace-pre-wrap">
                  {planText}
                </pre>
              </div>
            )}
          </div>

          {/* RIGHT: Merry illustration while brewing */}
          {!hasPlanObject && !plan && (
            <div className="relative mt-4 flex items-center justify-center md:mt-0">
              <div className="absolute -inset-1 rounded-3xl bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.35),transparent_55%),radial-gradient(circle_at_80%_100%,rgba(56,189,248,0.25),transparent_55%)] opacity-80 blur-2xl" />
              <div className="relative w-full max-w-xs rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.95)] sm:max-w-sm">
                <img
                  src="/elf-pose.png"
                  alt="Merry the Elf posing on a stool"
                  className="h-auto w-full rounded-xl object-cover"
                />
                <p className="mt-3 text-[11px] text-slate-300 sm:text-xs">
                  This is Merry – your personal Elf planner. She’s stitching
                  together 24 nights of mischief and cosy moments so you don’t
                  have to think at 11pm.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
