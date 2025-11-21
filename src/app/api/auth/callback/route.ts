// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, loginTokens, sessions } from '@/lib/db';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?login_error=missing_token', req.url));
  }

  // Find valid token
  const now = new Date();
  const lt = await db.query.loginTokens.findFirst({
    where: and(
      eq(loginTokens.token, token),
      isNull(loginTokens.usedAt),
      gt(loginTokens.expiresAt, now),
    ),
    with: { user: true } as any, // if you define relations; otherwise do a join manually
  });

  if (!lt) {
    return NextResponse.redirect(new URL('/?login_error=invalid_or_expired', req.url));
  }

  // Mark token as used
  await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(eq(loginTokens.id, lt.id));

  // Create session (30 days)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [session] = await db
    .insert(sessions)
    .values({ userId: lt.userId, expiresAt })
    .returning();

  // Set cookie
  const res = NextResponse.redirect(new URL('/?login=ok', req.url));
  res.cookies.set('elf_session_id', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return res;
}
