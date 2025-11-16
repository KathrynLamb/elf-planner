// src/app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { getElfSession, patchElfSession, ElfPlanObject } from '@/lib/elfStore';
import { getCurrentSession } from '@/lib/auth';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function addDays(dateStr: string, days: number): Date {
  // Normalize to UTC to avoid TZ weirdness
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId.' },
        { status: 400 },
      );
    }

    const storedSession = await getElfSession(sessionId);
    if (!storedSession) {
      return NextResponse.json(
        { message: 'Elf session not found.' },
        { status: 404 },
      );
    }

    const profile = storedSession.inferredProfile;
    if (!profile) {
      return NextResponse.json(
        {
          message:
            'Missing inferred Elf profile. Please chat to Merry first so she can learn about your kiddo.',
        },
        { status: 400 },
      );
    }

    const authSession = await getCurrentSession();
    const userEmail = authSession?.user?.email ?? storedSession.userEmail ?? null;

    const numDays = 30;

    const childName = profile.childName || storedSession.childName || 'your child';
    const ageYears = profile.ageYears ?? null;
    const ageRange =
      profile.ageRange || storedSession.ageRange || '4–6 years';
    const vibe = profile.vibe || storedSession.vibe || 'silly';

    const startDate =
      storedSession.startDate ||
      new Date().toISOString().slice(0, 10); // fallback: today

    // Pre-compute calendar info for the 30 nights
    const calendarMeta = Array.from({ length: numDays }, (_, i) => {
      const dateObj = addDays(startDate, i);
      const iso = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      const weekday = dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
      });
      return {
        dayNumber: i + 1,
        date: iso,
        weekday,
      };
    });

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_30_day_plan',
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
                  required: ['dayNumber', 'title', 'description', 'noteFromElf',  'imagePrompt'],
                  properties: {
                    dayNumber: {
                      type: 'integer',
                      description:
                        '1–30. Should match the provided calendar dayNumber.',
                    },
                    title: {
                      type: 'string',
                      description: 'Short, fun name for tonight’s setup.',
                    },
                    description: {
                      type: 'string',
                      description:
                        'Clear instructions for the parent on how to set up the scene, in 2–6 sentences. Assume they are tired and have only a few minutes.',
                    },
                    noteFromElf: {
                      type: 'string',
                      description:
                        'Optional short note the Elf “writes” to the child for this night. Can be empty if no note is needed.',
                    },
                    imagePrompt: {
                      type: 'string',
                      description:
                        'A detailed visual prompt for gpt-image-1 that describes tonight’s Elf scene. No text-in-image instructions. Describe the Elf, the setting, props, lighting, and overall mood.',
                    },
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

Your job is to create a **30-night plan** for one specific child and their family.

Design constraints:
- Write for roughly ${ageYears ?? ageRange ?? '5–7'} years old.
- The Elf’s general vibe is "${vibe}" (silly / kind / calm). Match that tone.
- Use the child’s interests and family details heavily so it feels like the Elf truly knows them.
- Assume the parent is often tired. Most nights should be very-low to low effort.
- NEVER involve: open flames, dangerous objects, water on floors, blocking exits, choking hazards, bullying, or anything that encourages unsafe behaviour.
- Avoid mean tricks, shaming, or threats. The Elf is playful, kind, and on the child’s side.

Scene + image guidance:
- For each day, "description" explains the setup in words to the parent.
- "imagePrompt" is how we illustrate the scene with gpt-image-1:
  - Describe the Elf, setting, props, and composition.
  - Include cosy Christmas details if appropriate (fairy lights, blankets, snow outside).
  - Do NOT ask for written text/letters visible in the image (the parent can add their own note on paper).
  - Keep everything family-friendly and non-branded (no licensed characters or logos).

You will be given a calendar of 30 nights (dayNumber, date, weekday). Your "dayNumber" field must line up with that; you do NOT need to recalculate dates.

Return JSON only. No markdown, no commentary.
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
                  childName,
                  ageYears,
                  ageRange,
                  vibe,
                  startDate,
                  calendar: calendarMeta,
                  inferredProfile: profile,
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

    const rawText = response.output_text;
    console.log('[generate-plan] rawText snippet:', rawText?.slice(0, 200));

    if (!rawText) {
      throw new Error('Model returned empty output_text');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.error('[generate-plan] JSON.parse failed', err);
      throw new Error('Model returned invalid JSON for Elf plan.');
    }

    // Shape should match ElfPlanObject without date/weekday; now we enrich.
    const basePlan = parsed as {
      planOverview: string;
      days: Array<{
        dayNumber: number;
        title: string;
        description: string;
        noteFromElf?: string;
        imagePrompt: string;
      }>;
    };

    const enrichedDays = calendarMeta.map((meta, idx) => {
      const modelDay = basePlan.days[idx] ?? {};
      return {
        dayNumber: meta.dayNumber,
        date: meta.date,
        weekday: meta.weekday,
        title: modelDay.title ?? `Night ${meta.dayNumber}`,
        description: modelDay.description ?? '',
        noteFromElf: modelDay.noteFromElf || undefined,
        imagePrompt: modelDay.imagePrompt ?? '',
      };
    });

    const finalPlan: ElfPlanObject = {
      planOverview: basePlan.planOverview ?? '',
      days: enrichedDays,
    };

    console.log("final plan", finalPlan)

    // Persist to Redis
    await patchElfSession(sessionId, {
      childName,
      ageRange,
      ageYears,
      startDate,
      vibe,
      userEmail,
      plan: finalPlan,
      planGeneratedAt: Date.now(),
      // keep miniPreview as-is if already present
    });

    return NextResponse.json({ plan: finalPlan });
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
