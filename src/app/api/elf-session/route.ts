// src/app/api/elf-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

type ElfVibe = 'silly' | 'kind' | 'calm';

type ElfSession = {
  sessionId: string;
  childName: string;
  ageRange: string;
  startDate: string;
  vibe: ElfVibe;
  amount: number;
  currency: string;
  createdAt: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { message: 'Missing sessionId' },
      { status: 400 },
    );
  }

  try {
    const session = await redis.get<ElfSession>(`elf-session:${sessionId}`);

    if (!session) {
      return NextResponse.json(
        { message: 'Session not found or expired' },
        { status: 404 },
      );
    }

    return NextResponse.json({ session });
  } catch (err: any) {
    console.error('[elf-session] error', err);
    return NextResponse.json(
      { message: err.message || 'Error loading session' },
      { status: 500 },
    );
  }
}
