// src/lib/currentUser.ts
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { sessions, users } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function currentUser() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('auth_session_id')?.value;

    if (!sessionId) return null;

    const now = new Date();

    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          gt(sessions.expiresAt, now)
        )
      );

    if (!session) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
    };
  } catch (err) {
    console.error('[currentUser] error', err);
    return null;
  }
}

/**
 * Helper that guarantees authentication.
 * - If no user, throws an error (API routes can catch)
 * - Optionally you can redirect if used in a server component
 */
export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}
