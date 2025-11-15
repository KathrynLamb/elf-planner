// src/app/api/paypal-elf/capture/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const ENV =
  (process.env.PAYPAL_ENV ?? 'sandbox').toLowerCase() === 'live'
    ? 'live'
    : 'sandbox';

const BASE =
  ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
  '';
const CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET ||
  process.env.PAYPAL_SECRET ||
  '';

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`PayPal auth failed: ${r.status}`);
  const j = await r.json();
  return j.access_token as string;
}

type CaptureBody = {
  orderID: string;
};

export async function POST(req: Request) {
  try {
    const { orderID } = (await req.json()) as CaptureBody;

    if (!orderID) {
      return NextResponse.json({ error: 'Missing orderID' }, { status: 400 });
    }

    const token = await getAccessToken();
    const capRes = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const paypal = await capRes.json();
    if (!capRes.ok) {
      return NextResponse.json(
        { error: paypal?.message || 'PayPal capture failed', details: paypal },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, paypal });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
