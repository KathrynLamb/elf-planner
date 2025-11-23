// src/app/success/SuccessClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StoredElfPlan } from '@/lib/elfStore';
import ElfPlanSwiper from '@/components/ElfPlanSwiper';

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
            // New shape we’re now writing in /api/elf-hotline:
            // { type: 'welcome', reply }
            // { type: 'turn', message, reply }
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

  // -------- Voice hotline helpers (not wired to UI yet, but ready) --------
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

  // -------- Plan viewer (full-width when present) --------
  function PlanViewer({ plan }: { plan: ElfPlanObject }) {
    if (!plan || !plan.days) return null;

    return (
      <div className="mt-6 md:mt-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5 lg:p-6">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 flex items-center gap-2 text-slate-50">
              <span>🎄 Your 30-Night Elf Plan</span>
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

  // -------- Plan display helper (unused but kept) --------
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

  const planText = formatPlanForDisplay(plan); // currently unused but okay

  // -------- Kick off hotline on mount (only for fresh sessions) --------
  useEffect(() => {
    if (!sessionId) return;
    if (!hydratedFromSession) return;

    // If we already have any messages (from hydration), don't auto-start
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
  }, [sessionId, hydratedFromSession, chatMessages.length]);

  // -------- Text hotline --------
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
        let details: any = null;
        try {
          details = await res.json();
        } catch {
          // ignore
        }
        console.error('Elf hotline turn failed', details);
        setError(
          details?.message ||
            'Something went wrong talking to Merry. Please refresh and try again.',
        );
        setChatLoading(false);
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
        'Got it – I’ve emailed you your first Elf idea so you can see what to expect, and I’ll email you each morning as we begin.',
      );
    } catch (err: any) {
      console.error(err);
      setReminderErr(err.message || 'Something went wrong. Please try again.');
    }
  }

  const canShowGenerate = !plan && (hotlineDone || hotlineSkipped);
  if (!sessionId) return null; // or render a fallback
  // -------- JSX --------
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* MAIN CARD: hero + hotline + plan */}
        <section
          className={`rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 ${
            hasPlanObject
              ? 'space-y-6'
              : 'grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'
          }`}
        >
          {/* LEFT: header + hotline + (plan when ready) */}
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
                  ? `Here’s ${elfSession?.childName ? `${elfSession.childName}’s` : 'your'} 30-night Elf plan 🎄`
                  : `Let’s make an Elf plan that perfectly fits ${elfSession?.childName ? elfSession.childName : 'your kiddo'} 🎄`}
              </h1>

              <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
                    ~1–2 mins
                    <span className="h-1 w-1 rounded-full bg-emerald-300" />
                    Optional
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

            {/* ELF HOTLINE CARD – only before the plan exists */}
            {!hasPlanObject && (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 md:px-5 md:py-5">

                {/* Chat window */}
                <div
                      ref={chatRef}
                      className="max-h-64 space-y-2 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm"
                    >
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
                        <span className="inline-block max-w-[95%] rounded-lg border border-emerald-500/40 bg-emerald-500/8 px-3 py-1.5 text-left leading-relaxed whitespace-pre-line">
                          <strong className="mr-1">Merry:</strong>
                          {m.text}
                        </span>
                      ) : (
                        <span className="inline-block max-w-[95%] rounded-lg bg-slate-800 px-3 py-1.5 text-left leading-relaxed whitespace-pre-line">
                          {m.text}
                        </span>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-[12px] text-emerald-200">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                      <span>Merry is thinking…</span>
                    </div>
                  )}
                  {!chatLoading && chatMessages.length === 0 && (
                    <p className="text-[12px] text-slate-300">
                      Connecting you to Merry at the North Pole…
                    </p>
                  )}
                </div>

                {/* Text input */}
                <form
                  onSubmit={handleSendHotline}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={
                        hotlineDone
                          ? 'Merry has everything she needs – you can move to Step 2.'
                          : "Type what you’d say to Merry on the phone…"
                      }
                      disabled={chatLoading || hotlineDone}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || hotlineDone}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
                    >
                      Send
                    </button>
                  </div>
                </form>

                {/* Skip / status row */}
                <div className="flex flex-col gap-1 text-[11px] text-slate-400 md:flex-row md:items-center md:justify-between">
                  {hotlineDone ? (
                    <p className="text-emerald-300">
                      Merry has everything she needs – next up is brewing your
                      30-night plan.
                    </p>
                  ) : (
                    <p>
                      Too tired to chat? You can still skip this and get a great
                      plan.
                    </p>
                  )}
                  {!hotlineDone && (
                    <button
                      type="button"
                      onClick={() => setHotlineSkipped(true)}
                      className="self-start text-emerald-300 underline-offset-2 hover:underline md:self-auto"
                    >
                      Skip questions · go to Step 2
                    </button>
                  )}
                </div>

                {/* STEP 2: generate button, in-flow under hotline */}
                <div className="mt-3 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-emerald-300">
                        Next up
                      </p>
                      <h2 className="text-sm font-semibold md:text-base">
                        Brew your 30-morning Elf plan
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">
                    When you’re ready, click the button and we’ll use everything
                    Merry has learned to conjure a simple, low-effort plan:
                    30 mornings of Elf setups and short notes from your Elf.
                  </p>

                  <button
                    onClick={handleGenerate}
                    disabled={
                      isLoading ||
                      !sessionId ||
                      sessionLoading ||
                      !elfSession ||
                      !canShowGenerate
                    }
                    className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading
                      ? 'Brewing your Elf mischief…'
                      : !canShowGenerate
                      ? 'Finish or skip the hotline to unlock'
                      : sessionLoading || !elfSession
                      ? 'Loading your Elf details…'
                      : 'Generate my 30-morning Elf plan'}
                  </button>

                  <p className="text-[11px] text-slate-400">
                    You’ll see your full plan below once it’s brewed.
                  </p>
                </div>
              </div>
            )}


            {/* When plan exists, show it full-width under the header */}
            {hasPlanObject && (

  <ElfPlanSwiper
    days={(plan as ElfPlanObject).days!.map(day => ({
      dayNumber: day.dayNumber!,
      title: day.title!,
      description: day.description!,
      noteFromElf: day.noteFromElf ?? null,
      morningMoment: (day as any).morningMoment ?? null,
      materials: (day as any).materials ?? [],
      weekday: day.weekday,
      date: day.date,
      imageUrl: (day as any).imageUrl ?? null
    }))}
    sessionId={sessionId}
  />
)}
          </div>

          {/* RIGHT: Elf card (only before the plan exists) */}
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
                  This is Merry – your personal Elf planner. She’ll ask a few
                  cosy questions, then conjure ideas tuned to your kiddo and
                  your energy levels.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* NIGHTLY REMINDER SIGNUP (optional – still commented) */}
        {/*
        <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-7">
          <h3 className="text-sm font-semibold">
            Get nightly Elf email reminders
          </h3>
          <p className="text-xs text-slate-300">
            I can email you each morning with that day&apos;s Elf idea, so you
            don&apos;t have to remember to open this page when you&apos;re
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
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
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
        */}
      </div>
    </main>
  );
}
