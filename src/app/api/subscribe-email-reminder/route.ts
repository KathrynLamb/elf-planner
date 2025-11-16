// src/app/api/subscribe-email-reminder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { patchElfSession, redis } from '@/lib/elfStore';

export const runtime = 'nodejs';

const REMINDER_SET_KEY = 'elf:reminder:sessions';

export async function POST(req: NextRequest) {
  try {
    const { email, sessionId, timezone, hourLocal } = await req.json();

    if (!email || !sessionId) {
      return NextResponse.json(
        { message: 'Missing email or sessionId.' },
        { status: 400 },
      );
    }

    await patchElfSession(sessionId, {
      reminderEmail: email,
      reminderTimezone: timezone ?? 'Europe/London',
      reminderHourLocal: typeof hourLocal === 'number' ? hourLocal : 7, // 7am
    });

    await redis.sadd(REMINDER_SET_KEY, sessionId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[subscribe-email-reminder] error', err);
    return NextResponse.json(
      { message: 'Error saving reminder.' },
      { status: 500 },
    );
  }
}
