// src/app/api/auth/send-magic-link/route.ts
import { NextResponse } from 'next/server';
// import { db } from '@/lib/db';
import { users, loginTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import crypto from 'crypto';
import { db } from '@/db';

export async function POST(req: Request) {
  try {
    const { email, sessionId } = await req.json();
    if (!email || !sessionId)
      return NextResponse.json({ message: 'Missing email/sessionId' }, { status: 400 });

    const resend = new Resend(process.env.RESEND_API_KEY!);

    // find or create user
    let [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      const inserted = await db
        .insert(users)
        .values({ email })
        .returning();
      user = inserted[0];
    }

    // create login token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await db.insert(loginTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const local = "http://localhost:3000"

    // const magicUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify?token=${token}&session_id=${sessionId}`;
    const magicUrl = `${local}/api/verify?token=${token}&session_id=${sessionId}`;

    await resend.emails.send({
      from: 'Merry the Elf <merry@elfontheshelf.uk>',
      to: email,
      subject: 'Your Magic Link',
      html: `
        <p>Click your one-time link:</p>
        <p><a href="${magicUrl}">Sign In & View Your Full Elf Plan</a></p>
        <p>This link expires in 30 minutes.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {

    console.error('[send-magic-link] ERROR', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
  
}

