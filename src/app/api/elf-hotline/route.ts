// src/app/api/elf-hotline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { redis } from '@/lib/redis';
import { patchElfSession } from '@/lib/elfStore';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type HotlineProfile = {
  ageYears: number | null;
  siblings: string[];
  pets: string[];
  interests: string[];
  energyLevel: 'exhausted' | 'normal-tired' | 'has-some-energy';
  messTolerance: 'very-low' | 'low' | 'medium' | 'high';
  bannedProps: string[];
  availableProps: string[];
  notesForElf: string;
};

type HotlineState = {
  profile: HotlineProfile;
};

const EMPTY_PROFILE: HotlineProfile = {
  ageYears: null,
  siblings: [],
  pets: [],
  interests: [],
  energyLevel: 'normal-tired',
  messTolerance: 'low',
  bannedProps: [],
  availableProps: [],
  notesForElf: '',
};

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = (await req.json()) as {
      sessionId?: string;
      message?: string;
    };

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId.' },
        { status: 400 },
      );
    }

    // Load base elf session (name, ageRange, etc.) if you want
    const baseSession = await redis.get<{
      childName: string;
      ageRange: string;
      startDate: string;
      vibe: 'silly' | 'kind' | 'calm';
    }>(`elf-session:${sessionId}`);

    const childName = baseSession?.childName ?? 'your child';
    const ageRange = baseSession?.ageRange ?? '4–6 years';
    const vibe = baseSession?.vibe ?? 'silly';

    // Load existing hotline profile (if any)
    const existingState =
      (await redis.get<HotlineState>(`elf:hotline:${sessionId}`)) ?? {
        profile: EMPTY_PROFILE,
      };

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_hotline_turn',
          strict: true,
          schema: {
            type: 'object',
            required: ['reply', 'profile', 'done'],
            properties: {
              reply: {
                type: 'string',
                description:
                  'What Merry says out loud this turn. Warm, spoken, 1–3 short sentences, first person.',
              },
              done: {
                type: 'boolean',
                description:
                  'True when you have enough info to make a great 30-day Elf plan.',
              },
              profile: {
                type: 'object',
                required: [
                  'ageYears',
                  'siblings',
                  'pets',
                  'interests',
                  'energyLevel',
                  'messTolerance',
                  'bannedProps',
                  'availableProps',
                  'notesForElf',
                ],
                properties: {
                  ageYears: {
                    type: ['integer', 'null'],
                    description:
                      'Best-guess age in years, inferred from ageRange and conversation.',
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
You are "Merry", an Elf-on-the-Shelf hotline operator on a cosy phone call with a tired parent.

Goal:
- Have a SHORT, friendly back-and-forth.
- Gently collect all details needed to plan 30 nights of Elf ideas.
- Stay in character as Merry on an elf hotline call.

You already know:
- Child name: "${childName}"
- Child age range: "${ageRange}"
- Elf vibe: "${vibe}"

Hotline rules:
- Speak like a real phone call: 1–3 short sentences per turn, warm and reassuring.
- Ask ONE focused question at a time.
- Use plain language, no JSON or brackets in "reply".
- Assume parent is tired and maybe holding a phone one-handed.

Data rules:
- Update the "profile" object with anything you can infer from the conversation so far.
- If information is unknown, keep existing values; don't invent specifics.
- Set "done" to true only when you are confident you have enough info to strongly personalise 30 days of Elf setups and notes.

Conversation steps (roughly):
1) Start by greeting them, confirming child name and vibe.
2) Ask about the child's favourite things right now (shows, games, toys, hobbies).
3) Ask about siblings & pets.
4) Ask about evenings in their house and their energy levels.
5) Ask about mess tolerance / banned things (glitter, food mess, etc.).
6) Ask what simple things they DO have that elves could use (books, toy cars, fairy lights, printer, craft box, etc.).
7) Ask for any last notes or sensitivities for the Elf (fears, beliefs, neurodivergence, etc.).
8) Once everything is filled, set done=true and end with a cosy closing line.

ONLY output JSON per the schema.
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
                  lastMessage: message ?? null,
                  previousProfile: existingState.profile,
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
      done: boolean;
      profile: HotlineProfile;
    };

    // Save updated profile back to Redis
    await patchElfSession(sessionId, {
      childName,
      ageRange,
      // startDate,
      vibe,
    });

    return NextResponse.json({
      reply: parsed.reply,
      done: parsed.done,
    });
  } catch (err: any) {
    console.error('[elf-hotline] error', err);
    return NextResponse.json(
      {
        message:
          err?.message || 'Something went wrong talking to the Elf hotline.',
      },
      { status: 500 },
    );
  }
}
