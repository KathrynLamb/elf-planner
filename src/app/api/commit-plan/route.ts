// src/app/api/commit-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getElfSession, patchElfSession, redis } from '@/lib/elfStore';
import { Resend } from 'resend';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY!);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const REMINDER_SET_KEY = 'elf:reminder:sessions';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ message: 'Missing sessionId' }, { status: 400 });
    }

    const session = await getElfSession(sessionId);
    if (!session) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    if (!session.plan || !session.plan.days) {
      return NextResponse.json(
        { message: 'Cannot commit — plan not found.' },
        { status: 400 }
      );
    }

    if (!session.userEmail) {
      return NextResponse.json(
        { message: 'Missing user email — cannot send plan.' },
        { status: 400 }
      );
    }

    // Prevent double commits
    if (session.planCommittedAt) {
      console.log('[commit-plan] Already committed, ignoring');
      return NextResponse.json({ ok: true, alreadyCommitted: true });
    }

    // ---- BUILD MATERIALS LIST ----
    const allMaterials = Array.from(
      new Set(
        session.plan.days
          .flatMap((d) => d.materials || [])
          .map((m) => m.trim())
          .filter(Boolean)
      )
    );

    const materialsList = allMaterials.length
      ? allMaterials.map((m) => `• ${m}`).join('\n')
      : 'Your Elf needs no special materials — just a cosy home!';

    // ---- BUILD OVERVIEW EMAIL ----
    const introEmailHtml = `
      <h1>Your Elf Plan is Ready 🎄</h1>
      <p>Thanks for reviewing all 30 nights! Your Elf plan is now locked in.</p>

      <h2>Monthly Materials Checklist</h2>
      <pre style="font-size:14px; white-space:pre-wrap;">${materialsList}</pre>

      <p>You’ll receive a fresh Elf idea every morning starting tomorrow.</p>
      <p>Love, Merry the Elf ✨</p>
    `;

    // ---- SEND EMAIL ----
    await resend.emails.send({
      from: 'Merry the Elf <merry@elfontheshelf.uk>',
      to: session.userEmail,
      subject: `Your Elf Plan is Ready for ${session.childName ?? 'your kiddo'} 🎄`,
      html: introEmailHtml,
    });

    // ---- REGISTER FOR DAILY CRON ----
    await redis.sadd(REMINDER_SET_KEY, sessionId);

    // ---- STORE IN SESSION ----
    await patchElfSession(sessionId, {
      planCommittedAt: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[commit-plan] error', err);
    return NextResponse.json(
      { message: err.message || 'Commit failed.' },
      { status: 500 }
    );
  }
}
