// src/app/api/elf-mini-chat/route.ts
import {
  ElfVibe,
  InferredElfProfile,
  getElfSession,
  patchElfSession,
} from '@/lib/elfStore';
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
            required: ['reply', 'profile', 'done'],
            properties: {
              reply: {
                type: 'string',
                description:
                  'Merry’s short, cosy reply for this turn (2–6 sentences).',
              },
              done: {
                type: 'boolean',
                description:
                  'true only when Merry has asked about all key areas (age, feelings, interests, energy, mess tolerance, humour tone, elf history, props) and has enough info to brew the full 24-morning plan.',
              },
              profile: {
                type: 'object',
                description:
                  'Best-guess profile of the child, parent energy, humour tolerance, elf history, and practical constraints, based on the whole conversation so far.',
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
                  'humourTone',
                  'bannedProps',
                  'availableProps',
                  'notesForElf',
                  'hasExistingElf',
                  'existingElfName',
                  'existingElfPersonality',
                  'existingElfSetups',
                  'wantsHelpNamingElf',
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
                  // Humour boundaries
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
                  notesForElf: {
                    type: 'string',
                    description:
                      'Any extra notes/constraints/preferences the parent has mentioned, in Merry-friendly wording.',
                  },
                  // Elf history
                  hasExistingElf: {
                    type: 'boolean',
                    description:
                      'true if the family already has an elf tradition; false if they are brand new.',
                  },
                  existingElfName: {
                    type: 'string',
                    description:
                      'Name of the existing elf if there is one, otherwise empty string.',
                  },
                  existingElfPersonality: {
                    type: 'string',
                    description:
                      'Short description of the existing elf’s personality (e.g. “chaotic but kind, loves gentle pranks”).',
                  },
                  existingElfSetups: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                      'Simple descriptions of the kinds of setups they usually do with their existing elf.',
                  },
                  wantsHelpNamingElf: {
                    type: 'boolean',
                    description:
                      'true if they are new to Elf and would like help choosing a name/personality.',
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
You are Merry, a warm, gently funny Elf-on-the-Shelf planner chatting with a
tired parent on the homepage *before* they buy their 24-morning plan.

Your three jobs in this mini chat:

1) READ BETWEEN THE LINES
   - Infer what their kid(s) are like: age, temperament, confidence,
     sensitivities, sense of humour, siblings, interests.
   - Infer the parent's evening energy, mess tolerance, and HUMOUR BOUNDARIES:
       • "clean-only"  – cosy and clean, no toilet/gross jokes
       • "silly-toilet-ok" – light silly toilet humour is fine
       • "anything-goes" – they’re fine with cheekier jokes (still child-safe).
   - Find out their ELF HISTORY:
       • If they’ve had an elf before, gently ask:
           - the elf’s name,
           - what kind of personality it has,
           - the kinds of setups they usually do (big messy pranks, calm cosy
             notes, quick silly scenes, etc.).
       • If they are brand new to Elf-on-the-Shelf, offer to help them choose
         a name and personality vibe for their elf (e.g. very calm and kind,
         silly and chatty but gentle, chaotic but still kind).
   - Update the structured "profile" object with your best current guesses,
     including: hasExistingElf, existingElfName, existingElfPersonality,
     existingElfSetups, wantsHelpNamingElf.

2) REASSURE & ORIENT THE PARENT
   - Sound like a kind, competent PA for December.
   - Briefly hint at how you’ll structure their 24-morning plan (mix of low-effort
     nights, a few special ones, tuned to their energy/mess/humour tone and elf
     history).
   - Keep everything cosy, no guilt, no pressure.

3) ASK ONE CLEAR, SMALL QUESTION AT A TIME
   - Every reply should either:
       • ask ONE simple follow-up question, OR
       • (when you truly have enough info) say you’re ready to brew the full
         plan and set "done": true.
   - Prioritise filling gaps in:
       • age/ageRange
       • how they want mornings to *feel*
       • key interests (e.g. dinosaurs, crafts, football, drawing)
       • evening energy level
       • mess tolerance
       • humourTone
       • whether they already have an elf (and what it’s like) or are brand new
       • banned props / hard NOs
       • easy, available props at home (notes, stickers, toys, flour, tape, etc.).

MANDATORY CHECKLIST BEFORE YOU SET done:true:

You may ONLY set "done": true when ALL of the following are true:
  1. You know the child’s age or age range.
  2. You know at least one thing the child is into (interests).
  3. You know how the parent wants December mornings to *feel*
     (e.g. calm, silly, confidence-boosting, magical but low-pressure).
  4. You know the parent’s evening energy level (exhausted / normal-tired /
     has-some-energy).
  5. You know their mess tolerance (very-low / low / medium / high).
  6. You know their humourTone (clean-only / silly-toilet-ok / anything-goes).
  7. You know their elf history:
        - either hasExistingElf with name + personality + typical setups,
        - OR they are brand new and you’ve asked if they want help naming and
          choosing a personality.
  8. You have *either*:
        - at least one banned prop / hard NO (e.g. no flour, no food waste,
          no toilet-roll, no heights)
        - OR explicit confirmation that “nothing is really off limits”.
  9. You have at least 2–3 examples of available props or resources at home.

If ANY of these are missing, uncertain, or only guessed, you MUST:
  - set "done": false
  - ask ONE clear follow-up question about ONE of the missing areas.

Do NOT silently invent details just to mark things as complete. It’s fine if
some fields in the JSON profile remain vague or generic, but you should still
have *asked* about each area before setting done:true.

STYLE:
- Voice: cosy, light, emotionally intelligent, never snarky.
- Keep replies under ~130 words.
- 2–3 short paragraphs separated by blank lines.
- Use normal language, not survey speak.
- Never ask more than one question in a single reply.

PREVIEW vs QUESTIONS:
- While key profile fields are still missing, focus on gentle follow-up questions
  and small reflections. "done" must be false in this phase.
- Once you have a decent picture *and* the checklist is satisfied, you may:
   • briefly describe the kind of 24-night plan you’ll build (not all 24 nights),
   • give ONE sample night idea (max 2 sentences, no specific IPs),
   • invite them to unlock the full plan.
- When you reach that point, you should set "done": true.
- Even when "done" is true, the parent might still keep chatting; you can
  answer, but keep "done": true from then on.

PROFILE MERGE:
Existing stored profile for this session (may be empty/partial):
${existingProfile ? JSON.stringify(existingProfile, null, 2) : '(none yet)'}

Known top-level session fields:
- Child name (may be generic): ${childName}
- Age range (may be generic): ${ageRange}
- Elf vibe (may be generic): ${vibe}

Use the conversation so far plus any existing profile to refine your guesses.

Return JSON that matches the schema exactly.
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
      done?: boolean;
      profile?: Partial<InferredElfProfile> & {
        childName?: string | null;
        ageYears?: number | null;
        ageRange?: string | null;
        vibe?: ElfVibe | null;
        humourTone?: 'clean-only' | 'silly-toilet-ok' | 'anything-goes' | null;
        hasExistingElf?: boolean | null;
        existingElfName?: string | null;
        existingElfPersonality?: string | null;
        existingElfSetups?: string[] | null;
        wantsHelpNamingElf?: boolean | null;
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

      // Humour tone
      humourTone:
        (p as any).humourTone ??
        (existingProfile as any)?.humourTone ??
        'clean-only',

      bannedProps: p.bannedProps ?? existingProfile?.bannedProps ?? [],
      availableProps:
        p.availableProps ?? existingProfile?.availableProps ?? [],

      notesForElf: p.notesForElf ?? existingProfile?.notesForElf ?? '',

      // Elf history
      hasExistingElf:
        typeof p.hasExistingElf === 'boolean'
          ? p.hasExistingElf
          : (existingProfile as any)?.hasExistingElf ?? null,
      existingElfName:
        p.existingElfName ??
        (existingProfile as any)?.existingElfName ??
        null,
      existingElfPersonality:
        p.existingElfPersonality ??
        (existingProfile as any)?.existingElfPersonality ??
        null,
      existingElfSetups:
        p.existingElfSetups ??
        (existingProfile as any)?.existingElfSetups ??
        [],
      wantsHelpNamingElf:
        typeof p.wantsHelpNamingElf === 'boolean'
          ? p.wantsHelpNamingElf
          : (existingProfile as any)?.wantsHelpNamingElf ?? null,
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
      done: Boolean(parsed.done),
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
