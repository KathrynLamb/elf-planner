// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  // 👇 cookies() is async in this context
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('elf_session_id');
  const sessionId = sessionCookie?.value;

  if (sessionId) {
    // delete your custom session row
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  const res = NextResponse.json({ ok: true });

  // clear your custom cookie
  res.cookies.set('elf_session_id', '', {
    path: '/',
    maxAge: 0,
  });

  // (optional but handy) clear next-auth cookies too
  res.cookies.set('next-auth.session-token', '', {
    path: '/',
    maxAge: 0,
  });
  res.cookies.set('__Secure-next-auth.session-token', '', {
    path: '/',
    maxAge: 0,
  });

  return res;
}
