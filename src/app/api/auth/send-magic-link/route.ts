// src/app/api/auth/send-magic-link/route.ts
import { NextResponse } from 'next/server';
import { users, loginTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import crypto from 'crypto';
import { db } from '@/db';

const resend = new Resend(process.env.RESEND_API_KEY!);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const { email, sessionId } = await req.json();

    if (!email || !sessionId) {
      return NextResponse.json(
        { message: 'Missing email/sessionId' },
        { status: 400 }
      );
    }

    const normalisedEmail = String(email).trim().toLowerCase();

    // find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalisedEmail));

    if (!user) {
      const inserted = await db
        .insert(users)
        .values({ email: normalisedEmail })
        .returning();
      user = inserted[0];
    }

    // create login token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

    await db.insert(loginTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const magicUrl = `${BASE_URL}/api/verify?token=${token}&session_id=${sessionId}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>Your Elf Planner magic link</title>
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
                <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#f9fafb;">
                  Here’s your magic link ✨
                </h1>
                <p style="margin:0 0 12px; font-size:14px; line-height:1.6; color:#e5e7eb;">
                  Tap the button below to sign in and see your full Elf plan.
                  No password, no account faff – just a little Merry magic.
                </p>

                <p style="margin:18px 0 18px; text-align:center;">
                  <a href="${magicUrl}"
                    style="
                      display:inline-block;
                      padding:10px 22px;
                      border-radius:999px;
                      background:#ef4444;
                      color:#f9fafb;
                      font-size:14px;
                      font-weight:600;
                      text-decoration:none;
                    ">
                    Sign in & view my Elf plan
                  </a>
                </p>

                <p style="margin:0 0 8px; font-size:12px; line-height:1.6; color:#e5e7eb;">
                  If the button doesn’t work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 12px; font-size:11px; line-height:1.6; color:#9ca3af; word-break:break-all;">
                  <a href="${magicUrl}" style="color:#93c5fd; text-decoration:none;">${magicUrl}</a>
                </p>

                <p style="margin:0 0 4px; font-size:12px; line-height:1.6; color:#9ca3af;">
                  This link will expire in <strong>30 minutes</strong> for safety.
                  If it expires, you can always request a fresh one from the Elf Planner site.
                </p>

                <p style="margin:16px 0 0; font-size:12px; line-height:1.5; color:#e5e7eb;">
                  See you back at the North Pole control room,<br/>
                  <strong>Merry the Elf 🎄</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 0 0; text-align:center; color:#6b7280; font-size:11px;">
                You’re receiving this because someone entered this email on Elf Planner.
                If this wasn’t you, you can safely ignore this message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    await resend.emails.send({
      from: 'Merry the Elf <merry@elfontheshelf.uk>',
      to: normalisedEmail,
      subject: 'Your magic link to Elf Planner ✨',
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[send-magic-link] ERROR', err);
    return NextResponse.json({ message: err.message || 'Failed to send magic link.' }, { status: 500 });
  }
}
