// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, loginTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
// import your email sender

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ message: 'Missing email' }, { status: 400 });
  }

  // find or create user
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({ email }).returning();
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(loginTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const magicUrl = new URL(`/api/auth/callback?token=${token}`, process.env.NEXT_PUBLIC_BASE_URL);

  // send magicUrl.href via email

  return NextResponse.json({ ok: true });
}
