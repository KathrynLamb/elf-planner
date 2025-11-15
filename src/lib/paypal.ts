const ENV =
  (process.env.PAYPAL_ENV ?? 'live').toLowerCase() === 'sandbox'
    ? 'sandbox'
    : 'live';

export const PAYPAL_BASE =
  ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const PAYPAL_CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
  '';

export const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || '';

export async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal is not configured (missing client id/secret).');
  }

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `PayPal auth failed: ${text || res.status + ' ' + res.statusText}`,
    );
  }

  const data = await res.json();
  return data.access_token as string;
}

export function getBaseUrl(reqUrl: string) {
  const url = new URL(reqUrl);
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    url.origin
  );
}
