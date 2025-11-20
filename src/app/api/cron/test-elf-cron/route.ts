// src/app/api/cron/test-elf-cron/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(req: NextRequest) {
  const now = new Date().toISOString();
  console.log('[cron] test-elf-cron HIT', now);

  // ⚠️ For this test route, no auth. Vercel Cron can't send custom headers.

  try {
    await resend.emails.send({
      from: 'Merry the Elf <merry@elfontheshelf.uk>', // your verified domain
      to: 'katylamb2000@gmail.com',                   // your email for testing
      subject: `Test cron ping at ${now}`,
      html: `<p>Hi Kate,</p>
             <p>This is your <strong>test-elf-cron</strong> hitting at:<br/>
             <code>${now}</code></p>
             <p>If you're seeing this every minute, Vercel Cron is working. 🎄</p>`
    });

    console.log('[cron] test-elf-cron email send OK', { now });
  } catch (err) {
    console.error('[cron] test-elf-cron email send FAILED', err);
  }

  return NextResponse.json({ ok: true, at: now });
}
