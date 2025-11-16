import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get('sessionId')?.toString();
    const audio = formData.get('audio') as File | null;

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId.' },
        { status: 400 },
      );
    }

    if (!audio) {
      return NextResponse.json(
        { message: 'Missing audio file.' },
        { status: 400 },
      );
    }

    // 1) Transcribe the audio
    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: audio as any, // Node SDK accepts File/Blob here in App Router
      // language: 'en', // optional but recommended
    });

    const text = (transcription.text || '').trim();
    if (!text) {
      return NextResponse.json(
        { message: 'Could not understand what you said. Please try again.' },
        { status: 400 },
      );
    }

    // 2) Call existing elf-hotline endpoint with transcript
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/elf-hotline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: text,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || 'Error talking to Merry.');
    }

    const data = await res.json();

    // Return transcript + usual hotline payload
    return NextResponse.json({
      transcript: text,
      reply: data.reply,
      done: data.done,
    });
  } catch (err: any) {
    console.error('[elf-hotline-voice] error', err);
    return NextResponse.json(
      {
        message:
          err?.message || 'Something went wrong with the Elf hotline voice call.',
      },
      { status: 500 },
    );
  }
}
