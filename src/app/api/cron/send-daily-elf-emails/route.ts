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
  console.log('[cron] send-daily-elf-emails HIT');

  // Optional simple auth so randoms can’t hit your cron route:
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    console.warn('[cron] unauthorized request');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sessionIds = (await redis.smembers(REMINDER_SET_KEY)) as string[];
    console.log('[cron] reminder session IDs', sessionIds);

    if (!sessionIds || sessionIds.length === 0) {
      console.log('[cron] no sessions in reminder set – exiting');
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sentCount = 0;

    for (const sessionId of sessionIds) {
      console.log('[cron] processing session', sessionId);

      const session = await getElfSession(sessionId);
      if (!session) {
        console.warn('[cron] no session found, skipping', { sessionId });
        continue;
      }
      if (!session.plan || !session.plan.days || !session.reminderEmail) {
        console.warn('[cron] missing plan or reminderEmail, skipping', {
          sessionId,
          hasPlan: !!session.plan,
          hasDays: !!session.plan?.days,
          reminderEmail: session.reminderEmail,
        });
        continue;
      }

      const tz = session.reminderTimezone || 'Europe/London';
      const today = getTodayInTimezone(tz);
      console.log('[cron] computed today for timezone', {
        sessionId,
        tz,
        today,
      });

      const plan: any = session.plan;
      const todayPlan = plan.days.find((d: any) => d.date === today);
      if (!todayPlan) {
        console.log('[cron] no day entry for today, skipping', {
          sessionId,
          today,
        });
        continue;
      }

      console.log('[cron] found todayPlan', {
        sessionId,
        title: todayPlan.title,
        date: todayPlan.date,
        hasImageUrl: !!todayPlan.imageUrl,
        hasImagePrompt: !!todayPlan.imagePrompt,
      });

      let imageUrl: string | null = todayPlan.imageUrl ?? null;
      let inlineImageBase64: string | null = null;

      // Lazily generate the image once, store URL-ish data in plan + use base64 as CID attachment
      if (!imageUrl && todayPlan.imagePrompt) {
        try {
          console.log('[cron] generating image for todayPlan via OpenAI', {
            sessionId,
            title: todayPlan.title,
          });

          const imgRes = await client.images.generate({
            model: 'gpt-image-1',
            prompt: todayPlan.imagePrompt,
            size: '1024x1024',
            n: 1,
          });

          const first = imgRes.data?.[0] as { b64_json?: string } | undefined;

          console.log('[cron] OpenAI image generate response meta', {
            created: imgRes.created,
            hasData: !!imgRes.data?.length,
            hasB64: !!first?.b64_json,
          });

          if (first?.b64_json) {
            inlineImageBase64 = first.b64_json;
            // for your app UI we can stash a data URL on the plan
            imageUrl = `data:image/png;base64,${first.b64_json}`;
          } else {
            console.warn(
              '[cron] OpenAI returned no usable base64, continuing without image',
              { sessionId },
            );
          }

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

            console.log('[cron] stored imageUrl back into session plan', {
              sessionId,
              today,
            });
          }
        } catch (err) {
          console.error(
            '[cron] image generation failed for session',
            sessionId,
            err,
          );
          // we’ll still send an email without an image
        }
      }

      // Send email
      try {
        const subject = `Tonight’s Elf idea: ${todayPlan.title}`;
        const imageCid = inlineImageBase64 ? 'elf-inline-image' : null;

        console.log('[cron] sending nightly email via Resend', {
          sessionId,
          to: session.reminderEmail,
          subject,
          includesImage: !!inlineImageBase64,
        });

        await resend.emails.send({
          from: 'Merry the Elf <merry@elfontheshelf.uk>', // verified Resend domain
          to: session.reminderEmail,
          subject,
          html: buildElfEmailHtml({
            childName: session.childName ?? 'your kiddo',
            planOverview: plan.planOverview,
            day: todayPlan,
            imageCid,
          }),
          attachments: inlineImageBase64
          ? [
              {
                content: inlineImageBase64,
                filename: 'tonights-elf-idea.png',
                // CID-style inline image
                contentId: imageCid!,
              },
            ]
          : undefined,
        
        });

        sentCount += 1;
        console.log('[cron] nightly email send call completed', { sessionId });
      } catch (err) {
        console.error('[cron] email send failed for', sessionId, err);
      }
    }

    console.log('[cron] finished run', { sentCount });
    return NextResponse.json({ ok: true, sent: sentCount });
  } catch (err: any) {
    console.error('[cron] fatal error', err);
    return NextResponse.json(
      { message: 'Cron failed', error: err?.message },
      { status: 500 },
    );
  }
}

// Local HTML builder – matches the shape used above
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
  imageCid: string | null;
}) {
  const { childName, planOverview, day, imageCid } = args;

  return `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; padding:16px;">
    <h1 style="font-size:20px; margin-bottom:8px;">Tonight’s Elf-on-the-Shelf plan for ${childName}</h1>
    <p style="font-size:14px; color:#475569; margin-bottom:16px;">
      ${planOverview ?? ''}
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
      imageCid
        ? `<div style="margin-top:12px;">
             <img src="cid:${imageCid}" alt="Tonight's Elf setup idea" style="max-width:100%; border-radius:12px;" />
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
