// import { NextRequest, NextResponse } from 'next/server';
// import OpenAI from 'openai';
// import { redis } from '@/lib/redis';
// // import { patchElfSession } from '@/lib/elfStore';
// import { patchElfSession } from '@/lib/elfStore';

// export const runtime = 'nodejs';

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// type HotlineProfile = {
//   ageYears: number | null;
//   siblings: string[];
//   pets: string[];
//   interests: string[];
//   energyLevel: 'exhausted' | 'normal-tired' | 'has-some-energy';
//   messTolerance: 'very-low' | 'low' | 'medium' | 'high';
//   bannedProps: string[];
//   availableProps: string[];
//   notesForElf: string;
// };

// type HotlineState = {
//   profile: HotlineProfile;
// };

// const EMPTY_PROFILE: HotlineProfile = {
//   ageYears: null,
//   siblings: [],
//   pets: [],
//   interests: [],
//   energyLevel: 'normal-tired',
//   messTolerance: 'low',
//   bannedProps: [],
//   availableProps: [],
//   notesForElf: '',
// };

// function isEmptyProfile(p: HotlineProfile): boolean {
//   return (
//     p.ageYears === null &&
//     p.siblings.length === 0 &&
//     p.pets.length === 0 &&
//     p.interests.length === 0 &&
//     p.notesForElf.trim() === ''
//   );
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { sessionId, message } = (await req.json()) as {
//       sessionId?: string;
//       message?: string;
//     };

//     if (!sessionId) {
//       return NextResponse.json(
//         { message: 'Missing sessionId.' },
//         { status: 400 },
//       );
//     }

//     // ---- Load basic session from Redis ----
//     const baseSession = await redis.get<{
//       childName: string;
//       ageRange: string;
//       startDate: string;
//       vibe: 'silly' | 'kind' | 'calm';
//     }>(`elf-session:${sessionId}`);

//     const childName = baseSession?.childName ?? 'your child';
//     const ageRange = baseSession?.ageRange ?? '4–6 years';
//     const vibe = baseSession?.vibe ?? 'silly';

//     // ---- Load hotline profile (if any) ----
//     const existingState =
//       (await redis.get<HotlineState>(`elf:hotline:${sessionId}`)) ?? {
//         profile: EMPTY_PROFILE,
//       };

//     const previousProfile = existingState.profile;
//     const firstTurn = !message && isEmptyProfile(previousProfile);

//     // ---- System prompt ----
//     const systemPrompt = `
// You are "Merry", a calm, funny, low-mess Elf-on-the-Shelf planner talking to a tired but loving parent over a cosy "Elf hotline" phone call.

// OVERALL GOAL
// - Have a SHORT, friendly back-and-forth with the parent.
// - Gently collect just enough information to make a 30-MORNING Elf-on-the-Shelf plan that feels ridiculously personal.
// - DO NOT design or list specific Elf scenes or multi-night plans during this call.
//   - You may give a short teaser like "I’m already picturing some silly K-pop hijinks for the weekends", but no detailed setups.

// TIMING CLARIFICATION
// - Parents set up the Elf SCENE at NIGHT, after the child is asleep.
// - The child discovers the scene in the MORNING.
// - Any "activities" you are implicitly planning happen when the child wakes up or later that day, NOT at bedtime.
// - Avoid wording that suggests the child is doing crafts or games at bedtime; bedtime is just quick setup time for the parent.

// CONTEXT YOU ALREADY KNOW
// - Child name: "${childName}"
// - Child age range: "${ageRange}"
// - Elf vibe: "${vibe}"

// You are also given:
// - "lastMessage": the parent's latest text (or null on the very first turn).
// - "previousProfile": the best-known profile of the child/family so far.
// - "isFirstTurn": whether this is the first hotline turn.

// CONVERSATION STYLE
// - Speak ONLY to the parent, not the child.
// - Warm, kind, lightly funny. Assume they're knackered.
// - 1–3 short spoken sentences per reply, like a real phone call.
// - Ask EXACTLY ONE clear, focused question per turn.
// - Make it easy to answer in one sentence or a quick list.

// FIRST TURN BEHAVIOUR (isFirstTurn === true)
// - Briefly greet them and confirm child name and elf vibe.
// - Then immediately ask your first real question (e.g. favourite shows/games/toys/hobbies right now).
// - Keep it short; no long speeches and no plan ideas.

// LATER TURNS (isFirstTurn === false)
// - Do NOT reintroduce yourself.
// - Do NOT ask again whether this is for their child or which vibe they want.
// - Refer naturally to what they already told you using phrases like "From what you said about K-pop and demon hunters..." if helpful.
// - If previousProfile already has clear info for a topic, don’t ask about it again unless the last message changed it.

// WHAT YOU SHOULD TRY TO LEARN (OVER SEVERAL TURNS)
// Ask only what you need, one thing at a time:
// - Child basics: what they’re into right now (shows, games, toys, hobbies).
// - Family shape: siblings, pets, important grown-ups.
// - December reality: how busy evenings are, how rushed mornings are, any regularly hectic days.
// - Parent capacity: realistic setup time on school nights vs weekends; energy level (exhausted / normal-tired / has-some-energy).
// - Mess tolerance: very-low / low / medium / high; and absolute NOs (glitter, food mess, "spying"/naughty-list guilt, scary themes, etc.).
// - Available props: simple things they actually have (toys, books, craft bits, fairy lights, blankets, printer/no printer, etc.).
// - Big dates: birthdays, visits, school shows, cultural or religious holidays, trips.
// - Feelings & sensitivities: worries (school, monsters, sleep, friendships, big changes), sensory sensitivities, things that really delight or overwhelm the child.

// PROFILE / DATA RULES
// - Update the "profile" object based on BOTH:
//   - previousProfile, and
//   - any new details in lastMessage.
// - Never invent specific details; if something is unknown, keep existing values.
// - "notesForElf" should be a concise summary in friendly note form for a future planning model (1–3 sentences, no bullet list).

// WHEN TO SET done = true
// - Set "done" to true ONLY when you are confident you know enough to strongly personalise 30 mornings of Elf scenes and notes.
// - When done, end with a cosy closing line like:
//   "Perfect – I’ve got everything I need to plan your Elf month now, thank you. 💚"

// OUTPUT FORMAT
// - You MUST output valid JSON only, matching the provided schema.
// - "reply" = what Merry says out loud on this turn (spoken style).
// - "profile" = the updated profile after this turn.
// - "done" = whether you now have enough information.
// `.trim();

//     // ---- Call Responses API ----
//     const response = await client.responses.create({
//       model: 'gpt-5-mini',
//       text: {
//         format: {
//           type: 'json_schema',
//           name: 'elf_hotline_turn',
//           strict: true,
//           schema: {
//             type: 'object',
//             required: ['reply', 'profile', 'done'],
//             additionalProperties: false,
//             properties: {
//               reply: {
//                 type: 'string',
//                 description:
//                   'What Merry says out loud this turn. Warm, spoken, 1–3 short sentences, first person.',
//               },
//               done: {
//                 type: 'boolean',
//                 description:
//                   'True when there is enough info to make a strongly personalised 30-morning Elf plan.',
//               },
//               profile: {
//                 type: 'object',
//                 required: [
//                   'ageYears',
//                   'siblings',
//                   'pets',
//                   'interests',
//                   'energyLevel',
//                   'messTolerance',
//                   'bannedProps',
//                   'availableProps',
//                   'notesForElf',
//                 ],
//                 additionalProperties: false,
//                 properties: {
//                   ageYears: {
//                     type: ['integer', 'null'],
//                     description:
//                       'Best-guess age in years, inferred from age range and conversation.',
//                   },
//                   siblings: {
//                     type: 'array',
//                     items: { type: 'string' },
//                   },
//                   pets: {
//                     type: 'array',
//                     items: { type: 'string' },
//                   },
//                   interests: {
//                     type: 'array',
//                     items: { type: 'string' },
//                   },
//                   energyLevel: {
//                     type: 'string',
//                     enum: ['exhausted', 'normal-tired', 'has-some-energy'],
//                   },
//                   messTolerance: {
//                     type: 'string',
//                     enum: ['very-low', 'low', 'medium', 'high'],
//                   },
//                   bannedProps: {
//                     type: 'array',
//                     items: { type: 'string' },
//                   },
//                   availableProps: {
//                     type: 'array',
//                     items: { type: 'string' },
//                   },
//                   notesForElf: {
//                     type: 'string',
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//       input: [
//         {
//           role: 'system',
//           content: [
//             {
//               type: 'input_text',
//               text: systemPrompt,
//             },
//           ],
//         },
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'input_text',
//               text: JSON.stringify(
//                 {
//                   lastMessage: message ?? null,
//                   previousProfile,
//                   isFirstTurn: firstTurn,
//                 },
//                 null,
//                 2,
//               ),
//             },
//           ],
//         },
//       ],
//     });

//     const rawText = (response as any).output_text as string | undefined;
//     if (!rawText) {
//       throw new Error('Empty response from model');
//     }

//     const parsed = JSON.parse(rawText) as {
//       reply: string;
//       done: boolean;
//       profile: HotlineProfile;
//     };

//     // Save latest profile for next turn
//     await redis.set<HotlineState>(`elf:hotline:${sessionId}`, {
//       profile: parsed.profile,
//     });

//     // Keep basic session in sync (unchanged behaviour)
//     await patchElfSession(sessionId, {
//       childName,
//       ageRange,
//       vibe,
//     });

//     return NextResponse.json({
//       reply: parsed.reply,
//       done: parsed.done,
//     });
//   } catch (err: any) {
//     console.error('[elf-hotline] error', err);
//     return NextResponse.json(
//       {
//         message:
//           err?.message || 'Something went wrong talking to the Elf hotline.',
//       },
//       { status: 500 },
//     );
//   }
// }

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
     conversation forward (or say they’re done and you have enough).  
   - Use normal conversational language, not survey speak.

STYLE:
- Voice: cosy, light, emotionally intelligent, never snarky.
- No IP references: do NOT name specific films, franchises, characters or brands.
  You can talk in vibes ("classic slapstick winter hijinks" instead of naming a film).
- Length: usually 2–4 short paragraphs.
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
