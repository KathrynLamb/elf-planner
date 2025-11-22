'use client';

import React from 'react';

export function GeneratePlanButton({ sessionId }: { sessionId: string }) {
  const [showEmail, setShowEmail] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleEmailSubmit() {
    if (!email) return;

    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sessionId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.message || 'Something went wrong.');
      setLoading(false);
      return;
    }

    setMessage('Magic link sent! Check your inbox to continue.');
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {!showEmail ? (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900"
        >
          Generate My Full Plan
        </button>
      ) : (
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Enter your email…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full bg-white/10 px-4 py-2 text-sm text-white"
          />

          <button
            type="button"
            disabled={loading}
            onClick={handleEmailSubmit}
            className="w-full rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 disabled:bg-slate-600"
          >
            {loading ? 'Sending magic link…' : 'Send Magic Link'}
          </button>

          {message && (
            <p className="text-xs text-slate-300 text-center">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
