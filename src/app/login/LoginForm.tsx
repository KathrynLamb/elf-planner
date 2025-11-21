// src/app/login/LoginForm.tsx (or similar)
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    const res = await signIn('email', {
      email,
      redirect: true,
      // 👇 where to land after user clicks the magic link
      callbackUrl: '/', // or '/plans'
    });

    // When redirect: true, NextAuth will navigate away,
    // so you usually don't need to handle res here
    if (res?.error) {
      setStatus('error');
      setError('Something went wrong sending your magic link. Please try again.');
    } else {
      setStatus('sent');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
      >
        {status === 'sending' ? 'Sending…' : 'Send magic link'}
      </button>
      {status === 'sent' && (
        <p className="text-xs text-emerald-300 mt-2">
          Check your email for a magic link to sign in.
        </p>
      )}
      {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
    </form>
  );
}
