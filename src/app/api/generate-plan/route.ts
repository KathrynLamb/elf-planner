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

    const allChildNames = [
      profile.childName || storedSession.childName || '',
      ...(profile.siblings ?? []),
    ]
      .map((n) => (n || '').trim())
      .filter(Boolean);
    
    const childNamesLine =
      allChildNames.length === 0
        ? 'unnamed kid(s)'
        : allChildNames.join(', ');
    

    const authSession = await currentUser();
    const userEmail = authSession?.email ?? storedSession.userEmail ?? null;

    // 🎄 24-day plan: Dec 1–Dec 24
    const childName =
      profile.childName || storedSession.childName || 'your child';
    const ageYears = profile.ageYears ?? null;
    const ageRange =
      profile.ageRange || storedSession.ageRange || '4–6 years';
    const vibe = profile.vibe || storedSession.vibe || 'silly';

    const energyLevel = profile.energyLevel ?? 'normal-tired';
    const messTolerance = profile.messTolerance ?? 'low';

    // humourTone is an extra field you’ll add to your profile type
    const humourTone =
      (profile as any).humourTone ??
      'clean-only'; // 'clean-only' | 'silly-toilet-ok' | 'anything-goes'

    // Always run from Dec 1st to Dec 24th of a specific year.
    // If the session already has a startDate, we keep its YEAR but force Dec 1.
    // Otherwise, use the current year.
    const existingStart = storedSession.startDate
      ? new Date(storedSession.startDate)
      : new Date();

    const planYear = existingStart.getFullYear();
    const startDate = `${planYear}-12-01`; // YYYY-12-01

    // Pre-compute calendar info for the 24 nights: Dec 1–Dec 24
    const numDays = 24;

    const calendarMeta = Array.from({ length: numDays }, (_, i) => {
      const dateObj = addDays(startDate, i); // 0 → Dec 1, 23 → Dec 24
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

    const profileBrief = `
Family brief for Merry:

- Children: ${childNamesLine}, age ${ageYears ?? ageRange}
- Elf vibe: ${vibe} (silly / kind / calm)
- Parent evening energy: ${energyLevel}
- Mess tolerance: ${messTolerance}
- Interests: ${(profile.interests ?? []).join(', ') || 'not specified'}
- Siblings: ${(profile.siblings ?? []).join(', ') || 'not specified'}
- Pets: ${(profile.pets ?? []).join(', ') || 'not specified'}
- Banned props/themes: ${(profile.bannedProps ?? []).join(', ') || 'none'}
- Easy props available: ${(profile.availableProps ?? []).join(', ') || 'standard home stuff'}
- Extra wishes / worries for the elf: ${profile.notesForElf || 'none'}
- Humour tone: ${humourTone} 
  (clean-only = no toilet/gross/crude jokes; 
   silly-toilet-ok = gentle poo / fart / bum jokes okay but still child-safe; 
   anything-goes = parents like cheeky, slightly edgy humour – still keep it kind and age-appropriate).
    `.trim();

    // ---- First pass: generate a full draft plan ----
    const planResponse = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_24_day_plan_v2',
          strict: true,
          schema: {
            type: 'object',
            required: ['planOverview', 'parentNotes', 'days'],
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
                  'Optional global notes for the parent: safety, substitutions, encouragement. Can be empty string if not needed.',
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
                    'morningMoment',
                    'easyVariant',
                    'noteFromElf',
                    'materials',
                    'nightType',
                    'effortLevel',
                    'messLevel',
                    'tags',
                    'imagePrompt',
                    'imageUrl',
                    'emailSubject',
                    'emailPreview',
                  ],
                  additionalProperties: false,
                  properties: {
                    dayNumber: {
                      type: 'integer',
                      description:
                        '1–24. Should match the provided calendar dayNumber.',
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
                        'Optional: description of what the child discovers or does in the morning. Use empty string if not needed.',
                    },
                    easyVariant: {
                      type: 'string',
                      description:
                        'Optional: much simpler fallback version of this setup if the parent is exhausted. Use empty string if not needed.',
                    },
                    noteFromElf: {
                      type: 'string',
                      description:
                        'Short note in the elf’s voice, to the child, 1–3 sentences. Use empty string if not needed.',
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
                        'Optional keywords like "pets", "kindness", "puzzle". Can be empty array.',
                    },
                    imagePrompt: {
                      type: 'string',
                      description:
                        'Detailed visual prompt describing the Elf scene for a vertical, cosy reference photo. Must clearly show how to copy the setup.',
                    },
                    imageUrl: {
                      type: 'string',
                      description:
                        'Optional pre-generated image URL. Usually empty string; filled later.',
                    },
                    emailSubject: {
                      type: 'string',
                      description:
                        'Optional: complete email subject, e.g. "Tonight: cereal-box zipline (5-min setup)". Use empty string if not needed.',
                    },
                    emailPreview: {
                      type: 'string',
                      description:
                        'Optional: 1-sentence email preview line for the parent. Use empty string if not needed.',
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
You are "Merry", an expert Elf-on-the-Shelf planner designing a 24-MORNING plan
for one specific family. The elf arrives on December 1st and leaves on Christmas Eve (24th).

HIGH-LEVEL GOAL
- Each night, the parent sets up a scene after the child is asleep.
- Each morning, the child discovers the scene or has a tiny interaction.
- Make December 1–24 feel tailored to THIS child and THIS family.

You will receive:
- A natural-language "family brief"
- A calendar of 24 days (with weekday names)
- A structured profile object

CHILD & FAMILY SNAPSHOT
- Use the brief to understand their energy, mess tolerance, humour tone, interests, siblings, pets, and any banned props/themes.
- Respect banned props/themes and mess tolerance at all times.

PLAN RHYTHM (IMPORTANT)
- Day 1 must be an ARRIVAL or WELCOME scene: low effort, low mess, friendly tone.
- Day 24 must be a FAREWELL / CHRISTMAS EVE scene: warm, slightly magical, and clearly explains that the elf is leaving.
- Weeknights (Monday–Thursday): 
  - Mostly "hijinks" or "quick-morning" nightType.
  - effortLevel should usually be "micro-2-min" or "short-5-min".
  - messLevel should be "none" or "low".
- Fridays and weekends:
  - You may use "weekend-project" and "bigger-20-plus" effortLevel.
  - messLevel can occasionally be "medium" or "high" IF the profile’s messTolerance allows it.
- Ensure at least:
  - 3–5 "emotional-support" nights if the profile notes any worries (school nerves, big changes, etc).
  - Several nights directly anchored to the child’s interests, pets, siblings, or favourite activities.
- Avoid repeating the same core gag more than once (no copy-paste cereal scenes).

EFFORT, MESS & SHOWSTOPPERS
- Use "effortLevel" and "messLevel" realistically.
- For "very-low" or "low" messTolerance:
  - Keep nearly all nights at "none" or "low"; reserve "medium" for one or two deliberate weekend projects (if at all).
- For "exhausted" energyLevel:
  - Favour "micro-2-min" and "short-5-min". 
  - Always provide a genuinely simple "easyVariant" fallback that can be done in under 2 minutes.
- For "has-some-energy" and higher messTolerance:
  - Include a few clear "showstopper" weekends with memorable visuals and stronger photography notes in "imagePrompt".

HUMOUR TONE (IMPORTANT)
- "clean-only":
  - No toilet humour, no body-function jokes, no crude or suggestive puns.
  - Focus on gentle silliness, kindness, cosy surprises, and light wordplay.
- "silly-toilet-ok":
  - Light toilet humour is allowed (e.g. silly poo emoji, mild fart jokes, peas spelling a funny word), but:
    - Keep it cartoonish and not graphic.
    - No shaming, bullying, or humiliation.
    - No jokes that sexualise bodies or are aimed at specific people’s appearance.
- "anything-goes":
  - Parents are comfortable with cheeky humour, but:
    - Still follow all safety and kid-appropriate rules above.
    - No sexual content, adult innuendo, or demeaning jokes.
    - No realistic depictions of bodily waste; keep it playful and symbolic.

PERSONALISATION
- Every night should have at least one element that clearly connects it to THIS child:
  - Using their name, a favourite toy/interest, siblings, pets, or a specific worry you’re supporting.
- NoteFromElf should usually address the child by name and match the chosen vibe (silly / kind / calm).

PER-NIGHT CONTENT
For each day:
- Title: specific, fun ("Cereal Island Rescue", "Pillow-Fort Broadcast").
- Description: 4–6 sentences explaining EXACTLY what the parent sets up at night.
- MorningMoment: 1–3 sentences about what the child sees/does in the morning (optional; use empty string if you skip it).
- EasyVariant: a much simpler fallback version if the parent is exhausted (or empty string if not needed).
- NoteFromElf: 1–3 sentences in elf voice, speaking to the child by name, matching the vibe (or empty string if not used).
- Materials: simple, realistic household items only; prefer things most homes have.

IMAGE PROMPT RULES (EXTREMELY IMPORTANT)
[...same as previous version – keep the full rules here...]

CALENDAR
You will be given "calendar" with 24 entries: { dayNumber, date, weekday }.
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
                  brief: profileBrief,
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

    const rawText = planResponse.output_text;
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

    // ---- Second pass: critic + fixer ----
    const criticResponse = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_24_day_plan_critique_v1',
          strict: true,
          schema: {
            type: 'object',
            required: ['replacements', 'globalNotes'],
            additionalProperties: false,
            properties: {
              globalNotes: {
                type: 'string',
                description:
                  'Short overall comment about how well the plan fits this family.',
              },
              replacements: {
                type: 'array',
                description:
                  'Only include entries for nights that need fixing. Nights not listed are left as-is.',
                items: {
                  type: 'object',
                  required: ['dayNumber', 'reason', 'fixedDay'],
                  additionalProperties: false,
                  properties: {
                    dayNumber: { type: 'integer' },
                    reason: { type: 'string' },
                    fixedDay: {
                      type: 'object',
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
                        'imagePrompt',
                        'imageUrl',
                        'emailSubject',
                        'emailPreview',
                      ],
                      additionalProperties: false,
                      properties: {
                        dayNumber: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        morningMoment: { type: 'string' },
                        easyVariant: { type: 'string' },
                        noteFromElf: { type: 'string' },
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
                        imagePrompt: { type: 'string' },
                        imageUrl: { type: 'string' },
                        emailSubject: { type: 'string' },
                        emailPreview: { type: 'string' },
                      },
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
You are Merry doing a STRICT QUALITY CHECK on a 24-morning Elf plan
you already wrote.

[critique instructions as in previous version – unchanged other than “24” wording]
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
                  brief: profileBrief,
                  profile,
                  calendar: calendarMeta,
                  plan: basePlan,
                },
                null,
                2,
              ),
            },
          ],
        },
      ],
    });

    const criticRaw = criticResponse.output_text;
    console.log(
      '[generate-plan] critic raw snippet:',
      criticRaw?.slice(0, 200),
    );

    let criticParsed: any = { replacements: [], globalNotes: '' };
    if (criticRaw) {
      try {
        criticParsed = JSON.parse(criticRaw);
      } catch {
        console.warn(
          '[generate-plan] critic JSON.parse failed – proceeding with base plan only',
        );
      }
    }

    const replacements: Array<{ dayNumber: number; fixedDay: any }> =
      (criticParsed.replacements ?? []).map((r: any) => ({
        dayNumber: r.dayNumber,
        fixedDay: r.fixedDay,
      }));

    // Enrich days with calendar (date + weekday) and apply replacements
    const enrichedDays = calendarMeta.map((meta, idx) => {
      const modelDay = basePlan.days[idx] ?? ({} as any);
      const replacement = replacements.find(
        (r) => r.dayNumber === meta.dayNumber,
      );
      const effectiveDay = replacement?.fixedDay ?? modelDay;

      return {
        dayNumber: meta.dayNumber,
        date: meta.date,
        weekday: meta.weekday,

        title: effectiveDay.title ?? `Night ${meta.dayNumber}`,
        description: effectiveDay.description ?? '',

        morningMoment: effectiveDay.morningMoment || undefined,
        easyVariant: effectiveDay.easyVariant || undefined,
        noteFromElf: effectiveDay.noteFromElf || undefined,

        materials: effectiveDay.materials ?? [],

        nightType: effectiveDay.nightType as NightType | undefined,
        effortLevel: effectiveDay.effortLevel as EffortLevel | undefined,
        messLevel: effectiveDay.messLevel as MessLevel | undefined,

        tags: effectiveDay.tags ?? [],

        imagePrompt: effectiveDay.imagePrompt ?? '',
        imageUrl: effectiveDay.imageUrl ?? null,

        emailSubject: effectiveDay.emailSubject || undefined,
        emailPreview: effectiveDay.emailPreview || undefined,
      };
    });

    const finalPlan: ElfPlanObject = {
      planOverview: basePlan.planOverview ?? '',
      parentNotes: basePlan.parentNotes || undefined,
      days: enrichedDays,
      status: 'draft',
      version: 1,
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
