// src/app/api/generate-plan/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      sessionId,
      childName,
      ageYears,
      ageRange,
      startDate,
      vibe, // 'silly' | 'kind' | 'calm'
      siblings = [],
      pets = [],
      interests = [],
      energyLevel = 'normal-tired',
      messTolerance = 'low',
      bannedProps = [],
      availableProps = [],
      notesForElf = '',
    } = body;

    if (!childName || !startDate || !vibe) {
      return NextResponse.json(
        { message: 'Missing required Elf details.' },
        { status: 400 },
      );
    }

    // 30-day plan by default
    const numDays = 30;

    const response = await client.responses.create({
      model: 'gpt-5-mini', // ✅ valid model

      text: {
        format: {
          type: 'json_schema',
          name: 'elf_plan',
          strict: true,
          schema: {
            type: 'object',
            required: ['planOverview', 'days'],
            properties: {
              planOverview: {
                type: 'string',
                description:
                  'Short friendly summary for the parent explaining the overall arc, running jokes and how gentle/kind the tone is.',
              },
              days: {
                type: 'array',
                minItems: numDays,
                maxItems: numDays,
                items: {
                  type: 'object',
                  required: [
                    'day',
                    'title',
                    'setup',
                    'elfNote',
                    'effortLevel',
                    'propsNeeded',
                    'parentTips',
                    'backupIdea',
                    'callbacks', // must be listed too
                  ],
                  properties: {
                    day: { type: 'integer' },
                    title: { type: 'string' },
                    setup: { type: 'string' },
                    elfNote: { type: 'string' },
                    effortLevel: {
                      type: 'string',
                      enum: ['very-low', 'low', 'medium'],
                    },
                    propsNeeded: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    parentTips: { type: 'string' },
                    backupIdea: { type: 'string' },
                    callbacks: { type: 'string' },
                  },
                  additionalProperties: false,
                },
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
You are "Merry", an expert Elf-on-the-Shelf mischief planner and children’s storyteller.
Your job is to create a **30-day plan** that feels unbelievably personal, warm, and funny
for ONE specific child and their family.

Design choices:
- Write for roughly ${ageYears ?? ageRange ?? '5-7'} years old.
- The Elf’s general vibe is "${vibe}" (silly / kind / calm). Match that tone.
- Use the child’s interests and family details heavily so it feels like the Elf truly knows them.
- Include occasional running jokes and gentle callbacks across days (but keep each day understandable on its own).
- Assume the parent is often tired. Most nights should be **very-low to low effort**.
- NEVER involve: open flames, dangerous objects, water on floors, blocking exits, choking hazards, or anything that encourages unsafe behaviour.
- Avoid mean-spirited tricks, shaming, threats, or "Santa will be angry" vibes. The Elf is playful, kind, and on the child’s side.

Practical constraints:
- Respect the parent’s mess tolerance and banned props.
- Prefer using things the family *likely has* and any explicit "availableProps".
- Keep instructions crystal clear so a sleep-deprived parent at 11pm can follow them.

Tone:
- Warm, funny, cosy. Think "British parent who loves their kid, slightly chaotic December".
- Light gentle humour about parents being tired is okay, but never at the child’s expense.
- Keep the Elf’s notes short, readable, and heartwarming.

Output JSON only. No markdown, no commentary.
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
                  sessionId,
                  childName,
                  ageYears,
                  ageRange,
                  startDate,
                  vibe,
                  siblings,
                  pets,
                  interests,
                  energyLevel,
                  messTolerance,
                  bannedProps,
                  availableProps,
                  notesForElf,
                  numDays,
                },
                null,
                2,
              ),
            },
          ],
        },
      ],
    });

    // ✅ Easiest way: structured output comes back as a JSON string here
    const rawText = response.output_text;
    console.log('[generate-plan] rawText snippet:', rawText?.slice(0, 200));

    if (!rawText) {
      throw new Error('Model returned empty output_text');
    }

    let planJson: unknown;
    try {
      planJson = JSON.parse(rawText);
    } catch (err) {
      console.error('[generate-plan] JSON.parse failed, returning raw text', err);
      planJson = rawText; // worst case: let client see the raw text
    }

    return NextResponse.json({ plan: planJson });
  } catch (error: any) {
    console.error('[generate-plan] error', error);
    return NextResponse.json(
      {
        message:
          error?.message || 'Something went wrong generating your Elf plan.',
      },
      { status: 500 },
    );
  }
}
