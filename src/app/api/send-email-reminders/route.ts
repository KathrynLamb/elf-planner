// src/app/api/subscribe-email-reminder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { getElfSession, patchElfSession, redis } from '@/lib/elfStore';
import { buildElfEmailHtml } from '@/lib/elfEmail';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);

const REMINDER_SET_KEY = 'elf:reminder:sessions';

function getTodayInTimezone(tz: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = (body.email as string | undefined)?.trim();
    const sessionId = body.sessionId as string | undefined;
    const timezone = (body.timezone as string | undefined) || 'Europe/London';
    const hourLocal =
      typeof body.hourLocal === 'number' ? body.hourLocal : 21; // default 9pm

    if (!email || !sessionId) {
      return NextResponse.json(
        { message: 'Missing email or sessionId.' },
        { status: 400 },
      );
    }

    const session = await getElfSession(sessionId);
    if (!session || !session.plan || !session.plan.days || session.plan.days.length === 0) {
      return NextResponse.json(
        { message: 'No Elf plan found yet. Please generate your plan first.' },
        { status: 400 },
      );
    }

    // 1) Save reminder settings + index session
    await patchElfSession(sessionId, {
      reminderEmail: email,
      reminderTimezone: timezone,
      reminderHourLocal: hourLocal,
    });

    await redis.sadd(REMINDER_SET_KEY, sessionId);

    const plan = session.plan;

    // 2) Decide which day to send immediately
    const today = getTodayInTimezone(timezone);
    const days = plan.days as any[];

    let dayToSend =
      days.find((d) => d.date === today) ||
      days.find((d) => d.date > today) ||
      days[0];

    if (!dayToSend) {
      return NextResponse.json({ ok: true, message: 'Reminder saved, but no day to send.' });
    }

    // 3) Ensure we have an image for this day
    let imageUrl: string | null = dayToSend.imageUrl ?? null;

    if (!imageUrl && dayToSend.imagePrompt) {
      try {
        const imgRes = await client.images.generate({
          model: 'gpt-image-1',
          prompt: dayToSend.imagePrompt,
          size: '1024x1024',
          n: 1,
        });

        console.log("IMG ", imgRes)


        const first = imgRes.data?.[0] as any | undefined;
        imageUrl = first?.url ?? null;

        if (imageUrl) {
          const updatedDays = days.map((d) =>
            d.date === dayToSend.date ? { ...d, imageUrl } : d,
          );

          await patchElfSession(sessionId, {
            plan: { ...plan, days: updatedDays },
          });
        }
      } catch (err) {
        console.error('[subscribe-email-reminder] image generation failed', err);
        // fine: we can still send email without image
      }
    }

    // 4) Send immediate "here’s what your nightly emails look like" email
    await resend.emails.send({
      from: 'Merry the Elf <merry@elfontheshelf.uk>',
      to: email,
      subject: `Here’s tonight’s Elf idea for ${session.childName ?? 'your kiddo'}`,
      html: buildElfEmailHtml({
        childName: session.childName ?? 'your kiddo',
        planOverview: plan.planOverview ?? '',
        day: {
          weekday: dayToSend.weekday,
          date: dayToSend.date,
          title: dayToSend.title,
          description: dayToSend.description,
          noteFromElf: dayToSend.noteFromElf,
        },
        imageUrl,
      }),
    });

    return NextResponse.json({
      ok: true,
      message:
        'Reminder saved and a first nightly Elf email has been sent so you can see what to expect.',
    });
  } catch (err: any) {
    console.error('[subscribe-email-reminder] error', err);
    return NextResponse.json(
      { message: 'Error saving reminder or sending preview email.', error: err?.message },
      { status: 500 },
    );
  }
}
