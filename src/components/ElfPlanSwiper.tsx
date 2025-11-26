// src/components/ElfPlanSwiper.tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, RefreshCw } from "lucide-react";
import SwapFeedbackModal from "./SwapFeedbackModal";

export type SwiperDay = {
  dayNumber: number;
  title: string;
  description: string;
  noteFromElf?: string | null;
  morningMoment?: string | null;
  materials?: string[];
  weekday?: string;
  date?: string;
  imageUrl?: string | null;
};

type Props = {
  days: SwiperDay[];
  sessionId: string;
};

export default function ElfPlanSwiper({ days, sessionId }: Props) {
  const [index, setIndex] = useState(0);
  const [internalDays, setInternalDays] = useState<SwiperDay[]>(days);

  // love + seen tracking (still useful for future tweaks / analytics)
  const [lovedDays, setLovedDays] = useState<Set<number>>(() => new Set());
  const [seenDays, setSeenDays] = useState<Set<number>>(
    () => new Set(internalDays[0] ? [internalDays[0].dayNumber] : []),
  );

  // commit state
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitDone, setCommitDone] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const current = internalDays[index];

  // mark current as seen whenever index changes
  useEffect(() => {
    if (!current) return;
    setSeenDays((prev) => {
      if (prev.has(current.dayNumber)) return prev;
      const next = new Set(prev);
      next.add(current.dayNumber);
      return next;
    });
  }, [current?.dayNumber]);

  const allSeen = seenDays.size === internalDays.length;
  const allLoved = lovedDays.size === internalDays.length;

  // User can now commit any time once the plan is visible.
  const canCommit = !commitDone;

  function next() {
    if (index < internalDays.length - 1) setIndex((i) => i + 1);
  }
  function prev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  async function handleCommit(reason: "manual" | "auto" = "manual") {
    if (commitLoading || commitDone || !sessionId) return;

    // For auto-commit we don't show errors/alerts; just best-effort.
    const isManual = reason === "manual";
    if (isManual) {
      setCommitLoading(true);
      setCommitError(null);
    }

    try {
      const res = await fetch("/api/commit-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reason }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        if (isManual) {
          throw new Error(data?.message || "Could not commit plan.");
        } else {
          // silent failure for auto-commit
          console.warn("[ElfPlanSwiper] auto-commit failed", data);
          return;
        }
      }

      setCommitDone(true);
    } catch (err: any) {
      console.error("[ElfPlanSwiper] commit error", err);
      if (reason === "manual") {
        setCommitError(
          err?.message ||
            "Something went wrong locking in this plan. Please try again.",
        );
      }
    } finally {
      if (reason === "manual") {
        setCommitLoading(false);
      }
    }
  }

  // Auto-commit when the user leaves / hides the page (best-effort).
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;

    const autoCommit = () => {
      if (commitDone || commitLoading) return;

      try {
        const payload = JSON.stringify({ sessionId, reason: "auto" });
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/commit-plan", blob);
        } else {
          // fire-and-forget fetch; ignore result
          void fetch("/api/commit-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          });
        }
        setCommitDone(true);
      } catch (e) {
        console.error("[ElfPlanSwiper] auto-commit exception", e);
      }
    };

    const handleBeforeUnload = () => autoCommit();
    const handlePageHide = () => autoCommit();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") autoCommit();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionId, commitDone, commitLoading]);

  async function handleLove() {
    if (!current) return;
    setLovedDays((prev) => {
      if (prev.has(current.dayNumber)) return prev;
      const next = new Set(prev);
      next.add(current.dayNumber);
      return next;
    });
  }

  // SWAP modal wiring
  const [swapOpen, setSwapOpen] = useState(false);
  function openSwap() {
    setSwapOpen(true);
  }

  function handleSwapComplete(swappedDay: SwiperDay) {
    setInternalDays((prev) =>
      prev.map((d) =>
        d.dayNumber === swappedDay.dayNumber ? swappedDay : d,
      ),
    );
  }

  if (!current) return null;

  return (
    <div className="w-full">
      {/* Pagination header */}
      <div className="mb-4 flex justify-between text-sm text-slate-300">
        <span>
          Day {current.dayNumber} of {internalDays.length}
        </span>
        <span>
          {current.weekday} — {current.date}
        </span>
      </div>

      {/* Card */}
      <div className="relative min-h-[420px] rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl transition-all duration-300">
        <h2 className="mb-2 text-xl font-semibold text-slate-50">
          {current.title}
        </h2>

        <p className="mb-3 whitespace-pre-line text-sm text-slate-300">
          {current.description}
        </p>

        {current.morningMoment && (
          <p className="mb-3 text-sm italic text-emerald-300">
            🌅 Morning moment: {current.morningMoment}
          </p>
        )}

        {current.noteFromElf && (
          <p className="mb-3 text-sm italic text-emerald-200">
            ✨ Note from Merry: “{current.noteFromElf}”
          </p>
        )}

        {current.materials && current.materials.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-semibold text-slate-400">
              Materials
            </p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-slate-300">
              {current.materials.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleLove}
            className="flex items-center gap-1 rounded-lg border border-emerald-500 bg-emerald-600/20 px-3 py-2 text-xs text-emerald-300 transition hover:bg-emerald-600/30"
          >
            <Heart size={14} /> Love it
          </button>

          <button
            onClick={openSwap}
            className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700/30 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-700/40"
          >
            <RefreshCw size={14} /> Swap
          </button>
        </div>

        {/* Commit CTA – now always available once the plan is visible */}
        {canCommit && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="mb-2 text-xs text-emerald-100">
              Happy with the gist of this plan? You don’t have to read every
              single day right now.
            </p>
            <p className="mb-3 text-[11px] text-emerald-100">
              Lock it in and Merry will email you an overview, a full materials
              list, and then a tiny nudge each morning. If you simply close this
              page later, she’ll also treat this as your final plan and start
              the emails automatically.
            </p>
            <button
              onClick={() => handleCommit("manual")}
              disabled={commitLoading || commitDone}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {commitDone
                ? "Plan locked in ✅"
                : commitLoading
                ? "Locking in your plan…"
                : "Lock in this Elf plan & start emails"}
            </button>
            {commitError && (
              <p className="mt-2 text-[11px] text-red-400">{commitError}</p>
            )}
            {(allSeen || allLoved) && (
              <p className="mt-2 text-[10px] text-emerald-300">
                {allLoved
                  ? "You’ve loved every day in this plan."
                  : "You’ve scrolled through the whole month."}{" "}
                You can still tweak or swap later if something feels off.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={prev}
          disabled={index === 0}
          className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 disabled:opacity-40"
        >
          <ChevronLeft />
        </button>

        <button
          onClick={next}
          disabled={index === internalDays.length - 1}
          className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 disabled:opacity-40"
        >
          <ChevronRight />
        </button>
      </div>

      {swapOpen && (
        <SwapFeedbackModal
          day={current}
          sessionId={sessionId}
          onClose={() => setSwapOpen(false)}
          onSwapComplete={handleSwapComplete}
        />
      )}
    </div>
  );
}
