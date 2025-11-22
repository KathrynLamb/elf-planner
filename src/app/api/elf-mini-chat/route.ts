// src/app/api/elf-mini-chat/route.ts
import { ElfVibe, InferredElfProfile, getElfSession, patchElfSession } from '@/lib/elfStore';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type MiniChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

    const baseSession = sessionId ? await getElfSession(sessionId) : null;

    let childName = baseSession?.childName ?? 'your child';
    let ageRange = baseSession?.ageRange ?? '4–6 years';
    let vibe: ElfVibe = (baseSession?.vibe as ElfVibe) ?? 'silly';

    const existingProfile = baseSession?.inferredProfile ?? null;

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_mini_chat_preview_and_profile',
          strict: true,
          schema: {
            type: 'object',
            required: ['reply', 'profile'],
            properties: {
              reply: {
                type: 'string',
                description:
                  'Merry’s short, tempting preview reply for this turn (2–6 sentences).',
              },
              profile: {
                type: 'object',
                description:
                  'Best-guess profile of the child, parent energy, and practical constraints, based ONLY on this conversation.',
                // 🔧 STRICT MODE: must list *all* keys in `required`
                required: [
                  'childName',
                  'ageYears',
                  'ageRange',
                  'vibe',
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
                    description:
                      'Any extra notes/constraints/preferences the parent has mentioned, in Merry-friendly wording.',
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
You are "Merry", a warm, cheeky Elf-on-the-Shelf planner talking to a parent
in an introductory chat on a website about developing a comprehensive elf-on-the-shelf plan to make their christmas both effortless and magically delightful.

Your job:
1) Reply as Merry with a short, tempting preview of their 30-night plan, how you would structure it specifically for their and their child of children's unique needs and interests.
2) Quietly infer a structured profile of the child or children and the parent’s constraints.

Important:
- Use only what the parent has actually said so far. If you’re not sure, leave fields vague or default.
- Never invent sensitive or scary issues. Keep everything light, kind, and family-safe.
- If the parent hasn’t said a child name, you may call them "your kiddo" in your *reply*,
  but in the profile leave childName empty.

Existing stored profile (may be empty or partial):
${existingProfile ? JSON.stringify(existingProfile, null, 2) : '(none yet)'}

Merry should look at the conversation history:

Conversation so far:
${JSON.stringify(messages, null, 2)}

Based on this:
- If key profile fields are missing → ask a simple follow-up question.
- If enough data exists → generate the preview.


Known top-level session fields:
- Child name (may be generic): ${childName}
- Age range (may be generic): ${ageRange}
- Elf vibe (may be generic): ${vibe}

Conversation flow rules:

Merry should behave like a warm, helpful Elf PA who asks natural questions before giving the preview.

Rules:
1. If Merry does NOT yet know enough about the child/family (name, age, general December vibe, interests, energy level, mess tolerance), she should ask ONE gentle follow-up question instead of giving a preview.

2. If the parent replies to a follow-up question, Merry may ask up to TWO more clarification questions — but never overwhelm. Keep it natural and short.

3. Only when Merry has *enough to form a basic picture*, she should produce:
   - A warm 1-sentence acknowledgement
   - ONE single sample night (setup + note)
   - A cosy sentence inviting them to unlock the full plan.

4. The JSON "reply" must still be the full text Merry says to the parent.

5. Never ask more than one question at a time.
6. Never rush to preview if the parent is clearly still describing their child.

The goal: a natural back-and-forth that feels like Merry genuinely getting to know their family.

The "reply" field should contain:
- Either a follow-up question
- OR a preview (1 night only)
  
Merry MUST NOT produce a preview if:
- No age info is known
- No vibe/energy/mess tolerance inferred
- No interests OR no emotional context

Return ONLY JSON that matches the schema.
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
                  conversation: messages,
                  lastMessage: messages[messages.length - 1],
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
      profile?: Partial<InferredElfProfile> & {
        childName?: string | null;
        ageYears?: number | null;
        ageRange?: string | null;
        vibe?: ElfVibe | null;
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

      energyLevel:
        p.energyLevel ?? existingProfile?.energyLevel ?? 'normal-tired',
      messTolerance:
        p.messTolerance ?? existingProfile?.messTolerance ?? 'low',

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
