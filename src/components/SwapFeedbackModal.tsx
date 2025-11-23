'use client';

import React, { useState } from 'react';

type SwapFeedbackModalProps = {
  day: { dayNumber: number };
  sessionId: string;
  onClose: () => void;
  onSwapComplete: (swappedDay: any) => void;
};

export default function SwapFeedbackModal({
  day,
  sessionId,
  onClose,
  onSwapComplete,
}: SwapFeedbackModalProps) {
  const [selections, setSelections] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  function toggle(reason: string) {
    setSelections((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  }

  async function submit() {
    if (loading) return;
    setLoading(true);

    const reasons = [...selections];
    if (customReason.trim()) reasons.push(customReason.trim());

    try {
      const res = await fetch('/api/swap-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          dayNumber: day.dayNumber,
          feedback: reasons,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error generating swap');
        return;
      }

      onSwapComplete(data.swapped);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-3 text-lg font-semibold">What didn&apos;t work for you?</h2>

        <div className="mb-4 space-y-2">
          {[
            'Too messy',
            'Too much time',
            'Requires materials I don’t have',
            'My child wouldn’t enjoy this',
            'Not the right vibe',
            'Already did this before',
          ].map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-slate-100">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                checked={selections.includes(r)}
                onChange={() => toggle(r)}
              />
              {r}
            </label>
          ))}
        </div>

        <textarea
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Something else?"
          className="mb-4 w-full rounded-lg bg-slate-800 p-2 text-sm text-slate-100 placeholder:text-slate-500"
        />

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? 'Swapping…' : 'Swap'}
          </button>

          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
