// // src/lib/auth.ts
// import { getServerSession, type NextAuthOptions } from 'next-auth';
// import EmailProvider from 'next-auth/providers/email';
// import { Redis } from '@upstash/redis';
// import { UpstashRedisAdapter } from '@auth/upstash-redis-adapter';
// import { Resend } from 'resend';

// const redis = Redis.fromEnv();
// const resend = new Resend(process.env.RESEND_API_KEY!);

// const FROM_EMAIL =
//   process.env.EMAIL_FROM || 'Merry the Elf <merry@yourdomain.com>';

// export const authConfig: NextAuthOptions = {
//   adapter: UpstashRedisAdapter(redis),
//   secret: process.env.AUTH_SECRET,
//   providers: [
//     EmailProvider({
//       from: FROM_EMAIL,
//       async sendVerificationRequest({ identifier, url, provider }) {
//         const to = identifier;
//         const from = provider.from ?? FROM_EMAIL;

//         await resend.emails.send({
//           from,
//           to,
//           subject: 'Sign in to Elf Planner',
//           html: `
//             <p>Hi there 👋</p>
//             <p>Tap the magic link below to sign in to Elf Planner:</p>
//             <p><a href="${url}">Sign in to Elf Planner</a></p>
//             <p>This link will expire shortly. If you didn’t request it, you can safely ignore this email.</p>
//           `,
//           text: `Hi there 👋

// Use this link to sign in to Elf Planner:
// ${url}

// If you didn’t request this, you can ignore this email.`,
//         });
//       },
//     }),
//   ],
//   session: {
//     strategy: 'database',
//   },
//   // trustHost is not a valid property on NextAuthOptions in your version,
//   // so we simply omit it.
// };

// // 🔹 Helper you can use in any server context
// export function getCurrentSession() {
//   return getServerSession(authConfig);
// }

// src/lib/elfEmail.ts

export function buildElfEmailHtml(args: {
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
      (day.weekday && day.date)
        ? `${day.weekday} · ${day.title}`
        : day.title;
  
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
  