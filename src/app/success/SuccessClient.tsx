// src/app/success/SuccessClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StoredElfPlan } from '@/lib/elfStore';
import ElfPlanSwiper from '@/components/ElfPlanSwiper';
import { SiteFooter } from '../SiteFooter';

type ElfVibe = 'silly' | 'kind' | 'calm';

type ElfSession = {
  sessionId: string;
  childName: string;
  ageRange: string;
  startDate: string;
  vibe: ElfVibe;
};

type ChatMessage = {
  id: string;
  from: 'elf' | 'parent';
  text: string;
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

  // Keeping chat state in case we reuse it later, but UI is now hidden.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hotlineDone, setHotlineDone] = useState(false);
  const [hotlineSkipped, setHotlineSkipped] = useState(false);

  const [hydratedFromSession, setHydratedFromSession] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] =
    useState<MediaRecorder | null>(null);
  const [recordStartTime, setRecordStartTime] = useState<number | null>(null);

  const hasPlanObject = Boolean(plan && typeof plan !== 'string');

  const chatRef = React.useRef<HTMLDivElement | null>(null);

  // Clear any stale mini-session ID to avoid pulling old data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('elf-mini-session-id');
    }
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

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

        // Clear stale local mini-session ID
        localStorage.removeItem('elf-mini-session-id');

        // Set essential top-level fields
        setElfSession({
          sessionId: fullSession.sessionId,
          childName: fullSession.childName ?? 'your child',
          ageRange: fullSession.ageRange ?? '',
          startDate: fullSession.startDate ?? '',
          vibe: (fullSession.vibe ?? 'silly') as ElfVibe,
        });

        // Hydrate plan if present
        if (fullSession.plan) {
          setPlan(fullSession.plan as PlanState);
        }

        // Hydrate ONLY the Elf hotline transcript (no mini-chat replay)
        const hydrated: ChatMessage[] = [];

        if (Array.isArray(fullSession.hotlineTranscript)) {
          fullSession.hotlineTranscript.forEach((turn: any, idx: number) => {
            if (turn?.type === 'welcome') {
              if (typeof turn.reply === 'string' && turn.reply.trim()) {
                hydrated.push({
                  id: `hotline-${idx}-welcome`,
                  from: 'elf',
                  text: turn.reply,
                });
              }
              return;
            }

            if (turn?.type === 'turn') {
              if (typeof turn.message === 'string' && turn.message.trim()) {
                hydrated.push({
                  id: `hotline-${idx}-parent`,
                  from: 'parent',
                  text: turn.message,
                });
              }
              if (typeof turn.reply === 'string' && turn.reply.trim()) {
                hydrated.push({
                  id: `hotline-${idx}-elf`,
                  from: 'elf',
                  text: turn.reply,
                });
              }
              return;
            }

            // Legacy fallback
            if ('role' in (turn || {}) && 'content' in (turn || {})) {
              hydrated.push({
                id: `hotline-${idx}`,
                from: (turn as any).role === 'assistant' ? 'elf' : 'parent',
                text: (turn as any).content,
              });
              return;
            }

            if (Array.isArray((turn as any)?.messages)) {
              (turn as any).messages.forEach(
                (m: { role: string; content: string }, mIdx: number) => {
                  hydrated.push({
                    id: `hotline-${idx}-${mIdx}`,
                    from: m.role === 'assistant' ? 'elf' : 'parent',
                    text: m.content,
                  });
                },
              );

              if (
                typeof (turn as any).reply === 'string' &&
                (turn as any).reply.trim()
              ) {
                hydrated.push({
                  id: `hotline-${idx}-reply`,
                  from: 'elf',
                  text: (turn as any).reply,
                });
              }
            }
          });
        }

        if (hydrated.length > 0) {
          setChatMessages(hydrated);
        }

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

  // -------- Voice hotline helpers (kept for future use) --------
  async function startRecording() {
    try {
      if (!sessionId || isRecording) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const chunks: Blob[] = [];
      const start = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const durationMs = Date.now() - start;
        setRecordStartTime(null);

        if (durationMs < 300) {
          setError(
            'That was super quick – hold the button and say a full sentence for Merry 😊',
          );
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        void sendVoiceToHotline(chunks, stream);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordStartTime(start);
    } catch (err) {
      console.error('Error starting recording', err);
      setError(
        'I couldn’t access your microphone. Please check permissions or use the text box instead.',
      );
    }
  }

  function stopRecording() {
    if (!mediaRecorder) return;
    setIsRecording(false);
    mediaRecorder.stop();
  }

  function speak(text: string) {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const englishVoice =
      voices.find((v) => v.lang?.toLowerCase().startsWith('en-')) ?? null;
    if (englishVoice) utterance.voice = englishVoice;
    utterance.rate = 1;
    utterance.pitch = 1.1;

    synth.speak(utterance);
  }

  async function sendVoiceToHotline(chunks: Blob[], stream: MediaStream) {
    if (!sessionId || chunks.length === 0) return;

    setChatLoading(true);
    setError(null);

    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('audio', blob, 'hotline.webm');

      const res = await fetch('/api/elf-hotline-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || 'Something went wrong with the Elf hotline.',
        );
      }

      const userMsg: ChatMessage = {
        id: `parent-${Date.now()}`,
        from: 'parent',
        text: data.transcript,
      };

      const elfMsg: ChatMessage = {
        id: `elf-${Date.now()}`,
        from: 'elf',
        text: data.reply,
      };

      setChatMessages((prev) => [...prev, userMsg, elfMsg]);
      setHotlineDone(Boolean(data.done));
      speak(data.reply);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setChatLoading(false);
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  // -------- Plan viewer (unused in UI now but kept) --------
  function PlanViewer({ plan }: { plan: ElfPlanObject }) {
    if (!plan || !plan.days) return null;

    return (
      <div className="mt-6 md:mt-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5 lg:p-6">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 flex items-center gap-2 text-slate-50">
              <span>🎄 Your 24-Night Elf Plan</span>
            </h2>

            {plan.planOverview && (
              <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line">
                {plan.planOverview}
              </p>
            )}
          </div>

          <div className="mt-2 space-y-3">
            {plan.days.map((day, idx) => (
              <article
                key={day.dayNumber ?? day.date ?? idx}
                className="rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-3 sm:px-4 sm:py-4"
              >
                <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-50">
                    Day {day.dayNumber ?? idx + 1} — {day.title}
                  </h3>
                  {day.date && day.weekday && (
                    <span className="text-[10px] sm:text-xs text-slate-400">
                      {day.weekday}, {day.date}
                    </span>
                  )}
                </header>

                <p className="mt-2 text-xs sm:text-sm text-slate-300 whitespace-pre-line">
                  {day.description}
                </p>

                {day.noteFromElf && (
                  <p className="mt-2 text-xs sm:text-sm text-emerald-300 italic">
                    ✨ Note from Merry: “{day.noteFromElf}”
                  </p>
                )}

                {day.imagePrompt && (
                  <details className="mt-3 text-[11px] text-slate-400">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
                      Show image prompt (for setup reference)
                    </summary>
                    <p className="mt-2 text-[11px] sm:text-xs whitespace-pre-line">
                      {day.imagePrompt}
                    </p>
                  </details>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  const planText = formatPlanForDisplay(plan); // currently unused

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
      setPlan(data.plan as PlanState);
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
    if (plan) return;

    // We have a valid session and no plan yet – brew automatically.
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
        {/* MAIN CARD: hero + brewing indicator / plan */}
        <section
          className={`rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 ${
            hasPlanObject
              ? 'space-y-6'
              : 'grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'
          }`}
        >
          {/* LEFT: header + brewing indicator or plan */}
          <div className="space-y-6">
            {/* Slim hero */}
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                Payment complete
                <span className="h-1 w-1 rounded-full bg-emerald-300" />
                Saved in your account
              </p>

              <h1 className="mb-2 text-2xl font-semibold md:text-3xl">
                {hasPlanObject
                  ? `Here’s ${childLabel} 24-night Elf plan 🎄`
                  : `Merry is brewing ${childLabel} Elf plan 🎄`}
              </h1>

              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
                  ~1 minute
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  Your plan is being prepared
                </span>
              </div>

              {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
              {!sessionId && (
                <p className="mt-3 text-xs text-amber-300">
                  No session ID found in the URL. If you reached this page by
                  mistake, go back to the homepage and start again.
                </p>
              )}
            </div>

            {/* BREWING INDICATOR (no chat, no button) */}
            {!hasPlanObject && (
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
                  <li>• 24 mornings of Elf setups tailored to your child’s age and vibe.</li>
                  <li>• You’ll be able to check, tweak, or swap any days once the plan appears below.</li>
                  <li>
                    • When you’re happy and commit to your plan, you can turn on
                    daily emails that tell you exactly what to set up at
                    bedtime.
                  </li>
                </ul>

                {isLoading && (
                  <p className="text-[11px] text-emerald-300">
                    Brewing mischief and cosy moments… ✨
                  </p>
                )}

                {!isLoading && !sessionLoading && !plan && (
                  <p className="text-[11px] text-slate-400">
                    Almost there – if this takes more than a minute, try
                    refreshing the page.
                  </p>
                )}
              </div>
            )}

            {/* When plan exists, show it full-width under the header */}
            {hasPlanObject && (
              <ElfPlanSwiper
                days={(plan as ElfPlanObject).days!.map((day) => ({
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
            )}
          </div>

          {/* RIGHT: Merry illustration while brewing */}
          {!hasPlanObject && (
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
