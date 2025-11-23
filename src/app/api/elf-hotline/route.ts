
// src/app/api/elf-hotline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getElfSession, patchElfSession } from '@/lib/elfStore';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type InferredProfile = {
  childName?: string;
  ageYears?: number | null;
  ageRange?: string;
  vibe?: 'silly' | 'kind' | 'calm';
  energyLevel?: 'exhausted' | 'normal-tired' | 'has-some-energy';
  messTolerance?: 'very-low' | 'low' | 'medium' | 'high';
};

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId' },
        { status: 400 },
      );
    }

    const stored = await getElfSession(sessionId);

    if (!stored) {
      return NextResponse.json(
        { message: 'Elf session not found.' },
        { status: 404 },
      );
    }

    const introTranscript = stored.introChatTranscript ?? [];
    const miniPreview = stored.miniPreview ?? '';
    const inferredProfile = (stored.inferredProfile ?? {}) as InferredProfile;
    const hotlineTranscript = stored.hotlineTranscript ?? [];

    // if you ever want to log this, you can still build it here:
    // const baseContext = {
    //   sessionId,
    //   childName: inferredProfile.childName ?? stored.childName ?? 'your child',
    //   ageYears: inferredProfile.ageYears ?? null,
    //   ageRange: inferredProfile.ageRange ?? stored.ageRange ?? '',
    //   vibe: inferredProfile.vibe ?? stored.vibe ?? 'silly',
    //   energyLevel: inferredProfile.energyLevel ?? 'normal-tired',
    //   messTolerance: inferredProfile.messTolerance ?? 'low',
    //   introTranscript,
    //   miniPreview,
    //   hotlineTranscript,
    // };

    const systemPrompt = `
    You are Merry, a warm, gently funny "Elf hotline" guide helping a tired parent
    design an Elf-on-the-Shelf season that actually fits their kids and energy.
    
    You have three jobs:
    
    1) READ BETWEEN THE LINES  
       - Infer what these kids are like from the chats and mini preview: temperament,
         confidence, sensitivities, sense of humour, sibling dynamics.
       - Infer what the parent is craving: low-effort? new ideas? more connection?
         reassurance? less chaos?
       - Talk about these in natural language, like a smart, kind human would:
         "It sounds like Barry is the big ideas kid who loves X..." etc.
    
    2) REASSURE & ORIENT THE PARENT  
       - Congratulate them on buying their plan and choosing something that saves
         future-them from a lot of midnight panic.
       - Briefly explain what will happen next: a tiny back-and-forth here, then a
         30-morning plan tuned to their kid(s) and their energy/mess tolerance.
       - Keep everything cosy, encouraging and non-judgemental.
    
    3) ASK ONE CLEAR, SMALL QUESTION AT A TIME  
       - Each reply should end with exactly ONE concrete question to move the
         conversation forward (or say you’re done and you have enough).
       - Use normal conversational language, not survey speak.
    
    STYLE & LENGTH:
    - Voice: cosy, light, emotionally intelligent, never snarky.
    - No IP references: do NOT name specific films, franchises, characters or brands.
    - Always keep the whole reply under ~130 words.
    - Split the reply into 2–3 short paragraphs separated by blank lines:
      • Paragraph 1: warm greeting + 1–2 key observations about this family
      • Paragraph 2: 1–2 sentences on what will happen next (hotline + plan)
      • Paragraph 3: ONE short question that starts with "Quick question:"
    - Do NOT list every detail you know; pick the 2–3 most important things.
    - You are on the parent's side. No guilt, no threats, no spying language.
    `.trim();
    
    const history: { role: 'user' | 'assistant'; content: string }[] = [];

    if (introTranscript.length > 0) {
      history.push({
        role: 'user',
        content:
          'Here is the earlier mini chat between the parent and you as Merry. Use it only as context, do not repeat it word-for-word:\n' +
          JSON.stringify(introTranscript, null, 2),
      });
    }

    if (miniPreview) {
      history.push({
        role: 'user',
        content:
          'Here is the short mini preview of Elf mornings you already generated. Use it as context for what they liked, but do not repeat it:\n' +
          miniPreview,
      });
    }

    if (hotlineTranscript.length > 0) {
      history.push({
        role: 'user',
        content:
          'Here is the transcript of our Elf hotline chat so far (for context):\n' +
          JSON.stringify(hotlineTranscript, null, 2),
      });
    }

    let userPrompt: string;
    let isFirstHotlineTurn = false;

    if (!message) {
      isFirstHotlineTurn = true;
      userPrompt = `
The parent has just completed checkout and landed on the success page.

Based on ALL the context above (intro chat, mini preview, inferred profile),
please:

1) Greet them warmly and congratulate them on getting their Elf plan.
2) Reflect back what you’ve understood so far about:
   - their kid(s) (age, personality, what they’re drawn to),
   - the kind of Elf season they’re asking for (e.g. cosy, silly, low-mess,
     confidence-boosting, sibling-friendly, etc),
   - anything they seem worried or tired about.
3) Explain very briefly what will happen in this hotline chat and then with
   their 30-morning plan.
4) Ask ONE simple next question to refine the plan (for example,
   "When you picture your favourite Elf mornings this December, what do you
    want your kid(s) to feel?").

Do NOT describe a specific Elf setup yet.
      `.trim();
    } else {
      userPrompt = `
The parent just replied in the Elf hotline chat.

Parent's latest message:
"${message}"

Please:
1) Acknowledge what they said and continue reflecting their goals/constraints.
2) Add 1–2 short, concrete ideas or directions you’re considering ("this sounds like
   we want mostly 5-minute set-ups with gentle silliness", etc), without detailing
   specific nightly scenes.
3) End with ONE clear next question, or say you have all you need and are ready
   to brew their full plan.

Keep it brief (2–3 short paragraphs) and cosy.
      `.trim();
    }

    // Use the Responses API in "text" mode and cast around broken typings.
    const response = await (client.responses.create as any)({
      model: 'gpt-5-mini',
      text: {
        // simple text output (no schema needed here)
        format: {
          type: 'text',
        },
      },
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        ...history.map((h) => ({
          role: h.role,
          content: [{ type: 'input_text', text: h.content }],
        })),
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }],
        },
      ] as any,
    });

    const reply: string = (response as any).output_text ?? '';


    const newTurn: any = isFirstHotlineTurn
      ? { type: 'welcome', reply }
      : { type: 'turn', message, reply };

    await patchElfSession(sessionId, {
      hotlineTranscript: [...hotlineTranscript, newTurn],
    });

    const done =
      /i have everything i need|i’ve got everything i need|ready to brew your plan/i.test(
        reply,
      );

    return NextResponse.json({ reply, done });
  } catch (err: any) {
    console.error('[elf-hotline] error', err);
    return NextResponse.json(
      {
        message:
          err?.message || 'Something went wrong with the Elf hotline.',
      },
      { status: 500 },
    );
  }
}
