// src/lib/notifyAdmin.ts
const WEBHOOK_URL = process.env.ADMIN_WEBHOOK_URL; // Slack / Discord incoming webhook

export async function notifyAdminMagicLink(email: string) {
  if (!WEBHOOK_URL) {
    console.warn('[notifyAdmin] ADMIN_WEBHOOK_URL not set, skipping');
    return;
  }

  const text = `🎄 New magic link requested\n• Email: ${email}\n• When: ${new Date().toISOString()}`;

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error('[notifyAdmin] failed to send webhook', err);
  }
}
