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

    const materialsListHtml = allMaterials.length
      ? `<ul style="margin: 12px 0 0; padding-left: 20px;">
          ${allMaterials
            .map(
              (m) =>
                `<li style="margin-bottom:4px; line-height:1.5;">${m}</li>`
            )
            .join('')}
        </ul>`
      : `<p style="margin: 12px 0 0; line-height:1.6;">
           Your Elf needs no special materials — just a cosy home!
         </p>`;

    // ---- BUILD OVERVIEW EMAIL ----
    const introEmailHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>Your Elf plan is ready</title>
  </head>
  <body style="margin:0; padding:0; background:#020617; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#e5e7eb;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:#020617; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:640px; background:#020617; padding:0 16px;">
            <tr>
              <td style="padding:0 0 24px 0; text-align:center; color:#9ca3af; font-size:12px;">
                Merry the Elf · Elf Planner
              </td>
            </tr>
            <tr>
              <td style="background:#020617; border-radius:18px; padding:28px 24px 28px; border:1px solid #1f2937;">
                <h1 style="margin:0 0 12px; font-size:24px; line-height:1.25; color:#f9fafb;">
                  Your Elf plan is all wrapped up 🎄
                </h1>
                <p style="margin:0 0 12px; font-size:14px; line-height:1.6; color:#e5e7eb;">
                  Thanks for reviewing your <strong>24-night Elf plan</strong>. From tonight onwards,
                  Merry has your back – no more 11.30pm “I forgot the Elf” panic.
                </p>

                <p style="margin:16px 0 6px; font-size:14px; font-weight:600; color:#f9fafb;">
                  Elf season checklist
                </p>
                <p style="margin:0; font-size:13px; line-height:1.5; color:#e5e7eb;">
                  Here are the simple bits and bobs that will be handy to have around this month
                  (you don’t need everything at once – just a gentle heads-up):
                </p>
                ${materialsListHtml}

                <p style="margin:20px 0 8px; font-size:14px; line-height:1.6; color:#e5e7eb;">
                  Each morning you’ll get a quick email with:
                </p>
                <ul style="margin:0 0 16px; padding-left:20px; font-size:13px; line-height:1.6; color:#e5e7eb;">
                  <li>tonight’s Elf setup in clear, human language,</li>
                  <li>a tiny note for your child to discover in the morning, and</li>
                  <li>an easier “I’m exhausted” fallback option if the day’s gone sideways.</li>
                </ul>

                <p style="margin:0 0 4px; font-size:13px; line-height:1.5; color:#9ca3af;">
                  You can reopen your full plan any time from your Elf Planner account.
                </p>

                <p style="margin:18px 0 0; font-size:13px; line-height:1.5; color:#e5e7eb;">
                  With a sprinkle of chaos and a lot of kindness,<br/>
                  <strong>Merry the Elf ✨</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 0; text-align:center; color:#6b7280; font-size:11px;">
                You’re receiving this because you asked Merry to plan your Elf season.
                If this wasn’t you, you can ignore this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    // ---- SEND EMAIL ----
    await resend.emails.send({
      from: 'Merry the Elf <merry@elfontheshelf.uk>',
      to: session.userEmail,
      subject: `Your Elf plan is ready for ${session.childName ?? 'your kiddo'} 🎄`,
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
