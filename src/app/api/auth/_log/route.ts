import { NextResponse } from 'next/server';

export async function POST() {
  // Ignore whatever NextAuth is trying to log; just return 204.
  return new NextResponse(null, { status: 204 });
}
