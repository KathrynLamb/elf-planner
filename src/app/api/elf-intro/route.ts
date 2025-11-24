// src/app/api/elf-intro/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// If you have a redis helper, keep this. Otherwise you can delete this line
import { redis } from '@/lib/redis';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type IntroTurnBody = {
  message?: string;
  transcript?: { from: 'elf' | 'parent'; text: string }[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as IntroTurnBody;
  const { message, transcript } = body;

  const transcriptText =
    transcript
      ?.map(
        (t) =>
          `${t.from === 'elf' ? 'Merry' : 'Parent'}: ${t.text.trim()}`
      )
      .join('\n') ?? '';

  const systemPrompt = `
You are Merry, a kind, slightly cheeky Elf-on-the-Shelf hotline host.
You are on a quick warm-up call with a very tired parent.

Goal:
- Have a very short, friendly back-and-forth (2–4 parent replies).
- Ask ONE focused question at a time.
- Gather enough info to write a single, warm "plan intro" paragraph describing the elf plan.
- The plan intro should mention: the parent's energy level, mess tolerance, schedule (weeknight vs weekend),
  what they dread, and what they'd love their child to remember.

Style:
- Sound like a real cosy phone call.
- 1–3 short sentences per reply.
- Never reference tokens, models, or JSON.
`;

  const userPrompt = `
Here is the conversation so far between you (Merry) and the parent:

${transcriptText || '(no previous messages yet)'}

Latest parent message (if any): ${message ?? '(none yet)'}

Now:
1) Decide if you have enough info to write the intro paragraph.
2) If you need more, ask ONE more gentle, concrete question.
3) If you have enough, do NOT ask more questions; instead say something like
   "Lovely, that gives me everything I need." in a short friendly way.

When you reply, return ONLY what Merry would say next to the parent.
Do not include stage directions or labels.
`;

  const chatRes = await openai.chat.completions.create({
    model: 'gpt-4.1-mini', // or your chosen model
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  const merryReply = chatRes.choices[0]?.message?.content?.trim() || '';

  const lower = merryReply.toLowerCase();
  const done =
    lower.includes('everything i need') ||
    lower.includes("that's everything i need") ||
    lower.includes('that’s everything i need');

  let introStatement: string | null = null;

  if (done) {
    const summaryRes = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `
  Based on this conversation between Merry and the parent:
  
  ${transcriptText}
  
  Write ONE friendly paragraph that previews what their UNIQUE 24-night Elf plan will feel like.
  
  The paragraph should:
  - be 3–5 sentences
  - sound warm, encouraging and a bit cheeky (Merry's voice, but as narration, not spoken dialogue)
  - clearly set expectations: mostly low-effort, low-mess setups that fit their energy, with any bigger or messier moments saved for times they said were okay (eg weekends)
  - mention their energy level, mess tolerance, weekday vs weekend vibe, and ONE emotional goal for the child (eg feeling loved, calm, excited, confident)
  - end with a line that hints: “next we’ll set up the basics and then Merry will conjure the full 24-night plan.”
  
  Do NOT include bullet points, headings or quotation marks – just a single paragraph.
  `,
        },
      ],
      temperature: 0.8,
    });
  
    introStatement = summaryRes.choices[0]?.message?.content?.trim() || null;
  
    // Optional Redis save
    if (introStatement && redis) {
      await redis.hset('elf:intro:last', {
        introStatement,
        updatedAt: Date.now().toString(),
      });
    }
  }
  

  return NextResponse.json({
    reply: merryReply,
    done,
    introStatement,
  });
}
