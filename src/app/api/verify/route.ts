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

  // 3) Mark token used
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

  // 5) Attach elf session to this user (if it already exists in Postgres)
  const [elfSession] = await db
    .update(elfSessions)
    .set({ userId: user.id })
    .where(eq(elfSessions.id, sessionId))
    .returning();

  // If we couldn't find an elfSession row at all, just dump them back home
  if (!elfSession) {
    const homeResponse = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=no-elf-session`,
    );
    homeResponse.cookies.set('auth_session_id', session.id, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
    return homeResponse;
  }

  // 6) Decide where to send them
  const hasPaid =
    Boolean((elfSession as any).paidAt) ||
    Boolean((elfSession as any).planCommittedAt);

  // Base URL helper (same pattern you use elsewhere)
  const reqUrl = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    reqUrl.origin;

  let redirectUrl: string;

  if (hasPaid) {
    // Already paid → full plan / success page
    redirectUrl = `${baseUrl}/success?session_id=${sessionId}`;
  } else {
    // Not paid yet → create PayPal order server-side and redirect straight to PayPal

    // Fallbacks in case some fields are missing
    const childName = elfSession.childName ?? 'your child';
    const ageRange = elfSession.ageRange ?? '4–6 years';
    const startDate =
      elfSession.startDate ?? `${new Date().getFullYear()}-12-01`;
    const vibe = (elfSession.vibe as any) || 'silly';

    // Hard-coded product price & currency – adjust if needed
    const amount = 14.99;
    const currency: 'GBP' | 'USD' | 'EUR' = 'GBP';

    // Call your existing PayPal create route
    const paypalRes = await fetch(`${baseUrl}/api/paypal-elf/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
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

    if (!paypalRes.ok) {
      console.error(
        '[verify] /api/paypal-elf/create failed',
        paypalRes.status,
        await paypalRes.text().catch(() => ''),
      );
      // Fallback: send them to your internal checkout screen instead of blowing up
      redirectUrl = `${baseUrl}/checkout?session_id=${sessionId}&error=paypal`;
    } else {
      const data = await paypalRes.json();
      const approveUrl = data.approveUrl as string | undefined;
      if (!approveUrl) {
        console.error('[verify] Missing approveUrl from paypal-elf/create', data);
        redirectUrl = `${baseUrl}/checkout?session_id=${sessionId}&error=paypal`;
      } else {
        // ✅ Go straight to PayPal
        redirectUrl = approveUrl;
      }
    }
  }

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set('auth_session_id', session.id, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
  });

  return response;
}
