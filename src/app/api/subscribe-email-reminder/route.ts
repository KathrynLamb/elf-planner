// src/app/api/subscribe-email-reminder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { patchElfSession, getElfSession, redis } from '@/lib/elfStore';

export const runtime = 'nodejs';

const REMINDER_SET_KEY = 'elf:reminder:sessions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY!);

// Reuse the same HTML shape as the cron job
function buildElfEmailHtml(args: {
  childName: string;
  planOverview?: string | null;
  day: {
    weekday?: string;
    date?: string;
    title: string;
    description: string;
    noteFromElf?: string | null;
  };
  imageUrl: string | null;
}) {
  const { childName, planOverview, day, imageUrl } = args;

  const headerLine =
    day.weekday && day.date ? `${day.weekday} · ${day.title}` : day.title;

  return `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; padding:16px;">
    <h1 style="font-size:20px; margin-bottom:8px;">Tonight’s Elf-on-the-Shelf plan for ${childName}</h1>
    ${
      planOverview
        ? `<p style="font-size:14px; color:#475569; margin-bottom:16px;">
             ${planOverview}
           </p>`
        : ''
    }

    <h2 style="font-size:18px; margin:16px 0 4px;">${headerLine}</h2>
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

function buildWelcomeEmailHtml(childName: string) {
  return `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; padding:16px;">
    <h1 style="font-size:20px; margin-bottom:8px;">You’re on Merry’s Elf reminder list 🎄</h1>
    <p style="font-size:14px; color:#475569; margin-bottom:12px;">
      Thanks for signing up! I’ll email you with simple, low-mess Elf ideas
      so you don’t have to remember to open the website when you’re tired.
    </p>
    <p style="font-size:13px; color:#0f172a; margin-bottom:8px;">
      As soon as your 30-night Elf plan is ready, your nightly emails will
      look something like this:
    </p>
    <ul style="font-size:13px; color:#0f172a; padding-left:18px; margin-bottom:16px;">
      <li>One Elf idea for that night</li>
      <li>Step-by-step setup in plain language</li>
      <li>Optional note you can read or copy from your Elf</li>
      <li>A picture of the scene to copy, so you don’t have to think</li>
    </ul>
    <p style="font-size:12px; color:#94a3b8;">
      If you didn’t mean to sign up, just reply “STOP” and I’ll unsubscribe you.
    </p>
  </div>
  `;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  console.log('[subscribe-email-reminder] POST hit');

  try {
    const body = await req.json();
    const { email, sessionId, timezone, hourLocal } = body ?? {};

    const maskedEmail =
      typeof email === 'string'
        ? email.replace(/(.{2}).+(@.+)/, '$1***$2')
        : email;

    console.log('[subscribe-email-reminder] parsed body', {
      email: maskedEmail,
      sessionId,
      timezone,
      hourLocal,
    });

    if (!email || !sessionId) {
      console.warn(
        '[subscribe-email-reminder] missing required fields',
        JSON.stringify({ emailPresent: !!email, sessionIdPresent: !!sessionId }),
      );
      return NextResponse.json(
        { message: 'Missing email or sessionId.' },
        { status: 400 },
      );
    }

    const tz = timezone ?? 'Europe/London';
    const hour =
      typeof hourLocal === 'number' && !Number.isNaN(hourLocal)
        ? hourLocal
        : 7;

    // Store reminder settings
    console.log('[subscribe-email-reminder] patching session with reminder prefs', {
      sessionId,
      tz,
      hour,
    });

    await patchElfSession(sessionId, {
      reminderEmail: email,
      reminderTimezone: tz,
      reminderHourLocal: hour, // 7am by default
    });

    console.log('[subscribe-email-reminder] reminder prefs saved');

    // Add to the set consumed by the cron job
    await redis.sadd(REMINDER_SET_KEY, sessionId);
    console.log('[subscribe-email-reminder] added to Redis reminder set', {
      REMINDER_SET_KEY,
      sessionId,
    });

    // --- Fire one immediate email so the user sees what to expect ---
    try {
      console.log(
        '[subscribe-email-reminder] loading session for preview email',
        { sessionId },
      );
      const session = await getElfSession(sessionId);

      if (!session) {
        console.warn(
          '[subscribe-email-reminder] no session found when preparing preview email',
          { sessionId },
        );
      } else {
        console.log('[subscribe-email-reminder] loaded session summary', {
          sessionId: session.sessionId,
          childName: session.childName,
          hasPlan: !!session.plan,
        });
      }

      const plan: any = session?.plan;
      const days: any[] | undefined = plan?.days;

      if (plan && Array.isArray(days) && days.length > 0) {
        console.log('[subscribe-email-reminder] plan present, days count', {
          sessionId,
          dayCount: days.length,
        });

        const firstDay = days[0];

        let imageUrl: string | null = firstDay.imageUrl ?? null;

        console.log(
          '[subscribe-email-reminder] first day summary before image check',
          {
            title: firstDay.title,
            date: firstDay.date,
            weekday: firstDay.weekday,
            hasImageUrl: !!firstDay.imageUrl,
            hasImagePrompt: !!firstDay.imagePrompt,
          },
        );

        // If there's an imagePrompt but no image yet, generate once and store
        if (!imageUrl && firstDay.imagePrompt) {
          console.log(
            '[subscribe-email-reminder] generating image for first day via OpenAI',
            {
              sessionId,
              title: firstDay.title,
            },
          );
          try {
            const imgRes = await openai.images.generate({
              model: 'gpt-image-1',
              prompt: firstDay.imagePrompt,
              size: '1024x1024',
              n: 1,
            });

            const first = (imgRes as any).data?.[0];
            console.log(
              '[subscribe-email-reminder] OpenAI image generate response meta',
              {
                hasData: !!(imgRes as any).data,
                firstHasUrl: !!first?.url,
              },
            );

            if (first?.url) {
              imageUrl = first.url as string;

              const updatedDays = days.map((d: any, idx: number) =>
                idx === 0 ? { ...d, imageUrl } : d,
              );

              await patchElfSession(sessionId, {
                plan: {
                  ...plan,
                  days: updatedDays,
                },
              });

              console.log(
                '[subscribe-email-reminder] stored generated imageUrl on day 1',
                {
                  sessionId,
                  imageUrl,
                },
              );
            } else {
              console.warn(
                '[subscribe-email-reminder] OpenAI returned no URL, continuing without image',
                { sessionId },
              );
            }
          } catch (err) {
            console.error(
              '[subscribe-email-reminder] image generation failed',
              err,
            );
            // continue without image
          }
        } else {
          console.log(
            '[subscribe-email-reminder] skipping image generation',
            {
              sessionId,
              hasImageUrlAlready: !!imageUrl,
              hasImagePrompt: !!firstDay.imagePrompt,
            },
          );
        }

        console.log(
          '[subscribe-email-reminder] sending preview nightly-style email via Resend',
          {
            to: maskedEmail,
            sessionId,
            subject: `Here’s tonight’s Elf idea: ${firstDay.title}`,
            includesImage: !!imageUrl,
          },
        );

        await resend.emails.send({
          from: 'Merry the Elf <merry@elfontheshelf.uk>',
          to: email,
          subject: `Here’s tonight’s Elf idea: ${firstDay.title}`,
          html: buildElfEmailHtml({
            childName: session?.childName ?? 'your kiddo',
            planOverview: plan.planOverview ?? '',
            day: {
              weekday: firstDay.weekday,
              date: firstDay.date,
              title: firstDay.title,
              description: firstDay.description,
              noteFromElf: firstDay.noteFromElf,
            },
            imageUrl,
          }),
        });

        console.log(
          '[subscribe-email-reminder] preview nightly-style email send call completed',
          { sessionId },
        );
      } else {
        // No plan yet – send a simple welcome / expectation email
        console.log(
          '[subscribe-email-reminder] no plan yet – sending welcome email only',
          { sessionId },
        );

        await resend.emails.send({
          from: 'Merry the Elf <merry@elfontheshelf.uk>',
          to: email,
          subject: 'You’re on Merry’s Elf reminder list 🎄',
          html: buildWelcomeEmailHtml(session?.childName ?? 'your kiddo'),
        });

        console.log(
          '[subscribe-email-reminder] welcome email send call completed',
          { sessionId },
        );
      }
    } catch (err) {
      console.error(
        '[subscribe-email-reminder] preview/welcome email send failed',
        err,
      );
      // Don’t fail the whole request if the preview email has an issue
    }

    console.log('[subscribe-email-reminder] completed successfully', {
      sessionId,
      elapsedMs: Date.now() - startedAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[subscribe-email-reminder] fatal error', err, {
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { message: 'Error saving reminder.' },
      { status: 500 },
    );
  }
}
