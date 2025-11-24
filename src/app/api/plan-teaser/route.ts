// src/app/api/plan-teaser/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      childName = 'your child',
      ageRange = '5',
      vibe = 'cheeky',
      biggestWorry = 'being too tired to keep up every night',
    } = body as {
      childName?: string;
      ageRange?: string;
      vibe?: 'cheeky' | 'calm' | 'kind' | string;
      biggestWorry?: string;
    };

    const system = `
You are Merry, a kind, slightly cheeky Elf-on-the-Shelf planner.
You write short teaser blurbs for a personalised 24-night Elf plan.

Goal:
- 1 short paragraph (3–5 sentences) previewing what this parent's unique Elf plan will feel like.
- It should sound magical and reassuring, but not over-the-top.
- Speak directly to the parent, in second person ("you", "your").
- Focus on how the plan will make their evenings easier AND special for their child.

Constraints:
- Mention that most nights are very low effort and low mess.
- Mention that a few bigger "event" nights are saved for weekends or days off.
- Include the child's name if given, otherwise say "your child".
- End with a gentle hint that they can unlock the full 24-night plan if they want more.
- No emojis, no exclamation marks.
`;

    const user = `
Parent details:
- Child name: ${childName}
- Age range or age: ${ageRange}
- Requested Elf vibe: ${vibe}
- Parent's biggest worry: ${biggestWorry}

Write a single paragraph teaser. Do NOT include headings or bullet points.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
    });

    const teaser =
      completion.choices[0]?.message?.content?.trim() ??
      'This December, your Elf plan will be calm, easy, and still full of tiny surprises.';

    return NextResponse.json({ teaser });
  } catch (err) {
    console.error('plan-teaser error', err);
    return NextResponse.json(
      {
        teaser:
          'This December, your Elf plan will be simple to pull off and still feel magical every night.',
      },
      { status: 200 },
    );
  }
}
