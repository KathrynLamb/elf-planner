// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loginTokens, sessions, users } from '@/lib/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?login_error=missing_token', req.url));
  }

  const now = new Date();

  // Find login token — WITHOUT relations
  const lt = await db.query.loginTokens.findFirst({
    where: and(
      eq(loginTokens.token, token),
      isNull(loginTokens.usedAt),
      gt(loginTokens.expiresAt, now),
    )
  });

  if (!lt) {
    return NextResponse.redirect(new URL('/?login_error=invalid_or_expired', req.url));
  }

  // Fetch user manually
  const user = await db.query.users.findFirst({
    where: eq(users.id, lt.userId)
  });

  if (!user) {
    return NextResponse.redirect(new URL('/?login_error=user_missing', req.url));
  }

  // Mark token used
  await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(eq(loginTokens.id, lt.id));

  // Create session
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(sessions)
    .values({ userId: user.id, expiresAt })
    .returning();

  // Set cookie
  const res = NextResponse.redirect(new URL('/?login=ok', req.url));

  res.cookies.set('auth_session_id', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return res;
}
