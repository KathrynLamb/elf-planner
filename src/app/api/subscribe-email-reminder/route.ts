import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { redis } from '@/lib/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, sessionId } = await req.json();

    if (!email || !sessionId) {
      return NextResponse.json(
        { message: 'Missing email or session.' },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { message: 'Payment not completed for this session.' },
        { status: 400 },
      );
    }

    const planData = await redis.get<{
      plan: string;
      startDate?: string;
      childName?: string;
    }>(`elf:plan:${sessionId}`);

    if (!planData || !planData.plan) {
      return NextResponse.json(
        { message: 'Could not find your Elf plan. Please generate it again.' },
        { status: 404 },
      );
    }

    await redis.set(`elf:email:${sessionId}`, {
      email,
      currentDay: 1,
      plan: planData.plan,
      childName: planData.childName || 'your child',
      startDate: planData.startDate || '',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { message: err.message || 'Error saving reminder.' },
      { status: 500 },
    );
  }
}
