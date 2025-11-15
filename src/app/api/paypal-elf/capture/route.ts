export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPayPalAccessToken, PAYPAL_BASE } from '@/lib/paypal';

type CaptureBody = {
  orderID: string;
};

export async function POST(req: Request) {
  try {
    const { orderID } = (await req.json()) as CaptureBody;

    if (!orderID) {
      return NextResponse.json(
        { message: 'Missing orderID' },
        { status: 400 },
      );
    }

    const token = await getPayPalAccessToken();

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const paypal = await res.json();

    if (!res.ok) {
      console.error('PayPal capture failed', paypal);
      return NextResponse.json(
        {
          message: paypal?.message || 'PayPal capture failed',
          details: paypal,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, paypal });
  } catch (err: any) {
    console.error('PayPal capture error', err);
    return NextResponse.json(
      { message: err?.message || 'Error capturing PayPal order.' },
      { status: 500 },
    );
  }
}
