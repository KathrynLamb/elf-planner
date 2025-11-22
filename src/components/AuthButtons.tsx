

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
