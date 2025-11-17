// src/lib/auth.ts
import { getServerSession, type NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { Redis } from '@upstash/redis';
import { UpstashRedisAdapter } from '@auth/upstash-redis-adapter';
import { Resend } from 'resend';

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL =
  process.env.EMAIL_FROM || 'Merry the Elf <merry@yourdomain.com>';

export const authConfig: NextAuthOptions = {
  adapter: UpstashRedisAdapter(redis),
  secret: process.env.AUTH_SECRET,
  providers: [
    EmailProvider({
      from: FROM_EMAIL,
      async sendVerificationRequest({ identifier, url, provider }) {
        const to = identifier;
        const from = provider.from ?? FROM_EMAIL;

        await resend.emails.send({
          from,
          to,
          subject: 'Sign in to Elf Planner',
          html: `
            <p>Hi there 👋</p>
            <p>Tap the magic link below to sign in to Elf Planner:</p>
            <p><a href="${url}">Sign in to Elf Planner</a></p>
            <p>This link will expire shortly. If you didn’t request it, you can safely ignore this email.</p>
          `,
          text: `Hi there 👋

Use this link to sign in to Elf Planner:
${url}

If you didn’t request this, you can ignore this email.`,
        });
      },
    }),
  ],
  session: {
    strategy: 'database',
  },
  // trustHost is not a valid property on NextAuthOptions in your version,
  // so we simply omit it.
};

// 🔹 Helper you can use in any server context
export function getCurrentSession() {
  return getServerSession(authConfig);
}
