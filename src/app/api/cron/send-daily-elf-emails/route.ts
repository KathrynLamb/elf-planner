// src/app/api/cron/send-daily-elf-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { redis, getElfSession, patchElfSession } from '@/lib/elfStore';
import { Resend } from 'resend';
import { saveElfImageFromBase64 } from '@/lib/elfImageStore';
import { buildElfEmailHtml } from '@/lib/elfEmail';

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

      // Lazily generate the image once, store URL on plan
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
            // store base64 in Redis and get a short HTTPS URL
            imageUrl = await saveElfImageFromBase64(first.b64_json);
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

        console.log('[cron] sending nightly email via Resend', {
          sessionId,
          to: session.reminderEmail,
          subject,
          includesImage: !!imageUrl,
        });

        await resend.emails.send({
          from: 'Merry the Elf <merry@elfontheshelf.uk>', // verified Resend domain
          to: session.reminderEmail,
          subject,
          html: buildElfEmailHtml({
            childName: session.childName ?? 'your kiddo',
            planOverview: plan.planOverview,
            day: todayPlan,
            imageUrl, // ✅ URL only, no CID
          }),
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
