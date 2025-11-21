// src/app/api/auth/magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, users, loginTokens } from '@/lib/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const APP_URL = process.env.APP_URL || 'https://elfontheshelf.uk'; // adjust

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({} as any));

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ message: 'Email is required.' }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  // 1. Find or create user
  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalized),
  });

  let user = existing;
  if (!user) {
    const [inserted] = await db
      .insert(users)
      .values({ email: normalized })
      .returning();
    user = inserted;
  }

  // 2. Create login token (15 minutes)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(loginTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const magicUrl = `${APP_URL}/api/auth/callback?token=${encodeURIComponent(
    token,
  )}`;

  await resend.emails.send({
    from: 'Merry the Elf <login@elfontheshelf.uk>', // verified domain
    to: normalized,
    subject: 'Your magic login link for Elf Planner',
    html: `
      <p>Hi there,</p>
      <p>Click this link to log in to Elf Planner:</p>
      <p><a href="${magicUrl}">Log in to Elf Planner</a></p>
      <p>This link will expire in 15 minutes.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
