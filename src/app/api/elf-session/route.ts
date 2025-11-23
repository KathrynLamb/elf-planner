// src/app/api/elf-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import { getElfSession, ElfSessionRecord } from '@/lib/elfStore';
import { ElfSessionRecord, getElfSession } from '@/lib/elfStore';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { message: 'Missing sessionId' },
      { status: 400 },
    );
  }

  // 1) Try new hash-based storage (typed)
  let session: ElfSessionRecord | null = (await getElfSession(
    sessionId,
  )) as ElfSessionRecord | null;

  // 2) Fallback: legacy JSON key `elf-session:${sessionId}`
// 2) Fallback: legacy JSON key `elf-session:${sessionId}`
if (!session) {
  const legacy = await redis.get<{
    childName?: string;
    ageRange?: string;
    startDate?: string;
    vibe?: 'silly' | 'kind' | 'calm';
    miniPreview?: string | null;
  }>(`elf-session:${sessionId}`);

  if (legacy) {
    const now = Date.now();

    session = {
      sessionId,

      // core child/session fields
      childName: legacy.childName ?? null,
      ageRange: legacy.ageRange ?? null,
      ageYears: null,
      startDate: legacy.startDate ?? null,
      vibe: legacy.vibe ?? null,

      // preview
      miniPreview: legacy.miniPreview ?? null,

      // transcripts (legacy had none)
      introChatTranscript: [],
      hotlineTranscript: [],

      // inferred profile (new system only)
      inferredProfile: null,

      // plan & outputs
      plan: null,
      planGeneratedAt: null,
      pdfUrl: null,

      // new field — default null
      planCommittedAt: null,

      // emails
      userEmail: null,
      payerEmail: null,

      createdAt: now,
      updatedAt: now,
    };
  }
}


  if (!session) {
    console.warn('[elf-session API] no session found for', sessionId);
    return NextResponse.json(
      { message: 'Session not found' },
      { status: 404 },
    );
  }

  console.log('[elf-session API] full stored session:', session);

  return NextResponse.json({ session });
}
