import { NextRequest, NextResponse } from 'next/server';
import {
  getElfSession,
  patchElfSession,
  ElfPlanObject,
  redis,
  REMINDER_SET_KEY,
} from '@/lib/elfStore';

export const runtime = 'nodejs';

// Very small stub – plug this into your real email provider.
async function sendElfIntroEmail(opts: {
  to: string;
  childName: string | null;
  plan: ElfPlanObject;
  materials: string[];
}) {
  const { to, childName, plan, materials } = opts;

  // Replace this with Resend/Postmark/etc.
  console.log('[dev] Would send Elf intro email to', to, {
    childName,
    overview: plan.planOverview,
    totalMaterials: materials.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      email,
      timezone,
      hourLocal,
    }: {
      sessionId?: string;
      email?: string;
      timezone?: string;
      hourLocal?: number;
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId.' },
        { status: 400 },
      );
    }

    const session = await getElfSession(sessionId);
    if (!session || !session.plan) {
      return NextResponse.json(
        { message: 'Elf plan not found for this session.' },
        { status: 404 },
      );
    }

    if (!session.plan.days || session.plan.days.length === 0) {
      return NextResponse.json(
        { message: 'Elf plan has no days to commit.' },
        { status: 400 },
      );
    }

    const plan = session.plan as ElfPlanObject;

    const toEmail =
      email ||
      session.reminderEmail ||
      session.userEmail ||
      session.payerEmail;

    if (!toEmail) {
      return NextResponse.json(
        {
          message:
            'No email found for this plan. Please sign in or provide an email address.',
        },
        { status: 400 },
      );
    }

    const tz = timezone || session.reminderTimezone || 'Europe/London';
    const hour =
      typeof hourLocal === 'number'
        ? hourLocal
        : session.reminderHourLocal ?? 7;

    // Build deduped materials list for the whole month
    const materialsSet = new Set<string>();
    for (const day of plan.days) {
      (day.materials ?? []).forEach((m) => {
        const trimmed = m.trim();
        if (trimmed) materialsSet.add(trimmed);
      });
    }
    const materials = Array.from(materialsSet);

    // Fire intro email (overview + materials list)
    await sendElfIntroEmail({
      to: toEmail,
      childName: session.childName,
      plan,
      materials,
    });

    // Mark plan as committed + store reminder settings
    const committedAt = session.planCommittedAt ?? Date.now();

    await patchElfSession(sessionId, {
      planCommittedAt: committedAt,
      reminderEmail: toEmail,
      reminderTimezone: tz,
      reminderHourLocal: hour,
    });

    // Register this session for your daily cron worker
    await redis.sadd(REMINDER_SET_KEY, sessionId);

    return NextResponse.json({
      ok: true,
      committedAt,
      reminderEmail: toEmail,
      reminderTimezone: tz,
      reminderHourLocal: hour,
      materialsCount: materials.length,
    });
  } catch (err: any) {
    console.error('[commit-plan] error', err);
    return NextResponse.json(
      {
        message:
          err?.message || 'Something went wrong committing this Elf plan.',
      },
      { status: 500 },
    );
  }
}
