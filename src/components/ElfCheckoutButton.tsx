'use client';

import * as React from 'react';

type ElfVibe = 'silly' | 'kind' | 'calm';

type ElfCheckoutProps = {
  sessionId: string;
  childName: string;
  ageRange: string;
  startDate: string;
  vibe: ElfVibe;
  amount?: number; // default 9
  currency?: 'GBP' | 'USD' | 'EUR'; // default GBP
  className?: string;
};

export function ElfCheckoutButton({
  sessionId,
  childName,
  ageRange,
  startDate,
  vibe,
  amount = 9,
  currency = 'GBP',
  className,
}: ElfCheckoutProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleClick() {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/paypal-elf/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          amount,
          currency,
          childName,
          ageRange,
          startDate,
          vibe,
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        // Optionally show a quick message before redirect
        // setError('Please sign in first, taking you to the magic-link page…');
      
        // Remember where they were so we can bounce back after login
        const currentUrl = window.location.href;
        const params = new URLSearchParams({
          next: currentUrl,
          // optional extra context if you want it later:
          reason: 'checkout',
          sessionId,
        });
      
        window.location.href = `/login?${params.toString()}`;
        return;
      }

      if (!res.ok || !data.approveUrl) {
        throw new Error(
          data?.message || 'Unable to start checkout. Please try again.',
        );
      }

      // Redirect to PayPal approval page
      window.location.href = data.approveUrl;
    } catch (err: any) {
      console.error('[ElfCheckoutButton] error', err);
      setError(
        err?.message ||
          'Something went wrong starting your payment. Please try again.',
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          'inline-flex w-full items-center justify-center gap-1 rounded-full bg-emerald-400 px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-400/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:shadow-none'
        }
      >
        {loading ? 'Opening PayPal…' : 'Unlock my full 30-night Elf plan'}
      </button>
      {error && (
        <p className="text-[10px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
