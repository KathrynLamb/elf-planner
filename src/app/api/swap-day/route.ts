import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getElfSession,
  patchElfSession,
  ElfPlanObject,
} from '@/lib/elfStore';

export const runtime = 'nodejs';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, dayNumber, feedback } = body as {
      sessionId?: string;
      dayNumber?: number;
      feedback?: string[];
    };

    if (!sessionId || !dayNumber) {
      return NextResponse.json(
        { message: 'Missing sessionId or dayNumber.' },
        { status: 400 },
      );
    }

    const session = await getElfSession(sessionId);
    if (!session || !session.plan || !session.plan.days) {
      return NextResponse.json(
        { message: 'Elf plan not found for this session.' },
        { status: 404 },
      );
    }

    const profile = session.inferredProfile;
    if (!profile) {
      return NextResponse.json(
        { message: 'Missing inferred profile.' },
        { status: 400 },
      );
    }

    const existingDay = session.plan.days.find(
      (d) => d.dayNumber === dayNumber,
    );
    if (!existingDay) {
      return NextResponse.json(
        { message: `Day ${dayNumber} not found.` },
        { status: 404 },
      );
    }

    const reasons = Array.isArray(feedback) ? feedback : [];

    // ---- Responses call to regenerate ONE night ----
    const response = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'swap_single_day_v1',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            // with strict:true, required MUST include *all* keys in properties
            required: [
              'dayNumber',
              'title',
              'description',
              'morningMoment',
              'easyVariant',
              'noteFromElf',
              'materials',
              'nightType',
              'effortLevel',
              'messLevel',
              'tags',
              'weekday',
              'date',
              'imagePrompt',
            ],
            properties: {
              dayNumber: { type: 'integer' },

              title: { type: 'string' },
              description: { type: 'string' },

              // If you don't need these, return an empty string.
              morningMoment: { type: 'string' },
              easyVariant: { type: 'string' },
              noteFromElf: { type: 'string' },

              // If you don't need any, return [].
              materials: {
                type: 'array',
                items: { type: 'string' },
              },

              nightType: {
                type: 'string',
                enum: [
                  'hijinks',
                  'quick-morning',
                  'weekend-project',
                  'emotional-support',
                  'event-or-tradition',
                ],
              },
              effortLevel: {
                type: 'string',
                enum: [
                  'micro-2-min',
                  'short-5-min',
                  'medium-10-min',
                  'bigger-20-plus',
                ],
              },
              messLevel: {
                type: 'string',
                enum: ['none', 'low', 'medium', 'high'],
              },

              tags: {
                type: 'array',
                items: { type: 'string' },
              },

              weekday: { type: 'string' },
              date: { type: 'string' },

              imagePrompt: { type: 'string' },
            },
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
You are Merry the Elf planning assistant.

Your task: SWAP one Elf night for this family.
You are NOT moving its date – just replacing the idea in the same calendar slot.

Rules:
- Keep the SAME "dayNumber", "date" and "weekday" you are given.
- If dayNumber === 1, the idea MUST feel like a "Welcome / Arrival" Elf morning.
- Respect the family's:
  • child age / vibe
  • parent evening energy
  • mess tolerance
- Follow the same IMAGE PROMPT rules as the main plan (no brands, no unsafe props).
- If you don't need a field like "easyVariant" or "morningMoment", return an empty string.
- If you don't need materials or tags, return an empty array.

Pay attention to the parent's feedback about this slot and avoid anything they disliked.
Never mention or criticise the old idea; just offer a fresh, better-fitting alternative.
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
                  child: {
                    name: profile.childName,
                    age: profile.ageYears || profile.ageRange,
                    vibe: profile.vibe,
                    energy: profile.energyLevel,
                    messTolerance: profile.messTolerance,
                  },
                  calendarSlot: {
                    dayNumber: existingDay.dayNumber,
                    date: existingDay.date,
                    weekday: existingDay.weekday,
                  },
                  originalIdea: {
                    title: existingDay.title,
                    description: existingDay.description,
                    morningMoment: existingDay.morningMoment,
                    easyVariant: existingDay.easyVariant,
                    noteFromElf: existingDay.noteFromElf,
                    materials: existingDay.materials,
                    nightType: existingDay.nightType,
                    effortLevel: existingDay.effortLevel,
                    messLevel: existingDay.messLevel,
                    tags: existingDay.tags,
                  },
                  parentFeedback: reasons,
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
    if (!rawText) throw new Error('Model returned no text for swap.');

    let newDay: any;
    try {
      newDay = JSON.parse(rawText);
    } catch (e) {
      console.error('[swap-day] JSON parse failed:', rawText);
      throw new Error('Model returned invalid JSON for swap.');
    }

    // Make sure calendar meta stays anchored to this slot
    newDay.dayNumber = existingDay.dayNumber;
    newDay.weekday = existingDay.weekday;
    newDay.date = existingDay.date;

    // Merge with existing metadata (preserves date/weekday etc.)
    const updatedDay = {
      ...existingDay,
      ...newDay,
    };

    // Replace that day inside the stored plan
    const newPlan: ElfPlanObject = {
      ...session.plan,
      days: session.plan.days.map((d) =>
        d.dayNumber === dayNumber ? updatedDay : d,
      ),
    };

    await patchElfSession(sessionId, {
      plan: newPlan,
      updatedAt: Date.now(),
    });

    // Minimal shape for the swiper client
    const swappedForClient = {
      dayNumber: updatedDay.dayNumber,
      title: updatedDay.title,
      description: updatedDay.description,
      noteFromElf: updatedDay.noteFromElf ?? null,
      morningMoment: updatedDay.morningMoment ?? null,
      easyVariant: updatedDay.easyVariant ?? null,
      materials: updatedDay.materials ?? [],
      nightType: updatedDay.nightType ?? null,
      effortLevel: updatedDay.effortLevel ?? null,
      messLevel: updatedDay.messLevel ?? null,
      tags: updatedDay.tags ?? [],
      weekday: updatedDay.weekday,
      date: updatedDay.date,
      imagePrompt: updatedDay.imagePrompt ?? null,
      imageUrl: updatedDay.imageUrl ?? null,
    };

    return NextResponse.json({ swapped: swappedForClient });
  } catch (err: any) {
    console.error('[swap-day] error:', err);
    return NextResponse.json(
      { message: err?.message || 'Swap failed.' },
      { status: 500 },
    );
  }
}
