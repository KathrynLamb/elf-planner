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

 // IMPORTANT: Only use fallback if the profile truly lacks the field.
const energyLevel =
typeof profile.energyLevel === 'string'
  ? profile.energyLevel
  : '(not specified yet)';

const messTolerance =
typeof profile.messTolerance === 'string'
  ? profile.messTolerance
  : '(not specified yet)';

const humourTone =
typeof (profile as any).humourTone === 'string'
  ? (profile as any).humourTone
  : '(not specified yet)';


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

    const morningGoal = profile.notesForElf || '(not clearly stated)'; 

let planIntensity = 'balanced';
if (morningGoal.match(/viral|over the top|extravagant|huge|big set.?ups/i)) {
  planIntensity = 'go-big-wow';
} else if (morningGoal.match(/calm|low[- ]pressure|gentle|simple/i)) {
  planIntensity = 'low-key-cosy';
}

    const profileBrief = `

Family brief for Merry:
- Children: ${childNamesLine}, age ${ageYears ?? ageRange}
- Elf personality: ${profile.existingElfPersonality || '(not specified)'}
- Elf vibe: ${vibe} (silly / kind / calm)
- Parent evening energy: ${energyLevel}  // May still be unspecified
- Mess tolerance: ${messTolerance}
- Humour tone: ${humourTone}

IMPORTANT: If any item is marked '(not specified yet)', you must infer based on tone set by parents
BUT you must also reflect it in the planOverview so the parent can tweak it later.

- Interests: ${(profile.interests ?? []).join(', ') || 'not specified'}
- Pets: ${(profile.pets ?? []).join(', ') || 'not specified'}
- Known previous setups: ${(profile.existingElfSetups ?? []).join(', ') || 'none'}

- Banned props/themes: ${(profile.bannedProps ?? []).join(', ') || 'none'}
- Props available: ${(profile.availableProps ?? []).join(', ') || 'standard home stuff'}
- Extra wishes / worries for the elf: ${profile.notesForElf || 'none'}
- Desired morning feel (parent’s own words): ${morningGoal}
- Overall plan intensity: ${planIntensity}  // "low-key-cosy" | "balanced" | "go-big-wow"
NOTE: Elf personality should shape tone of noteFromElf AND style of hijinks/kindness.


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

- Day 1 must be an ARRIVAL or WELCOME scene that reflects the parents’ chosen tone and the elf’s personality.
- Day 24 must be a FAREWELL / CHRISTMAS EVE scene: warm, slightly magical, and clearly explains that the elf is leaving.

- Use the profile to decide the **overall mix** instead of assuming most parents want low-effort, calm nights:
  - If the parent talks about big, extravagant, “Pinterest-y” or viral-worthy setups, or says they don’t mind extra effort:
    - Prioritise more showstopper nights (weekend-project + bigger-20-plus) on Fridays/weekends.
    - It’s fine if weeknights sometimes go up to medium effort / medium mess if energyLevel and messTolerance allow it.
  - If the parent emphasises calm, low-pressure, “please make this easy”:
    - Keep most weeknights micro-2-min or short-5-min with none/low mess.
    - Keep showstoppers to a small number of clearly-labelled weekends with strong easyVariants.
  - If the parent is in-between or not clear:
    - Aim for a balanced mix: some very easy nights, some mid-effort fun, and a handful of bigger wow moments at weekends.

- Only add 3–5 “emotional-support” nights if the brief or notes mention worries (school nerves, big changes, confidence, etc).
  - If no worries are mentioned, emotional-support nights should be rare and always framed as gentle encouragement, not therapy.

- Avoid repeating the same core gag more than once (no copy-paste cereal scenes).

JOKES & HUMOUR STYLE

- Use the parent's own words about how they want mornings to feel (e.g. “giggles and kindness”, “calm and cosy”) plus humourTone to decide how joke-heavy the plan is.

- If the parent talks about giggles, silliness, wild or over-the-top fun:
  - Most nights should have a clear joke or gag (visual, mischief, or wordplay).
  - Weekends can include bigger, more theatrical joke setups, especially if setupIntensity is "go-big-wow".

- If they want calm / cosy / gentle mornings:
  - Keep jokes softer and occasional.
  - Favour sweet, story-like scenes, tiny surprises and light wordplay.

- HumourTone controls what kinds of jokes you can use:
  - "clean-only": no toilet/gross jokes at all. Focus on visual gags, gentle mischief and kind notes.
  - "silly-toilet-ok": 10–30% of nights may include very light, cartoonish toilet humour (emoji, mild fart jokes), never shaming or graphic.
  - "anything-goes": you may lean more into chaotic or cheeky jokes and a few subtle parent-wink setups, but still keep everything kind and age-appropriate.

- Let the elf's personality shape the humour:
  - If the elf is described as chaotic or cheeky, tilt more nights toward mischief and visual scrapes.
  - If the elf is described as gentle or kind, tilt toward sweet jokes, encouraging notes and “I tried to help” scenes.
  - If the elf is dramatic or showy, tilt toward theatrical, photo-worthy gag setups.

- For any night that is mainly about a joke, add at least one tag describing the joke style:
  - "visual-gag", "mischief", "wordplay", "toilet-humour-light", "parent-wink", "puzzle-game".

  PLAN INTENSITY (CRITICAL)

  You will receive a field "Overall plan intensity" in the brief:
  - "low-key-cosy"  → favour easier, calmer nights.
  - "balanced"      → mix of easy, medium, and a handful of bigger wow nights.
  - "go-big-wow"    → many nights should feel bold, funny or visually striking enough for parents to want to share photos.
  
  Respect this field:
  - Do NOT assume all parents want calm, low-effort nights.
  - If it says "go-big-wow" and energyLevel and messTolerance are not "very-low", you should:
    - Include at least 6–8 clearly bigger/standout nights across the month.
    - Give strong, photo-friendly imagePrompts for those nights.
  - If it says "low-key-cosy" or energyLevel is "exhausted" and messTolerance "very-low/low":
    - Keep most nights truly easy, with only 1–3 gentle showstoppers that have robust easyVariants.
   
    If energyLevel or messTolerance or humourTone are "(not specified yet)":
    - Treat them as "medium" by default.
    - Avoid "bigger-20-plus" + "high" mess on school nights.
    - Still follow planIntensity for how many big nights you include.
    - Explain any big assumptions briefly in planOverview so parents know what to tweak.
    
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
- NoteFromElf should be included as a way to improve the magic or humor of the scene, or to explain or prvide clarity, or to give instructions. As appropriate sense for the scene. 

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
              You are Merry doing a STRICT QUALITY CHECK on a 24-morning Elf plan you already wrote.

              Your job:
              - Compare the plan against the family brief and profile.
              - Only change nights that clearly clash with the family’s stated or strongly implied preferences.
              
              You MUST flag and replace nights if you see any of these problems:
              
              1) INTENSITY MISMATCH
              - Brief/notes say big, extravagant, viral, over-the-top, "we don’t mind effort":
                - Replace some small, forgettable nights so that there are at least 6–8 clearly stand-out, showstopper setups with "weekend-project" or "bigger-20-plus" effort.
              - Brief/notes say calm, easy, low-pressure, exhausted:
                - Replace nights that are "bigger-20-plus" or "high" mess on school nights, or more than 3–4 big nights overall.
              
              2) MESS / ENERGY / HUMOUR VIOLATIONS
              - Any night whose messLevel or effortLevel is obviously above their messTolerance or energyLevel without offering a believable easyVariant.
              - Any humour that conflicts with humourTone (e.g. toilet jokes when they want clean-only).
              
              3) BORING OR REPEATED NIGHTS
              - Nights that repeat the same joke or setup structure without a strong twist.
              - Nights that don’t use the child’s interests, siblings, pets, or elf personality at all.
              
              4) LOST PERSONALITY
              - NoteFromElf that doesn’t sound like the described elf (too generic, wrong tone).
              - Nights that ignore a big theme from the brief (e.g. “princesses” or “dinosaur obsessions”).
              
              For each replacement:
              - Keep the same dayNumber and calendar constraints.
              - Fix the problem while still respecting all safety and family preferences.
              
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
