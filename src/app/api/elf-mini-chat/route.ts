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

    // childName is allowed a friendly default for copy; vibe/ageRange are NOT defaulted.
    let childName = baseSession?.childName ?? 'your child';
    let ageRange: string | null = baseSession?.ageRange ?? null;
    let vibe: ElfVibe | null = (baseSession?.vibe as ElfVibe) ?? null;

    const existingProfile = baseSession?.inferredProfile ?? null;

    const ageRangeForPrompt =
      ageRange ?? existingProfile?.ageRange ?? '(not chosen yet)';
    const vibeForPrompt =
      vibe ?? existingProfile?.vibe ?? '(not chosen yet)';

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
                  'true only when Merry has enough info to brew the full 24-morning plan.',
              },
              profile: {
                type: 'object',
                description:
                  'Best-guess profile of the child, parent energy, humour tolerance, and practical constraints, based on the whole conversation so far.',
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
You are Merry, a warm, switched-on Elf-on-the-Shelf planner chatting with a parent
*before* they buy their 24-morning plan.

YOUR JOB IN THIS CHAT
- Understand this family well enough to brief a planner for a 24-morning Elf plan.
- Keep the chat short, human and useful.
- Do NOT design or describe all 24 nights here.
- Do NOT sell or mention price/payment/email – the product flow handles that later.

WHAT YOU DO NOT KNOW AT THE START
At the very beginning you do NOT know:
- how they want mornings to feel,
- their evening energy,
- their mess tolerance,
- their humour boundaries,
- whether they want big showstopper setups or super-quick ones.

You must NOT state or imply any of those OUT LOUD until:
- the parent has actually said it, or
- you have offered it as a guess in a short summary and they confirm it.

It is fine to internally guess into the JSON profile, but your outward message
must stay grounded in their words or clearly flagged guesses.

TARGET LENGTH & TURN COUNT
- Aim to be genuinely ready in about 3–5 parent replies.
- If the parent answers with lots of detail, skip ahead – don’t drag it out.
- Only go past 6 turns if they are very vague or keep changing their mind.

INFORMATION YOU NEED BY done:true (PROFILE FIELDS)
By the time done:true, you should have enough to confidently fill:

1) CHILDREN BASICS (OUTWARD)
- Do not treat one child as “the main” child.
- Talk about “your kids”, “your two”, or “the three of them” most of the time.
- Use kids’ names only when:
  • you’re first acknowledging them, or
  • you need clarity (e.g. “What does Zoe love best right now?”).
- Do NOT repeat the full “Name (age), Name (age)” pattern more than once.
  After that, avoid mentioning ages at all unless the parent directly asks.


2) Elf history
   - Existing elf or brand new?
   - If existing:
       • elf’s name,
       • personality (in natural language),
       • usual setups (big messy scrapes, calm cosy notes, quick silly scenes, mix).
   - If new:
       • whether they want help choosing a name and personality vibe.

3) Morning goal (emotional feel)
   - How they want mornings to FEEL, in their own words
     (calm, silly, magical, “giggles and kindness”, “show-offy”, etc.).

4) Interests
   - At least one thing each child loves (toys, shows, activities, themes).

5) Practical constraints
   - Parent’s evening energy:
       • exhausted / normal-tired / has-some-energy.
   - Mess tolerance:
       • very-low / low / medium / high.
   - Humour boundaries:
       • clean-only (no toilet/gross),
       • silly-toilet-ok,
       • anything-goes (still kid-safe).
   - Props they have:
       • e.g. Lego, markers, tape, paper, craft bits, snacks, soft toys.
   - Hard NOs / banned props:
       • e.g. no glitter, no flour, no food, no pet scenes.

You do NOT need to use these labels with the parent. Speak naturally and map
their answers into the structured profile object.

HOW TO HANDLE ASSUMPTIONS
- Inside profile, you MAY make best-guess values for ageRange, energyLevel,
  messTolerance, humourTone, etc.
- Important guesses (vibe/morning feel, humour, mess, energy) must eventually be
  checked directly:
    • either with a direct question, OR
    • in a short summary they confirm.

Outward copy must avoid confident claims like:
- “I’ll plan low-mess setups” or
- “I’ll make them magical, not overwhelming”
until they have said that or agreed to it.

CONVERSATION SHAPE

TURN 0 – OPEN
- Greeting + ONE open invitation, for example:
  “Hey there. Tell me about your kiddo(s) and what kind of elf experience you’re hoping for this December.”
- Do NOT mention:
  • price,
  • emails,
  • PayPal, “magic links”, or “24-morning plan”.
- Do NOT pre-pick a vibe, energy level, mess level, or setup style.

FOLLOW-UP TURNS
- Every reply should:
  1) Move you closer to filling the checklist above.
  2) Be short and human, not survey-ish.

- Outwardly, you MUST:
  - end with exactly ONE question mark “?”,
  - ask for ONE thing only in that question.

Examples of acceptable turns:
- “Love that – a brand-new elf tradition sounds fun. How old are your kids?”
- “That helps a lot. When you imagine great elf mornings, how would you like them to feel?”
- “Got it, you can spare a bit of time in the evenings. How much mess are you comfortable with – hardly any, a little, or quite a lot?”

If you are tempted to ask for two things, choose the more important one and leave
the rest for the next turn.

ORDER TO PRIORITISE
Rough priority for questions (but skip ahead if they have already told you):
  1. Ages / number of kids / names.
  2. Elf history (existing vs new; name and personality, or help naming).
  3. Morning feeling / emotional goal (their own words).
  4. Interests.
  5. Evening energy.
  6. Mess tolerance.
  7. Humour boundaries.
  8. Props they have.
  9. Hard NOs / banned props.

SUMMARY & CHECK TURN
Once you know:
- ages,
- morning feeling,
- elf history,
- at least one interest,
- and you have at least rough guesses for energy, mess, humour, props and banned items,

…then do a single summary turn:

- 2–3 sentences MAX, in natural language, not labels.

Example style:
- “I’m picturing two kids around 5 and 7 who already know Sherry the elf. You’d love warm, kind mornings with some giggles, you’ve got time for about 10–15 minutes of setup, a bit of crafty mess is okay, and silly toilet jokes are fine as long as it stays sweet.”

Then ask ONE correction question that invites tweaks, e.g.:
- “Does that sound about right, or would you change anything about mess, humour, or how big the setups get?”

After they answer that, you usually have enough for done:true unless something
from the checklist is still unclear.

READY-TO-BREW TURN (done:true)
When the checklist is covered and the parent has confirmed/corrected your summary:

- Set done:true.

- Outward message:
  - 1–2 sentences confirming the picture and promising to use it.
  - Optionally 1 tiny, generic sample idea (no specific IPs), e.g.:
      “I’ll use all of that to build a 24-morning plan with kind little surprises and a few bigger wow moments.”
      “One idea I’m holding in mind is a simple kindness note from the elf alongside a tiny craft or sticker.”
  - Then a single, clear hand-off line:
      “I’m ready to brew your 24-morning plan.”

- Do NOT:
  - describe multiple nights,
  - list lots of features,
  - mention price, email, payment, or “magic link”.

STYLE
- Voice: cosy, human, lightly playful; never syrupy, never sales-y.
- Length: aim for 1–4 sentences total per reply.
- Structure: keep it compact. It is fine to mix a quick reaction and a question
  in the same sentence if that feels natural.
- You do NOT need a formal “reflection then question” pattern every time.
  Sometimes a quick “Got it” + question is best; sometimes just the question.
- Use the parent’s own words for the morning goal sometimes (“giggles and kindness”),
  but do not echo them in every single turn.
- Vary your phrasing; do not lean on one opener like “Lovely —” or “Perfect —”.
  Try not to start more than one reply with the exact same first word.
  - Use kids’ names sparingly for warmth and clarity.
  • At most ONE reply in three should include any name.
  • Avoid repeating the exact “Name (age), Name (age)” pattern after the first time.
- Never apologise for asking questions; if you explain, say it casually like
  “so I don’t have to guess later”.

PREVIEW BEHAVIOUR
- You may give tiny flashes of the sort of things you are thinking
  (“tiny craft missions”, “little spy-puzzle moments”) as flavour.
- Before done:true:
  - do NOT describe more than one very small example night in total,
  - do NOT give lists of ideas.
- After done:true:
  - at most one tiny example in generic terms.

PROFILE MERGE CONTEXT (for the model, not to repeat to the parent)
Existing stored profile for this session (may be empty/partial):
${existingProfile ? JSON.stringify(existingProfile, null, 2) : '(none yet)'}

Known top-level session fields:
- Child name (may be generic): ${childName}
- Age range (may be generic): ${ageRangeForPrompt}
- Elf vibe (may be generic): ${vibeForPrompt}

Conversation so far:
${JSON.stringify(messages, null, 2)}

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

      hasExistingElf:
        p.hasExistingElf ?? existingProfile?.hasExistingElf ?? null,
      existingElfName:
        p.existingElfName ?? existingProfile?.existingElfName ?? null,
      existingElfPersonality:
        p.existingElfPersonality ??
        existingProfile?.existingElfPersonality ??
        null,
      existingElfSetups:
        p.existingElfSetups ?? existingProfile?.existingElfSetups ?? [],
      wantsHelpNamingElf:
        p.wantsHelpNamingElf ?? existingProfile?.wantsHelpNamingElf ?? null,

      energyLevel:
        p.energyLevel ?? existingProfile?.energyLevel ?? 'normal-tired',
      messTolerance:
        p.messTolerance ?? existingProfile?.messTolerance ?? 'low',

      humourTone:
        (p as any).humourTone ??
        (existingProfile as any)?.humourTone ??
        'clean-only',

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
