import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import OpenAI from 'openai';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;


const openai = openaiApiKey
  ? new OpenAI({ apiKey: openaiApiKey })
  : null;

export async function POST(req: Request) {
  try {
    if (!stripe || !stripeSecretKey) {
      return NextResponse.json(
        { message: 'Stripe is not configured.' },
        { status: 500 },
      );
    }

    if (!openai || !openaiApiKey) {
      return NextResponse.json(
        { message: 'OpenAI is not configured.' },
        { status: 500 },
      );
    }

    const { sessionId } = (await req.json()) as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing Stripe session ID.' },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const metadata = session.metadata || {};
    const childName = metadata.childName || 'your child';
    const ageRange = metadata.ageRange || '4-6';
    const startDate = metadata.startDate || '1st December';
    const vibe = metadata.vibe || 'silly';

    const userPrompt = `
Write a practical, fun 30-day Elf-on-the-Shelf plan for a busy parent.

Details:
- Child name: ${childName}
- Age range: ${ageRange}
- Start date: ${startDate}
- Overall Elf vibe: ${vibe}

Requirements:
- Exactly 30 entries, one per day.
- For each day, give:
  - "Day X:"
  - A short title for the setup.
  - A clear, simple explanation of what the parent needs to do that night (use items most homes have).
  - A 1–2 sentence note from the Elf to ${childName}, written in a warm, playful tone.
- Keep everything family-friendly, no scares, no mess they can't easily clean.
- Assume the parent is tired and time-poor. Prioritise easy setups, with a few slightly special ones spread through the month.
- Output as plain text in this structure:

Day 1: [title]
Setup: ...
Elf note: ...

Day 2: [title]
Setup: ...
Elf note: ...

(and so on up to Day 30)
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly helper who writes simple, low-effort Elf-on-the-Shelf plans for overwhelmed parents.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.9,
    });

    const plan =
      completion.choices[0]?.message?.content?.toString().trim() ||
      'Sorry, I could not generate a plan.';

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error('Error generating Elf plan:', error);
    return NextResponse.json(
      {
        message:
          error?.message || 'Something went wrong generating your Elf plan.',
      },
      { status: 500 },
    );
  }
}
