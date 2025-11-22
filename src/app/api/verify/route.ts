// src/app/api/auth/verify/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, loginTokens, sessions, elfSessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const sessionId = url.searchParams.get('session_id');

  if (!token || !sessionId) {
    return NextResponse.redirect('/login?error=missing');
  }

  const now = new Date();

  // lookup token
  const [record] = await db
    .select()
    .from(loginTokens)
    .where(and(eq(loginTokens.token, token), gt(loginTokens.expiresAt, now)));

  if (!record) {
    return NextResponse.redirect('/login?error=expired');
  }

  // get user
  const [user] = await db.select().from(users).where(eq(users.id, record.userId));
  if (!user) {
    return NextResponse.redirect('/login?error=user-missing');
  }

  // mark token used
  await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(eq(loginTokens.id, record.id));

  // create session
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const [session] = await db
    .insert(sessions)
    .values({ userId: user.id, expiresAt })
    .returning();

  // SET COOKIE
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id=${sessionId}`
  );

  response.cookies.set('auth_session_id', session.id, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
  });

  // convert guest elf session → owned session
  await db
    .update(elfSessions)
    .set({ userId: user.id })
    .where(eq(elfSessions.id, sessionId));

  return response;
}
