import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const fromEmail = process.env.REMINDER_FROM_EMAIL!;

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, sessionId } = (await req.json()) as {
      email?: string;
      sessionId?: string;
    };

    if (!email || !sessionId) {
      return NextResponse.json(
        { message: 'Missing email or session.' },
        { status: 400 },
      );
    }

    const data = await redis.get<{
      plan: string;
      childName?: string;
      startDate?: string;
      vibe?: string;
    }>(`elf:plan:${sessionId}`);

    if (!data || !data.plan) {
      return NextResponse.json(
        { message: 'Could not find your Elf plan. Please generate it again.' },
        { status: 404 },
      );
    }

    const childName = data.childName || 'your child';
    const startDate = data.startDate || '';
    const vibe = data.vibe || 'silly';
    const plan = data.plan;

    const subject = `Your Elf-on-the-Shelf plan for ${childName}`;

    const textBody = buildTextBody({ childName, startDate, vibe, plan });
    const htmlBody = buildHtmlBody({ childName, startDate, vibe, plan });

    const result = await resend.emails.send({
      from: `Elf Helper <${fromEmail}>`,
      to: email,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.log('Resend email-plan result:', result);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error emailing Elf plan:', err);
    return NextResponse.json(
      { message: err?.message || 'Error sending email.' },
      { status: 500 },
    );
  }
}

function buildTextBody({
  childName,
  startDate,
  vibe,
  plan,
}: {
  childName: string;
  startDate: string;
  vibe: string;
  plan: string;
}) {
  const parts = [
    `Here’s your full Elf-on-the-Shelf plan for ${childName}.`,
    startDate ? `Starting: ${startDate}` : '',
    `Elf vibe: ${vibe}`,
    'Each evening, set up the Elf as described below so your child wakes up to a little bit of magic.',
    '',
    plan,
    '',
    'Tip: tweak any ideas to fit your house, and skip nights if your Elf “forgets” to move. No guilt, just magic.',
    '',
    'Created with love at elfontheshelf.uk',
  ];

  return parts.filter(Boolean).join('\n');
}

// --- HTML email ---

function buildHtmlBody({
  childName,
  startDate,
  vibe,
  plan,
}: {
  childName: string;
  startDate: string;
  vibe: string;
  plan: string;
}) {
  // massage the plan into nice lines
  let formatted = plan.trim();
  formatted = formatted.replace(/Day\s+(\d+):/g, '\n\nDay $1:');
  formatted = formatted.replace(/Setup:/g, '\nSetup:');
  formatted = formatted.replace(/Elf note:/g, '\nElf note:');

  const lines = formatted
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let htmlPlan = '';

  for (const line of lines) {
    if (line.startsWith('Day ')) {
      htmlPlan += `<p style="margin:18px 0 4px;font-size:16px;font-weight:700;color:#e5e7eb;">
        ${escapeHtml(line)}
      </p>`;
    } else if (line.startsWith('Setup:')) {
      const body = line.replace(/^Setup:\s*/i, '');
      htmlPlan += `<p style="margin:2px 0 0;font-size:14px;color:#e5e7eb;">
        <strong>Setup:</strong> ${escapeHtml(body)}
      </p>`;
    } else if (line.startsWith('Elf note:')) {
      const body = line.replace(/^Elf note:\s*/i, '');
      htmlPlan += `<p style="margin:2px 0 10px;font-size:13px;color:#9ca3af;">
        <strong>Elf note:</strong> ${escapeHtml(body)}
      </p>`;
    } else {
      htmlPlan += `<p style="margin:4px 0;font-size:14px;color:#e5e7eb;">
        ${escapeHtml(line)}
      </p>`;
    }
  }

  const startLine = startDate
    ? `<p style="margin:0 0 4px;font-size:13px;color:#e5e7eb;">Starting: ${escapeHtml(
        startDate,
      )}</p>`
    : '';

  return `
  <div style="margin:0;padding:24px;background-color:#020617;">
    <div style="max-width:640px;margin:0 auto;background:#020617;border-radius:16px;border:1px solid #1f2937;padding:24px 24px 20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <p style="margin:0 0 6px;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.18em;">
        Elf on the Shelf Helper
      </p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f9fafb;">
        Your Elf-on-the-Shelf plan for ${escapeHtml(childName)}
      </h1>
      ${startLine}
      <p style="margin:0 0 10px;font-size:12px;color:#6ee7b7;">
        Elf vibe: ${escapeHtml(vibe)}
      </p>

      <p style="margin:0 0 14px;font-size:13px;color:#e5e7eb;">
        Each evening, set up the Elf as described below so your child wakes up to a little bit of magic.
      </p>

      <div style="margin-top:8px;border-radius:12px;background:#020617;">
        ${htmlPlan}
      </div>

      <p style="margin:18px 0 4px;font-size:11px;color:#9ca3af;">
        Tip: tweak any ideas to fit your house, and skip nights if your Elf “forgets” to move.
        No guilt, just magic.
      </p>

      <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">
        Created with love at <a href="https://elfontheshelf.uk" style="color:#a5b4fc;text-decoration:none;">elfontheshelf.uk</a>
      </p>
    </div>
  </div>
  `;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
