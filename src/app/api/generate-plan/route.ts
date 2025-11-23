// src/app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  getElfSession,
  patchElfSession,
  ElfPlanObject,
  NightType,
  EffortLevel,
  MessLevel,
} from '@/lib/elfStore';
import { currentUser } from '@/lib/currentUser';

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

    const authSession = await currentUser();
    const userEmail = authSession?.email ?? storedSession.userEmail ?? null;

    const numDays = 30;

    const childName =
      profile.childName || storedSession.childName || 'your child';
    const ageYears = profile.ageYears ?? null;
    const ageRange =
      profile.ageRange || storedSession.ageRange || '4–6 years';
    const vibe = profile.vibe || storedSession.vibe || 'silly';

    const energyLevel = profile.energyLevel ?? 'normal-tired';
    const messTolerance = profile.messTolerance ?? 'low';

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

    // ---- Responses API call ----
    const response = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_30_day_plan_v2',
          strict: true,
          schema: {
            type: 'object',
            required: ['planOverview', 'days'],
            additionalProperties: false,
            properties: {
              planOverview: {
                type: 'string',
                description:
                  '1–3 short paragraphs explaining the overall Elf plan and tone.',
              },
              parentNotes: {
                type: 'string',
                description:
                  'Optional global notes for the parent: safety, substitutions, encouragement.',
              },
              days: {
                type: 'array',
                minItems: numDays,
                maxItems: numDays,
                items: {
                  type: 'object',
                  required: [
                    'dayNumber',
                    'title',
                    'description',
                    'imagePrompt',
                  ],
                  additionalProperties: false,
                  properties: {
                    dayNumber: {
                      type: 'integer',
                      description:
                        '1–30. Should match the provided calendar dayNumber.',
                    },
                    title: {
                      type: 'string',
                      description:
                        'Short, fun name for tonight’s setup.',
                    },
                    description: {
                      type: 'string',
                      description:
                        'Clear instructions for the parent on how to set up the scene at night, in 4–6 sentences.',
                    },
                    morningMoment: {
                      type: 'string',
                      description:
                        'Optional: description of what the child discovers or does in the morning.',
                    },
                    easyVariant: {
                      type: 'string',
                      description:
                        'Optional: much simpler fallback version of this setup if the parent is exhausted.',
                    },
                    noteFromElf: {
                      type: 'string',
                      description:
                        'Short note in the elf’s voice, to the child, 1–3 sentences.',
                    },
                    materials: {
                      type: 'array',
                      description:
                        'Simple household props needed for this setup.',
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
                      description:
                        'Optional keywords like "k-pop", "pets", "kindness", "puzzle".',
                    },
                    imagePrompt: {
                      type: 'string',
                      description:
                        'Detailed visual prompt describing the Elf scene for a vertical, cosy reference photo. Must clearly show how to copy the setup.',
                    },
                    imageUrl: {
                      type: 'string',
                      description:
                        'Optional pre-generated image URL. Usually empty; filled later.',
                    },
                    emailSubject: {
                      type: 'string',
                      description:
                        'Optional: complete email subject, e.g. "Tonight: cereal-box zipline (5-min setup)".',
                    },
                    emailPreview: {
                      type: 'string',
                      description:
                        'Optional: 1-sentence email preview line for the parent.',
                    },
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
          content: [
            {
              type: 'input_text',
              text: `
You are "Merry", an expert Elf-on-the-Shelf planner designing a 30-MORNING plan
for one specific family.

HIGH-LEVEL GOAL
- Each night, the parent sets up a scene after the child is asleep.
- Each morning, the child discovers the scene or has a tiny interaction.
- Make the month feel tailored to THIS child and THIS family.

CHILD & FAMILY SNAPSHOT
- Child name: "${childName}"
- Age / stage: "${ageYears ?? ageRange}"
- Elf vibe: "${vibe}" (silly / kind / calm).
- Typical parent evening energy: "${energyLevel}".
- Mess tolerance: "${messTolerance}".

TIMING RULES (IMPORTANT)
- Describe only parent setup at night in "description".
- Any interaction ("follow this clue", "write one thing", "hide the toy") happens in the MORNING.
- Do NOT suggest crafts or long games "at bedtime".
- School nights: mostly quick, low-effort, low-mess.
- Weekends/holidays: you may use some bigger setups if the parent has energy.

PLAN RHYTHM
Across 30 days, include a mix of "nightType":
- "hijinks": pure silly visual scenes.
- "quick-morning": 2–5 minute morning interactions.
- "weekend-project": short games or projects that can run a bit longer on suitable days.
- "emotional-support": gentle nights to support worries, confidence, friendships, big changes.
- "event-or-tradition": birthdays, cultural/religious events, school shows, trips, last day of term.

EFFORT & MESS
- Use "effortLevel" and "messLevel" realistically.
- For low mess tolerance, keep messLevel mostly "none" or "low".
- Reserve "medium" or "high" mess and "bigger-20-plus" effort for weekends only if it really suits them.

PER-NIGHT CONTENT
For each day:
- Title: specific, fun ("Pet Patrol Elevator", "Pillow-Fort Broadcast").
- Description: 4–6 sentences explaining EXACTLY what the parent sets up at night.
- MorningMoment: 1–3 sentences about what the child sees/does in the morning (optional but recommended).
- EasyVariant: a much simpler fallback version if the parent is exhausted (or empty string if not needed).
- NoteFromElf: 1–3 sentences in elf voice, speaking to the child by name, matching the vibe.
- Materials: simple, realistic household items only.
- ImagePrompt: IMAGE PROMPT RULES (EXTREMELY IMPORTANT)

Every "imagePrompt" MUST follow this structure:

1. Start with this exact base style (do not change wording):
   “Holiday elf-on-the-shelf style setup reference photo, photorealistic cosy December home, soft warm fairy lights and bokeh, shallow depth of field, vertical framing, no people or children, no text overlays. Elf doll with a friendly, playful face.”

2. Then describe the scene using ONLY:
   - Real physical craft materials (paper, tape, sticky notes, string, cotton, toy blocks, pens).
   - Clear, literal visual descriptions.
   - Camera-visible layout (where objects are placed, what they look like, what the elf is doing).
   - The handwritten elf note (describe its presence, not its text).

3. ABSOLUTELY FORBIDDEN inside "imagePrompt":
   - ANY branded characters, phrases, logos, items, or references.
     (No: Minecraft, Marvel, Disney, Fortnite, Pokémon, Lego, etc.)
   - ANY real weapons, fire, harmful objects.
   - ANY symbolic or abstract instructions (“inspired by…”, “like from a movie”, “implying heroes”).
   - ANY actions that can’t be photographed.

4. If the story references a branded character, the image MUST convert it into a
   simple handmade craft version, e.g.:
   - “small green boxy paper creature made from stacked sticky notes”
   - “simple red-and-gold paper mask with generic geometric shapes”
   The prompt must describe only what is literally visible.

5. The final imagePrompt MUST be a single paragraph describing a real,
   physically-buildable, photorealistic scene the parent can copy.


SAFETY & TONE
- No real weapons, self-harm, gore, or realistic danger.
- No shaming, spying, or threats. The elf is on the child’s side.
- Gentle spooky fun only if it obviously fits the profile; otherwise keep it cosy and safe.

CALENDAR
You will be given "calendar" with 30 entries: { dayNumber, date, weekday }.
Your "dayNumber" must match these in order. You do NOT need to calculate dates yourself.

OUTPUT
Return a single JSON object matching the JSON schema only.
No markdown, no extra keys, no comments.
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

    const basePlan = parsed as {
      planOverview: string;
      parentNotes?: string;
      days: Array<{
        dayNumber: number;
        title?: string;
        description?: string;
        morningMoment?: string;
        easyVariant?: string;
        noteFromElf?: string;
        materials?: string[];
        nightType?: string;
        effortLevel?: string;
        messLevel?: string;
        tags?: string[];
        imagePrompt?: string;
        imageUrl?: string | null;
        emailSubject?: string;
        emailPreview?: string;
      }>;
    };

    // Enrich days with our calendar (date + weekday) and defaults
    const enrichedDays = calendarMeta.map((meta, idx) => {
      const modelDay = basePlan.days[idx] ?? ({} as any);

      return {
        dayNumber: meta.dayNumber,
        date: meta.date,
        weekday: meta.weekday,

        title: modelDay.title ?? `Night ${meta.dayNumber}`,
        description: modelDay.description ?? '',

        morningMoment: modelDay.morningMoment || undefined,
        easyVariant: modelDay.easyVariant || undefined,
        noteFromElf: modelDay.noteFromElf || undefined,

        materials: modelDay.materials ?? [],

        // Cast model strings into your union types
        nightType: modelDay.nightType as NightType | undefined,
        effortLevel: modelDay.effortLevel as EffortLevel | undefined,
        messLevel: modelDay.messLevel as MessLevel | undefined,

        tags: modelDay.tags ?? [],

        imagePrompt: modelDay.imagePrompt ?? '',
        imageUrl: modelDay.imageUrl ?? null,

        emailSubject: modelDay.emailSubject || undefined,
        emailPreview: modelDay.emailPreview || undefined,
      };
    });

    // Work out the next version number based on any existing plan
    const previousPlan = storedSession.plan as ElfPlanObject | null;
    const previousVersion =
      previousPlan && typeof previousPlan.version === 'number'
        ? previousPlan.version
        : 0;

    const finalPlan: ElfPlanObject = {
      planOverview: basePlan.planOverview ?? '',
      parentNotes: basePlan.parentNotes ?? null,
      days: enrichedDays,
      status: 'draft',
      version: previousVersion + 1,
      approvedAt: null,
    };

    console.log('[generate-plan] finalPlan days[0]', finalPlan.days[0]);

    await patchElfSession(sessionId, {
      childName,
      ageRange,
      ageYears,
      startDate,
      vibe,
      userEmail,
      plan: finalPlan,
      planGeneratedAt: Date.now(),
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
