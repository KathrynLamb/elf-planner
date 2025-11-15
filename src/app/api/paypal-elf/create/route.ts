// src/app/api/paypal-elf/create/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

const ENV =
  (process.env.PAYPAL_ENV ?? 'sandbox').toLowerCase() === 'live'
    ? 'live'
    : 'sandbox';

const BASE =
  ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

console.log('BASE', BASE);

const APPROVE_BASE =
  ENV === 'live'
    ? 'https://www.paypal.com/checkoutnow?token='
    : 'https://www.sandbox.paypal.com/checkoutnow?token=';

console.log('APPROVE_BASE', APPROVE_BASE);

const CLIENT_ID =
  process.env.PAYPAL_CLIENT_ID ||
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
  '';

console.log('CLIENT_ID', CLIENT_ID);

const CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || '';

console.log('CLIENT_SECRET', CLIENT_SECRET);

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing PayPal client ID or secret in env');
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  console.log('auth', auth);

  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  console.log('r', r);

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`PayPal auth failed: ${t || r.status}`);
  }

  const j = await r.json();
  return j.access_token as string;
}

type ElfVibe = 'silly' | 'kind' | 'calm';

type CreateBody = {
  sessionId: string;
  amount: number; // e.g. 9
  currency: 'GBP' | 'USD' | 'EUR';
  childName: string;
  ageRange: string;
  startDate: string;
  vibe: ElfVibe;
};

export async function POST(req: Request) {
  const reqUrl = new URL(req.url);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    reqUrl.origin;

  try {
    const body = (await req.json()) as CreateBody;

    const {
      sessionId,
      amount: rawAmount,
      currency: rawCurrency,
      childName,
      ageRange,
      startDate,
      vibe,
    } = body;

    console.log('sessionId', sessionId);
    const amount = Number(rawAmount);
    console.log('amount', amount);
    const currency = (rawCurrency || '').toUpperCase() as CreateBody['currency'];
    console.log('currency', currency);

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId' },
        { status: 400 },
      );
    }

    if (!childName || !startDate || !ageRange || !vibe) {
      return NextResponse.json(
        { message: 'Missing required elf details' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || !currency) {
      return NextResponse.json(
        { message: 'Missing or invalid amount/currency' },
        { status: 400 },
      );
    }

    const value = amount.toFixed(2);

    // 1) Store elf session details in Redis with a TTL (e.g. 7 days)
    await redis.set(
      `elf-session:${sessionId}`,
      {
        sessionId,
        childName,
        ageRange,
        startDate,
        vibe,
        amount,
        currency,
        createdAt: Date.now(),
      },
      {
        ex: 60 * 60 * 24 * 7, // 7 days
      },
    );

    const token = await getAccessToken();

    // Where PayPal sends people back after approve / cancel
    const returnUrl = `${baseUrl}/success?status=approved&provider=paypal&session_id=${encodeURIComponent(
      sessionId,
    )}`;
    const cancelUrl = `${baseUrl}/?status=cancelled&provider=paypal`;

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: sessionId,
          description: '30-day Elf-on-the-Shelf Plan',
          amount: {
            currency_code: currency,
            value,
            breakdown: {
              item_total: { currency_code: currency, value },
            },
          },
          items: [
            {
              name: '30-day Elf-on-the-Shelf Plan',
              quantity: '1',
              category: 'DIGITAL_GOODS',
              unit_amount: { currency_code: currency, value },
            },
          ],
        },
      ],
      application_context: {
        brand_name: 'Elf on the Shelf Helper',
        user_action: 'PAY_NOW' as const,
        landing_page: 'LOGIN' as const,
        shipping_preference: 'NO_SHIPPING' as const,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        locale: 'en-GB',
      },
    };

    const r = await fetch(`${BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const j = await r.json();
    if (!r.ok || !j?.id) {
      console.error('[paypal-elf/create] error creating order', r.status, j);
      return NextResponse.json(
        {
          message: j?.message || 'Unable to create PayPal order',
          details: j,
        },
        { status: 500 },
      );
    }

    const orderID = j.id as string;
    const approveUrl = `${APPROVE_BASE}${orderID}`;

    return NextResponse.json({ orderID, approveUrl });
  } catch (err: any) {
    console.error('[paypal-elf/create] exception', err);
    return NextResponse.json(
      { message: err.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
