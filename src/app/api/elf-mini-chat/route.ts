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

const SYSTEM_PROMPT = `
You are Merry the Elf, a warm, switched-on Elf-on-the-Shelf planner
chatting with a tired parent *before* they buy their 24-night plan.

Your single job right now:
- Have a quick, cosy DM-style chat to understand **exactly** what kind of Elf month they want.
- You are NOT designing the 24 nights yet – just getting the brief.

What you want to learn (lightly, in conversation):
- Their kid(s): ages, rough personalities, any siblings / pets.
- What December mornings should feel like in their words (calm, silly, epic, low-pressure, etc).
- What they realistically have energy for most evenings.
- How they feel about mess, chaos and jokes (clean-only vs silly vs anything-goes).
- Big themes or obsessions (shows, games, activities, aesthetics).
- Any hard no’s (banned props, fears, topics, or jokes).
- Any dreams (photo-worthy moments, “Pinterest but lazy”, very low-key, etc).

Style:
- 1–4 short sentences per reply.
- Friendly, human, a bit sparkly – never interrogating, never salesy.
- Most turns end with **one** clear question, exactly one "?".
- Ask only what you genuinely still need – if you know something, don’t ask again.
- If a parent answers multiple things at once, acknowledge and build on that.

Endgame:
- When you feel you understand their dream Elf month, stop asking new questions.
- Instead, **summarise their brief back to them** in their own words (1–3 short paragraphs),
  and end with a gentle check like: “Have I got that right, or is there anything you’d tweak?”.

Output:
Return plain text only – just what Merry says next in the chat.
`.trim();



export async function POST(req: NextRequest) {
  try {
    const { sessionId, messages } = (await req.json()) as {
      sessionId?: string;
      messages?: MiniChatMessage[];
    };

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId.' },
        { status: 400 },
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { message: 'Missing messages array.' },
        { status: 400 },
      );
    }

    const baseSession = await getElfSession(sessionId);

    // keep history reasonably short but not tiny
    const MAX_TURNS = 16;
    const trimmed =
      messages.length > MAX_TURNS
        ? messages.slice(messages.length - MAX_TURNS)
        : messages;

    const conversationInputs = trimmed.map((m) => ({
      role: m.role,
      content: [
        {
          type: m.role === 'assistant' ? 'output_text' : 'input_text',
          text: m.content,
        },
      ],
    }));

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      max_output_tokens: 220,
      text: {
        format: {
          type: 'json_schema',
          name: 'elf_mini_chat_reply_only',
          strict: true,
          schema: {
            type: 'object',
            required: ['reply'],
            additionalProperties: false,
            properties: {
              reply: {
                type: 'string',
                description: 'Merry’s next chat message.',
              },
            },
          },
        },
      },
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        } as any,
        ...conversationInputs,
      ] as any,
    });

    const rawText = response.output_text;
    if (!rawText) throw new Error('Empty response from model');

    const parsed = JSON.parse(rawText) as { reply: string };

    // Append to intro transcript for later summarisation
    const introChatTranscript = [
      ...(baseSession?.introChatTranscript ?? []),
      {
        at: Date.now(),
        messages,
        reply: parsed.reply,
      },
    ];

    await patchElfSession(sessionId, {
      miniPreview: parsed.reply,
      introChatTranscript,
      // inferredProfile is now generated later, not here
    });

    return NextResponse.json({ reply: parsed.reply });
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
