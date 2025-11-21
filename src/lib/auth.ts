// src/lib/auth.ts
import { Redis } from '@upstash/redis';
import { UpstashRedisAdapter } from '@auth/upstash-redis-adapter';
import { Resend } from 'resend';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY!);

export const authOptions: NextAuthOptions = {
  adapter: UpstashRedisAdapter(redis),

  session: {
    strategy: 'jwt',
  },

  providers: [
    EmailProvider({
      // This is your "magic link" mailer using Resend
      async sendVerificationRequest({ identifier, url }) {
        await resend.emails.send({
          from: 'Merry the Elf <merry@elfontheshelf.uk>',
          to: identifier,
          subject: 'Sign in to Elf Planner',
          html: `
            <p>Hi there 👋</p>
            <p>Click the magic link below to sign in to Elf Planner:</p>
            <p><a href="${url}">Sign in to Elf Planner</a></p>
            <p>This link expires soon. If you didn’t request it, you can ignore this email.</p>
          `,
        });
      },
    }),
  ],

  pages: {
    signIn: '/login', // we'll add this page with a simple "enter email" form
  },

  callbacks: {
    async session({ session, token }) {
      // expose user id on session.user.id for convenience
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// server helper used by layouts / server components
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return {
    id: (session.user as any).id ?? session.user.email,
    email: session.user.email,
  };
}
