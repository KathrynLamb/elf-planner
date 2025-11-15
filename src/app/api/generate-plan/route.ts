// src/app/api/generate-plan/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const body = await req.json();

  const {
    sessionId,              // <-- you were using this but not defining it
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
    model: 'gpt-5.1-mini',

    // ✅ Structured outputs for Responses API live under `text.format`, not `response_format`
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
                ],
                properties: {
                  day: { type: 'integer' },
                  title: {
                    type: 'string',
                    description:
                      'Fun, short title the parent sees in the plan.',
                  },
                  setup: {
                    type: 'string',
                    description:
                      'Clear, step-by-step description of what the parent does that night. 3–6 sentences max.',
                  },
                  elfNote: {
                    type: 'string',
                    description:
                      'Short note written in the Elf’s voice, addressing the child by name. 1–3 sentences.',
                  },
                  effortLevel: {
                    type: 'string',
                    enum: ['very-low', 'low', 'medium'],
                  },
                  propsNeeded: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  parentTips: {
                    type: 'string',
                    description:
                      'Extra practical tips, timing hints, or safety notes (e.g. keep away from pets, avoid slippery floors).',
                  },
                  backupIdea: {
                    type: 'string',
                    description:
                      'Much quicker, very-low-effort alternative using similar theme, for nights when the parent is exhausted.',
                  },
                  callbacks: {
                    type: 'string',
                    description:
                      'Optional: Running joke or reference back to an earlier night or the child’s interests.',
                  },
                },
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

  // ✅ For Responses + text.format, the JSON comes back as a string in `.text`
  const rawText = (response as any).output?.[0]?.content?.[0]?.text as string;
  let planJson: unknown = null;

  try {
    planJson = JSON.parse(rawText);
  } catch {
    // fallback: return the raw text if somehow parsing fails
    planJson = rawText;
  }

  return NextResponse.json({ plan: planJson });
}
