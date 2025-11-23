import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/currentUser';

export async function GET() {
  const user = await currentUser().catch(() => null);

  // Match the shape NextAuth expects enough that any leftover SessionProvider
  // doesn’t crash. You can keep this super lightweight.
  return NextResponse.json({
    user: user
      ? { email: user.email }
      : null,
    expires: null,
  });
}
