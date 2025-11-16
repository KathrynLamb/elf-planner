// src/app/api/cron/send-daily-elf-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { redis, getElfSession, patchElfSession } from '@/lib/elfStore';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);

const REMINDER_SET_KEY = 'elf:reminder:sessions';

// Small helper: get "today" string in YYYY-MM-DD for a timezone
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

export async function GET(req: NextRequest) {
  // Optional simple auth so randoms can’t hit your cron route:
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Don’t pass a generic, just cast the result
    const rawIds = await redis.smembers(REMINDER_SET_KEY);
    const sessionIds = (rawIds ?? []) as string[];

    if (!sessionIds || sessionIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sentCount = 0;

    for (const sessionId of sessionIds) {
      const session = await getElfSession(sessionId);
      if (!session || !session.plan) continue;

      // These are stored but may not yet be in your TS type; use `any` to avoid noise
      const reminderEmail =
        (session as any).reminderEmail as string | null | undefined;
      const reminderTimezone =
        (session as any).reminderTimezone as string | null | undefined;

      if (!reminderEmail) continue;

      const tz = reminderTimezone || 'Europe/London';
      const today = getTodayInTimezone(tz);

      const plan: any = session.plan;
      if (!Array.isArray(plan.days)) continue;

      const todayPlan = plan.days.find((d: any) => d.date === today);
      if (!todayPlan) continue; // no plan for today

      let imageUrl: string | null = todayPlan.imageUrl ?? null;

      // Lazily generate the image once, store URL
      if (!imageUrl && todayPlan.imagePrompt) {
        try {
          const imgRes: any = await client.images.generate({
            model: 'gpt-image-1',
            prompt: todayPlan.imagePrompt,
            size: '1024x1024',
            n: 1,
          });

          imageUrl = imgRes?.data?.[0]?.url ?? null;

          if (imageUrl) {
            const updatedDays = plan.days.map((d: any) =>
              d.date === today ? { ...d, imageUrl } : d,
            );
            await patchElfSession(sessionId, {
              plan: {
                ...plan,
                days: updatedDays,
              },
            });
          }
        } catch (err) {
          console.error('[cron] image generation failed for', sessionId, err);
          // still send an email without an image
        }
      }

      // Send email
      try {
        await resend.emails.send({
          from: 'Merry the Elf <merry@yourdomain.com>',
          to: reminderEmail,
          subject: `Tonight’s Elf idea: ${todayPlan.title}`,
          html: buildElfEmailHtml({
            childName: session.childName ?? 'your kiddo',
            planOverview: plan.planOverview || '',
            day: {
              weekday: todayPlan.weekday || '',
              date: todayPlan.date,
              title: todayPlan.title,
              description: todayPlan.description,
              noteFromElf: todayPlan.noteFromElf ?? null,
            },
            imageUrl,
          }),
        });

        sentCount += 1;
      } catch (err) {
        console.error('[cron] email send failed for', sessionId, err);
      }
    }

    return NextResponse.json({ ok: true, sent: sentCount });
  } catch (err: any) {
    console.error('[cron] fatal error', err);
    return NextResponse.json(
      { message: 'Cron failed', error: err?.message },
      { status: 500 },
    );
  }
}

function buildElfEmailHtml(args: {
  childName: string;
  planOverview: string;
  day: {
    weekday: string;
    date: string;
    title: string;
    description: string;
    noteFromElf?: string | null;
  };
  imageUrl: string | null;
}) {
  const { childName, planOverview, day, imageUrl } = args;

  return `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; padding:16px;">
    <h1 style="font-size:20px; margin-bottom:8px;">Tonight’s Elf-on-the-Shelf plan for ${childName}</h1>
    <p style="font-size:14px; color:#475569; margin-bottom:16px;">
      ${planOverview}
    </p>

    <h2 style="font-size:18px; margin:16px 0 4px;">${day.weekday} · ${day.title}</h2>
    <p style="font-size:13px; color:#0f172a; white-space:pre-line; margin-bottom:12px;">
      ${day.description}
    </p>

    ${
      day.noteFromElf
        ? `<p style="font-size:13px; color:#22c55e; font-style:italic; margin-bottom:16px;">
          Note from Merry: “${day.noteFromElf}”
        </p>`
        : ''
    }

    ${
      imageUrl
        ? `<div style="margin-top:12px;">
             <img src="${imageUrl}" alt="Tonight's Elf setup idea" style="max-width:100%; border-radius:12px;" />
           </div>`
        : ''
    }

    <p style="font-size:11px; color:#94a3b8; margin-top:24px;">
      You’re getting this because you asked Merry for nightly Elf reminders. 
      If that was a mistake, you can reply “STOP” and I’ll unsubscribe you.
    </p>
  </div>
  `;
}
