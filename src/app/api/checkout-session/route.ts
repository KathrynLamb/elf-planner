import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function POST(req: Request) {
  try {
    if (!stripe || !stripeSecretKey || !stripePriceId || !baseUrl) {
      return NextResponse.json(
        { message: 'Stripe is not configured properly.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { childName, ageRange, startDate, vibe } = body as {
      childName?: string;
      ageRange?: string;
      startDate?: string;
      vibe?: string;
    };

    if (!childName || !startDate) {
      return NextResponse.json(
        {
          message:
            'Missing required fields. Please include childName and startDate.',
        },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
      metadata: {
        childName,
        ageRange: ageRange || '',
        startDate,
        vibe: vibe || '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        message:
          error?.message || 'Something went wrong creating the checkout session.',
      },
      { status: 500 }
    );
  }
}
