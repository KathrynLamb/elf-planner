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

const SYSTEM_PROMPT = `
You are Merry the Elf, a warm, switched-on Elf-on-the-Shelf planner
chatting with a tired parent *before* they buy their 24-morning plan.

Your goals:
- Sound human, cosy and quick – like a friendly DM, not a survey.
- Ask focused questions to learn about:
  • kids (ages / how many / rough personalities)
  • whether they already have an elf (name, personality, usual setups)
  • how they want mornings to feel (calm, silly, big wow, gentle, etc.)
  • what each child is into (themes, toys, shows, activities)
  • parent evening energy (exhausted / normal-tired / has-some-energy)
  • mess tolerance (very-low / low / medium / high)
  • humour boundaries (clean-only / silly-toilet-ok / anything-goes)
  • props they have around and any banned props/themes.

Style rules:
- 1–4 short sentences per reply.
- Friendly and natural, never sales-y, never apologetic for questions.
- Most turns end with *one* clear question and exactly one "?".
- Most turns end with *one* clear question and exactly one "?".
- Keep questions focused and light. It’s okay to bundle **evening energy + mess tolerance** into a single natural question about what kind of setups feel realistic.
- Use kids’ names sparingly for warmth – not every message.

When to set done:true:
- You know:
  • number + rough ages of kids,
  • whether elf is new or existing (and name / vibe if existing),
  • at least one interest per child or per group,
  • how mornings should feel (their own words),
  • a reasonable guess for energyLevel, messTolerance, humourTone,
  • a rough sense of props + banned props.
- Once they’ve confirmed or lightly corrected your understanding, set done:true.

Output format (CRITICAL):
Return a JSON object with:
- reply: Merry’s message for this turn (1–4 short sentences, human style).
- done: boolean – true only when you have enough info for a tailored 24-morning plan.
- profile: your *best-guess* structured profile, filling as many fields as you can.
  It is OK for some fields to be approximate or still empty; do your best.

Do NOT talk about:
- price, payment, PayPal, emails, “magic links” or “24-night plan details”.
Do NOT design or list all the nights here.
`.trim();

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

    const tStart = Date.now();

    const baseSession = sessionId ? await getElfSession(sessionId) : null;

    // childName is allowed a friendly default for copy; vibe/ageRange are NOT defaulted.
    let childName = baseSession?.childName ?? 'your child';
    let ageRange: string | null = baseSession?.ageRange ?? null;
    let vibe: ElfVibe | null = (baseSession?.vibe as ElfVibe) ?? null;

    const existingProfile = baseSession?.inferredProfile ?? null;

    // Trim history so we don't send huge prompts every time
    const MAX_TURNS = 8;
    const trimmedMessages =
      messages.length > MAX_TURNS
        ? messages.slice(messages.length - MAX_TURNS)
        : messages;

    // IMPORTANT: map roles to correct content types
    const conversationInputs: any[] = trimmedMessages.map((m) => ({
      role: m.role,
      content: [
        {
          // user → input_text, assistant → output_text
          type: m.role === 'assistant' ? 'output_text' : 'input_text',
          text: m.content,
        },
      ],
    }));

    const tBeforeLLM = Date.now();
    console.log('[mini-chat] before LLM, ms =', tBeforeLLM - tStart);

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      max_output_tokens: 220,
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_mini_chat_preview_and_profile_v2',
          strict: true,
          schema: {
            type: 'object',
            required: ['reply', 'profile', 'done'],
            additionalProperties: false,
            properties: {
              reply: {
                type: 'string',
                description:
                  'Merry’s short, cosy reply for this turn (1–4 sentences).',
              },
              done: {
                type: 'boolean',
                description:
                  'true only when Merry has enough info to brew the full 24-morning plan.',
              },
              profile: {
                type: 'object',
                description:
                  'Best-guess profile of the child(ren), parent energy, humour tolerance, and practical constraints.',
                required: [
                  'childName',
                  'ageYears',
                  'ageRange',
                  'vibe',
                  'siblings',
                  'pets',
                  'interests',
                  'hasExistingElf',
                  'existingElfName',
                  'existingElfPersonality',
                  'existingElfSetups',
                  'wantsHelpNamingElf',
                  'energyLevel',
                  'messTolerance',
                  'humourTone',
                  'bannedProps',
                  'availableProps',
                  'notesForElf',
                ],
                additionalProperties: false,
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

                  hasExistingElf: { type: 'boolean' },
                  existingElfName: { type: 'string' },
                  existingElfPersonality: { type: 'string' },
                  existingElfSetups: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  wantsHelpNamingElf: { type: 'boolean' },

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
                  },
                },
              },
            },
          },
        },
      },
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        } as any,
        ...conversationInputs,
      ] as any,
    });

    const tAfterLLM = Date.now();
    console.log('[mini-chat] LLM call ms =', tAfterLLM - tBeforeLLM);
    console.log('[mini-chat] total route ms =', tAfterLLM - tStart);

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

      hasExistingElf:
        p.hasExistingElf ?? existingProfile?.hasExistingElf ?? null,
      existingElfName:
        p.existingElfName ?? existingProfile?.existingElfName ?? null,
      existingElfPersonality:
        p.existingElfPersonality ??
        existingProfile?.existingElfPersonality ??
        null,
      existingElfSetups:
        p.existingElfSetups ?? existingProfile?.existingElfSetups ?? [],
      wantsHelpNamingElf:
        p.wantsHelpNamingElf ?? existingProfile?.wantsHelpNamingElf ?? null,

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
