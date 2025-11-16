import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Resend } from 'resend';
import { patchElfSession } from '@/lib/elfStore';

const resend = new Resend(process.env.RESEND_API_KEY!);
const fromEmail = process.env.REMINDER_FROM_EMAIL!;

export const runtime = 'nodejs';

export async function GET() {
  try {
    // get all reminder subs
    const keys = await redis.keys('elf:email:*');
    let sent = 0;

    for (const key of keys) {
      const sub = await redis.get<{
        email: string;
        currentDay: number;
        plan: string;
        childName: string;
        startDate?: string;
      }>(key);

      if (!sub) continue;
      if (sub.currentDay > 30) continue; // stop after day 30

      const { email, currentDay, plan, childName } = sub;

      const snippet = extractDaySnippet(plan, currentDay);

      // send email
      await resend.emails.send({
        from: `Elf Helper <${fromEmail}>`,
        to: email,
        subject: `Elf plan – Day ${currentDay} for ${childName}`,
        text: snippet,
      });

      // move to next day
      await redis.set(key, {
        ...sub,
        currentDay: currentDay + 1,
        lastSentAt: new Date().toISOString(),
      });


      sent++;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err: any) {
    console.error('Error sending email reminders', err);
    return NextResponse.json(
      { message: err.message || 'Error sending reminders.' },
      { status: 500 },
    );
  }
}

function extractDaySnippet(plan: string, day: number): string {
  const marker = `Day ${day}:`;
  const nextMarker = `Day ${day + 1}:`;

  const start = plan.indexOf(marker);
  if (start === -1) {
    // fallback: just send the whole plan with a pointer
    return `Here’s your Elf plan. Scroll to Day ${day}:\n\n${plan}`;
  }

  const end = plan.indexOf(nextMarker, start + marker.length);
  const body = end === -1 ? plan.slice(start) : plan.slice(start, end);

  return body.trim();
}
