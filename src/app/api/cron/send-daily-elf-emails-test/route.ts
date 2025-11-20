import { NextRequest, NextResponse } from 'next/server';
import { getElfSession, patchElfSession, redis } from '@/lib/elfStore';
import { Resend } from 'resend';
import { buildElfEmailHtml } from '@/lib/elfEmail';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY!);
const REMINDER_SET_KEY = 'elf:reminder:sessions';

// 🔧 hard-coded test image (use one of your own URLs)
const TEST_IMAGE_URL =
  'https://elfontheshelf.uk/api/elf-image/8a450d12-921b-4088-adb7-6d036f0af42a';

export async function GET(_req: NextRequest) {
  console.log('[cron-test] send-daily-elf-emails-test HIT');

  try {
    const sessionIds = (await redis.smembers(REMINDER_SET_KEY)) as string[];
    console.log('[cron-test] reminder session IDs', sessionIds);

    if (!sessionIds || sessionIds.length === 0) {
      console.log('[cron-test] no sessions in reminder set – exiting');
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sentCount = 0;

    for (const sessionId of sessionIds) {
      console.log('[cron-test] processing session', sessionId);

      const session = await getElfSession(sessionId);
      if (!session || !session.plan || !session.plan.days || !session.reminderEmail) {
        console.warn('[cron-test] missing session/plan/email, skipping', {
          sessionId,
          hasSession: !!session,
          hasPlan: !!session?.plan,
          hasDays: !!session?.plan?.days,
          reminderEmail: session?.reminderEmail,
        });
        continue;
      }

      const plan: any = session.plan;

      // 🔧 TEST: always use the first day in the plan
      const todayPlan = plan.days[0];
      if (!todayPlan) {
        console.warn('[cron-test] plan has no days, skipping', { sessionId });
        continue;
      }

      console.log('[cron-test] using test day', {
        sessionId,
        title: todayPlan.title,
        date: todayPlan.date,
      });

      // ensure the day has our hard-coded image
      let imageUrl: string | null = todayPlan.imageUrl ?? null;

      if (!imageUrl) {
        imageUrl = TEST_IMAGE_URL;

        const updatedDays = plan.days.map((d: any, idx: number) =>
          idx === 0 ? { ...d, imageUrl } : d,
        );

        await patchElfSession(sessionId, {
          plan: {
            ...plan,
            days: updatedDays,
          },
        });

        console.log('[cron-test] stored TEST imageUrl into plan day 0', {
          sessionId,
        });
      }

      // Send test email
      try {
        const subject = `[TEST] Tonight’s Elf idea: ${todayPlan.title}`;

        console.log('[cron-test] sending nightly email via Resend', {
          sessionId,
          to: session.reminderEmail,
          subject,
          includesImage: !!imageUrl,
        });

        await resend.emails.send({
          from: 'Merry the Elf <merry@elfontheshelf.uk>',
          to: session.reminderEmail,
          subject,
          html: buildElfEmailHtml({
            childName: session.childName ?? 'your kiddo',
            planOverview: plan.planOverview,
            day: todayPlan,
            imageUrl,
          }),
        });

        sentCount += 1;
        console.log('[cron-test] email send OK', { sessionId });
      } catch (err) {
        console.error('[cron-test] email send failed for', sessionId, err);
      }
    }

    console.log('[cron-test] finished run', { sentCount });
    return NextResponse.json({ ok: true, sent: sentCount });
  } catch (err: any) {
    console.error('[cron-test] fatal error', err);
    return NextResponse.json(
      { message: 'Cron test failed', error: err?.message },
      { status: 500 },
    );
  }
}
