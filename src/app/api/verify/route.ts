// src/app/api/verify/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, loginTokens, sessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getElfSession } from '@/lib/elfStore';

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const sessionId = url.searchParams.get('session_id');

  if (!token || !sessionId) {
    return NextResponse.redirect('/login?error=missing');
  }

  const now = new Date();

  // 1) Look up valid login token
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

  // 5) Load the elf session from Redis/elfStore
  const storedSession = await getElfSession(sessionId).catch(() => null);

  if (!storedSession) {
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

  const profile = (storedSession as any).inferredProfile ?? {};

  // 6) Decide if they’ve already paid
  const hasPaid =
    Boolean((storedSession as any).paypalSessionId) ||
    Boolean(storedSession.plan && storedSession.plan.status === 'final');

  // Build a reliable base URL
  const reqUrl = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    reqUrl.origin;

  let redirectUrl: string;

  if (hasPaid) {
    // ✅ Already paid → straight to full plan / success
    redirectUrl = `${baseUrl}/success?session_id=${sessionId}`;
  } else {
    // ❌ Not paid yet → create PayPal order and send them straight to PayPal

    const childName =
      toTrimmedString((storedSession as any).childName) ||
      toTrimmedString(profile.childName) ||
      'your child';

    const ageRange =
      toTrimmedString((storedSession as any).ageRange) ||
      toTrimmedString(profile.ageRange) ||
      '4–6 years';

    const year = new Date().getFullYear();
    const startDate =
      toTrimmedString((storedSession as any).startDate) ||
      toTrimmedString(profile.startDate) ||
      `${year}-12-01`;

    const vibe =
      toTrimmedString((storedSession as any).vibe) ||
      toTrimmedString(profile.vibe) ||
      'silly';

    console.log('[verify] PayPal details', {
      sessionId,
      childName,
      ageRange,
      startDate,
      vibe,
    });

    const amount = 14.99;
    const currency: 'GBP' | 'USD' | 'EUR' = 'GBP';

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
      // Fallback: go to internal checkout instead of exploding
      redirectUrl = `${baseUrl}/checkout?session_id=${sessionId}&error=paypal`;
    } else {
      const data = await paypalRes.json();
      const approveUrl = data.approveUrl as string | undefined;
      if (!approveUrl) {
        console.error(
          '[verify] Missing approveUrl from /api/paypal-elf/create',
          data,
        );
        redirectUrl = `${baseUrl}/checkout?session_id=${sessionId}&error=paypal`;
      } else {
        // ✅ Straight to PayPal smart checkout
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
