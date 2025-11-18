// src/app/api/elf-image/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getElfImageBase64 } from '@/lib/elfImageStore';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  const b64 = await getElfImageBase64(id);
  if (!b64) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = Buffer.from(b64, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
