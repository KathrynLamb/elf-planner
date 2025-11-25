// src/app/api/verify/route.ts
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

  // 1) Look up valid token
  const [record] = await db
    .select()
    .from(loginTokens)
    .where(and(eq(loginTokens.token, token), gt(loginTokens.expiresAt, now)));

  if (!record) {
    return NextResponse.redirect('/login?error=expired');
  }

  // 2) Fetch user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, record.userId));

  if (!user) {
    return NextResponse.redirect('/login?error=user-missing');
  }

  // 3) Mark token used (optional but nice)
  await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(eq(loginTokens.id, record.id));

  // 4) Create auth session & cookie
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  const [session] = await db
    .insert(sessions)
    .values({ userId: user.id, expiresAt })
    .returning();

  // 5) Attach elf session to this user
  const [elfSession] = await db
    .update(elfSessions)
    .set({ userId: user.id })
    .where(eq(elfSessions.id, sessionId))
    .returning();

  // 6) Decide where to send them
  // ⬇️ tweak these conditions + paths to match your schema/routes
  let redirectPath: string;

  const hasPaid =
    elfSession &&
    // choose whatever field you use to mark payment:
    // Boolean(elfSession.paidAt) ||
    // Boolean(elfSession.planCommittedAt) ||
    Boolean((elfSession as any).paidAt || (elfSession as any).planCommittedAt);

  if (hasPaid) {
    // Already paid → send to full plan / success page
    redirectPath = `/success?session_id=${sessionId}`;
  } else {
    // Not paid yet → send to checkout / paywall
    redirectPath = `/checkout?session_id=${sessionId}`;
  }

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}${redirectPath}`,
  );

  response.cookies.set('auth_session_id', session.id, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
  });

  return response;
}
