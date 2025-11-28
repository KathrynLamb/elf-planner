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
  InferredElfProfile,
} from '@/lib/elfStore';
import { currentUser } from '@/lib/currentUser';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Local copy of the mini-chat message shape used in introChatTranscript
type MiniChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

    // Start with any stored inferred profile
    let profile: InferredElfProfile | null = storedSession.inferredProfile;

    // If we don't have a structured profile yet, infer one from the chat transcript
    if (!profile) {
      const transcript = storedSession.introChatTranscript ?? [];

      const flatHistory = transcript
        .flatMap((t: any) => {
          const msgs: MiniChatMessage[] = Array.isArray(t.messages)
            ? t.messages
            : [];
          return [
            ...msgs.map((m) => `${m.role}: ${m.content}`),
            `assistant: ${t.reply}`,
          ];
        })
        .join('\n');

      const summaryResp = await client.responses.create({
        model: 'gpt-4o-mini',
        max_output_tokens: 300,
        text: {
          format: {
            type: 'json_schema',
            name: 'elf_profile_from_chat',
            strict: true,
            schema: {
              type: 'object',
              required: ['profile', 'planNotes'],
              additionalProperties: false,
              properties: {
                profile: {
                  type: 'object',
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
                    vibe: { type: 'string', enum: ['silly', 'kind', 'calm'] },
                    siblings: { type: 'array', items: { type: 'string' } },
                    pets: { type: 'array', items: { type: 'string' } },
                    interests: { type: 'array', items: { type: 'string' } },
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
                    notesForElf: { type: 'string' },
                  },
                },
                planNotes: {
                  type: 'string',
                  description:
                    'Free-text summary of what this parent wants December to feel like, to feed into plan generation.',
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
You are Merry summarising a chat with a parent about their dream Elf plan.
Infer a sensible profile and a narrative summary of what they want.
If something was never mentioned, make a gentle, middle-of-the-road guess.
Do NOT ask questions, just infer. 
`.trim(),
              },
            ],
          } as any,
          {
            role: 'user',
            content: [{ type: 'input_text', text: flatHistory }],
          } as any,
        ],
      });

      const summaryRaw = summaryResp.output_text;
      if (!summaryRaw) throw new Error('Empty profile summary from model');

      const summaryParsed = JSON.parse(summaryRaw) as {
        profile: InferredElfProfile;
        planNotes: string;
      };

      profile = summaryParsed.profile;

      // store for later reuse
      await patchElfSession(sessionId, {
        inferredProfile: profile,
        miniPreview: summaryParsed.planNotes,
      });
    }

    // 🔒 Hard guard for TS + runtime: from here, profile must exist
    if (!profile) {
      return NextResponse.json(
        {
          message:
            'Merry could not infer a clear Elf profile from your chat. Please tell her a bit more about your kiddo(s) and try again.',
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
      allChildNames.length === 0 ? 'unnamed kid(s)' : allChildNames.join(', ');

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

    let planIntensity: 'balanced' | 'go-big-wow' | 'low-key-cosy' = 'balanced';
    if (morningGoal.match(/viral|over the top|extravagant|huge|big set.?ups/i)) {
      planIntensity = 'go-big-wow';
    } else if (
      morningGoal.match(/calm|low[- ]pressure|gentle|simple/i)
    ) {
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
- Known previous setups: ${
      (profile.existingElfSetups ?? []).join(', ') || 'none'
    }

- Banned props/themes: ${
      (profile.bannedProps ?? []).join(', ') || 'none'
    }
- Props available: ${
      (profile.availableProps ?? []).join(', ') || 'standard home stuff'
    }
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
                      description: 'Short, fun name for tonight’s setup.',
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

[system prompt content unchanged...]
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

[critic system prompt unchanged...]
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
