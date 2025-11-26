// src/app/api/elf-mini-chat/route.ts
import {
  ElfVibe,
  InferredElfProfile,
  getElfSession,
  patchElfSession,
} from '@/lib/elfStore';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type MiniChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const { sessionId, messages } = (await req.json()) as {
      sessionId?: string;
      messages?: MiniChatMessage[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { message: 'Missing messages array.' },
        { status: 400 },
      );
    }

    const baseSession = sessionId ? await getElfSession(sessionId) : null;

    let childName = baseSession?.childName ?? 'your child';
    let ageRange = baseSession?.ageRange ?? '4–6 years';
    let vibe: ElfVibe = (baseSession?.vibe as ElfVibe) ?? 'silly';

    const existingProfile = baseSession?.inferredProfile ?? null;

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_mini_chat_preview_and_profile',
          strict: true,
          schema: {
            type: 'object',
            required: ['reply', 'profile', 'done'],
            properties: {
              reply: {
                type: 'string',
                description:
                  'Merry’s short, cosy reply for this turn (2–6 sentences).',
              },
              done: {
                type: 'boolean',
                description:
                  'true only when Merry has enough info to brew the full 24-morning plan.',
              },
              profile: {
                type: 'object',
                description:
                  'Best-guess profile of the child, parent energy, humour tolerance, and practical constraints, based on the whole conversation so far.',
                // STRICT MODE: must list *all* keys in `required`
                required: [
                  'childName',
                  'ageYears',
                  'ageRange',
                  'vibe',
                  'siblings',
                  'pets',
                  'interests',
                  'energyLevel',
                  'messTolerance',
                  'humourTone',
                  'bannedProps',
                  'availableProps',
                  'notesForElf',
                ],
                properties: {
                  childName: { type: 'string' },
                  ageYears: { type: 'integer' },
                  ageRange: { type: 'string' },
                  vibe: {
                    type: 'string',
                    enum: ['silly', 'kind', 'calm'],
                  },
                  siblings: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  pets: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  interests: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  energyLevel: {
                    type: 'string',
                    enum: ['exhausted', 'normal-tired', 'has-some-energy'],
                  },
                  messTolerance: {
                    type: 'string',
                    enum: ['very-low', 'low', 'medium', 'high'],
                  },
                  humourTone: {
                    type: 'string',
                    enum: ['clean-only', 'silly-toilet-ok', 'anything-goes'],
                  },
                  bannedProps: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  availableProps: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  notesForElf: {
                    type: 'string',
                    description:
                      'Any extra notes/constraints/preferences the parent has mentioned, in Merry-friendly wording.',
                  },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
        },
      },
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: `
You are Merry, a warm, gently funny Elf-on-the-Shelf planner chatting with a
parent on the homepage *before* they buy their 24-morning plan.

GOAL FOR THE FLOW
- Keep the back-and-forth SHORT and high value.
- Prioritise the most important questions, then make gentle, explicit guesses
  for the rest and ask the parent to correct you.
- Aim to be genuinely ready to brew the plan in about 3–4 parent replies.

HIGHEST-PRIORITY THINGS TO LEARN (must be asked directly)
1) Child basics:
   - Age or age range.
   - Name (if they share it) or how to refer to them.
2) Emotional goal for mornings:
   - e.g. calm & cosy, silly & high-energy, magical but low-pressure,
     confidence-boosting, exciting / show-offy.
3) Interests:
   - 1–3 things they’re really into (e.g. dinosaurs, Lego, drawing, sport).
4) Elf history:
   - Ask early on:
     • If they already have an elf:
         - elf’s name,
         - personality,
         - usual kinds of setups (big messy scrapes, calm cosy notes,
           quick silly scenes, or a mix).
     • If they are brand new:
         - ask if they’d like help choosing a name and personality vibe.
5) Humour boundaries:
   - Whether they’re happy with silly toilet/gross jokes or want everything
     clean-only.
   - You MUST ask this explicitly at some point.

SECONDARY THINGS TO LEARN (you can mostly guess, then check)
- Evening energy: exhausted / normal-tired / has-some-energy.
- Mess tolerance: very-low / low / medium / high.
- Setup style: mostly quick; mostly big; or a mix.
- Available props: a couple of easy things at home.
- Hard NOs / banned props.

You may make reasonable, gentle guesses about these secondary items,
but you must present them as guesses and ask for correction, for example:
- "I’m guessing you’re somewhere around normal-tired with medium mess
   tolerance — does that sound right, or would you say more or less?"

CONVERSATION SHAPE (IMPORTANT)

1) START (Turn 0)
   - Friendly greeting + a single open prompt like:
     "Tell me about your kiddo(s) and what kind of elf experience you’re
      hoping for this December."
   - Do NOT mention price yet.

2) 2–3 SHORT FOLLOW-UPS
   - Each reply should:
     • briefly reflect what you understood, and
     • ask about two high-priority bits where possible in one question.
   - Examples:
     • Age + morning-feeling in one go.
     • Interests + elf-history in one go.
   - Avoid repeating stock phrases like "Quick question:" and "I’ve noted".
     Use natural variety: "I’m curious…", "One more thing…", "Before I plan…".

3) SUMMARY & CHECK TURN (the key step)
   - Once you know:
       • age,
       • morning emotional goal,
       • interests,
       • elf history (existing vs new; name & personality, or that they want help),
     then:
       a) Give a SHORT 2–3 sentence summary of the picture you have, including
          your guesses for energy, mess tolerance, humour tone, setup style
          and props.
       b) End with ONE correction question that invites tweaks, e.g.:
          "Here’s how I’m picturing things: … I’m guessing you’re somewhere
           around normal-tired with medium mess and happy with the odd silly
           toilet joke — does that sound right, or would you tweak anything
           about energy, mess or humour?"

   - After the parent’s correction/confirmation of this summary, you should
     normally have enough to set done: true.

4) READY-TO-BREW TURN
   - When the checklist below is satisfied and the parent has corrected/confirmed
     your summary, set "done": true and:
       • give a short final recap (1–2 sentences, no long lists),
       • describe the type of 24-morning plan you’ll create (NOT all 24 nights),
       • give ONE tiny sample night idea (max 2 sentences, no specific IPs),
       • hand off to the product flow (the frontend will handle payment/email).

CHECKLIST FOR done:true  (all must be covered, even if some are based on guesses
the parent has confirmed or corrected):
  1. Age/ageRange.
  2. Morning emotional goal.
  3. At least one interest.
  4. Elf history: existing elf name + personality & usual setups, OR clearly
     brand new plus whether they want help with name/personality.
  5. HumourTone, based on an explicit question or a summary they confirmed.
  6. Energy level.
  7. Mess tolerance.
  8. At least a couple of props you can rely on OR that they said "we have everything".
  9. Any known hard NOs / banned props (or they’ve clearly said there are none).

If ANY of these are missing or unconfirmed, you MUST keep "done": false and ask
ONE more focused question that covers what’s missing.

STYLE RULES
- Voice: cosy, light, emotionally intelligent, never snarky.
- Max ~120 words per reply.
- 2–3 short paragraphs with a blank line between.
- No survey-speak; talk like a switched-on, kind friend.
- Avoid repeating "Quick question" and "I’ve noted"; those phrases should be rare.
- Never ask more than ONE question per reply.

PREVIEW BEHAVIOUR
- You may give tiny flashes of the sort of things you’re thinking
  ("spy-puzzle moments", "tiny craft missions") as flavour, but:
    • don’t describe more than one sample night before done:true,
    • don’t dump long bulleted lists.

PROFILE MERGE CONTEXT (for the model, not to repeat to the parent):

Existing stored profile for this session (may be empty/partial):
${existingProfile ? JSON.stringify(existingProfile, null, 2) : '(none yet)'}

Known top-level session fields:
- Child name (may be generic): ${childName}
- Age range (may be generic): ${ageRange}
- Elf vibe (may be generic): ${vibe}

Conversation so far:
${JSON.stringify(messages, null, 2)}

Return JSON that matches the schema exactly.
            `.trim(),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(
                {
                  conversation: messages,
                  lastMessage: messages[messages.length - 1],
                },
                null,
                2,
              ),
            },
          ],
        },
      ],
    });

    const rawText = response.output_text;
    if (!rawText) {
      throw new Error('Empty response from model');
    }

    const parsed = JSON.parse(rawText) as {
      reply: string;
      done?: boolean;
      profile?: Partial<InferredElfProfile> & {
        childName?: string | null;
        ageYears?: number | null;
        ageRange?: string | null;
        vibe?: ElfVibe | null;
        humourTone?: 'clean-only' | 'silly-toilet-ok' | 'anything-goes' | null;
      };
    };

    const p = parsed.profile ?? {};

    const mergedProfile: InferredElfProfile = {
      childName: p.childName ?? existingProfile?.childName ?? childName ?? null,
      ageYears:
        typeof p.ageYears === 'number'
          ? p.ageYears
          : existingProfile?.ageYears ?? null,
      ageRange: p.ageRange ?? existingProfile?.ageRange ?? ageRange ?? null,
      vibe: p.vibe ?? existingProfile?.vibe ?? vibe ?? null,

      siblings: p.siblings ?? existingProfile?.siblings ?? [],
      pets: p.pets ?? existingProfile?.pets ?? [],
      interests: p.interests ?? existingProfile?.interests ?? [],

      energyLevel:
        p.energyLevel ?? existingProfile?.energyLevel ?? 'normal-tired',
      messTolerance:
        p.messTolerance ?? existingProfile?.messTolerance ?? 'low',

      humourTone:
        (p as any).humourTone ??
        (existingProfile as any)?.humourTone ??
        'clean-only',

      bannedProps: p.bannedProps ?? existingProfile?.bannedProps ?? [],
      availableProps:
        p.availableProps ?? existingProfile?.availableProps ?? [],

      notesForElf: p.notesForElf ?? existingProfile?.notesForElf ?? '',
    };

    // Update top-level fields from merged profile
    childName = mergedProfile.childName ?? childName;
    ageRange = mergedProfile.ageRange ?? ageRange;
    vibe = mergedProfile.vibe ?? vibe;

    if (sessionId) {
      const introTranscript = [
        ...(baseSession?.introChatTranscript ?? []),
        {
          at: Date.now(),
          messages,
          reply: parsed.reply,
        },
      ];

      await patchElfSession(sessionId, {
        childName,
        ageRange,
        ageYears: mergedProfile.ageYears,
        vibe,
        miniPreview: parsed.reply,
        inferredProfile: mergedProfile,
        introChatTranscript: introTranscript,
      });
    }

    return NextResponse.json({
      reply: parsed.reply,
      done: Boolean(parsed.done),
    });
  } catch (err: any) {
    console.error('[elf-mini-chat] error', err);
    return NextResponse.json(
      {
        message:
          err?.message || 'Something went wrong talking to Merry the Elf.',
      },
      { status: 500 },
    );
  }
}
