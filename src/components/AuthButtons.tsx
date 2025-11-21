// // src/components/AuthButtons.tsx
// 'use client';

// import React, { useState } from 'react';

// export function MagicLinkLogin() {
//   const [email, setEmail] = useState('');
//   const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
//     'idle',
//   );
//   const [error, setError] = useState<string | null>(null);

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setStatus('sending');
//     setError(null);

//     try {
//       const res = await fetch('/api/auth/magic-link', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email }),
//       });

//       if (!res.ok) {
//         const data = await res.json().catch(() => ({}));
//         throw new Error(data?.message || 'Could not send magic link.');
//       }

//       setStatus('sent');
//     } catch (err: any) {
//       console.error(err);
//       setError(err.message || 'Something went wrong.');
//       setStatus('error');
//     }
//   }

//   return (
//     <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
//       <input
//         type="email"
//         required
//         placeholder="you@example.com"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
//       />
//       <button
//         type="submit"
//         disabled={status === 'sending'}
//         className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
//       >
//         {status === 'sending' ? 'Sending…' : 'Email me a login link'}
//       </button>
//       {status === 'sent' && (
//         <p className="text-[11px] text-emerald-300">
//           Check your inbox for a login link.
//         </p>
//       )}
//       {error && <p className="text-[11px] text-rose-300">{error}</p>}
//     </form>
//   );
// }

// export function SignOutButton() {
//   const [loading, setLoading] = useState(false);

//   async function handleSignOut() {
//     setLoading(true);
//     try {
//       await fetch('/api/auth/logout', { method: 'POST' });
//       window.location.href = '/';
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <button
//       type="button"
//       onClick={handleSignOut}
//       disabled={loading}
//       className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-60"
//     >
//       {loading ? 'Signing out…' : 'Sign out'}
//     </button>
//   );
// }



'use client';

import { signOut, useSession } from 'next-auth/react';

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (!session?.user) {
    return (
      <a
        href="/login"
        className="text-xs text-slate-300 hover:text-slate-100 underline-offset-2 hover:underline"
      >
        Sign in
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-xs text-slate-300 hover:text-slate-100 underline-offset-2 hover:underline"
    >
      Sign out ({session.user.email})
    </button>
  );
}
