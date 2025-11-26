// src/lib/getChildrenNames.ts
import type { ElfSessionRecord, InferredElfProfile } from '@/lib/elfStore';

export function getChildrenNames(
  session: ElfSessionRecord,
): string[] {
  const profile: InferredElfProfile | null = session.inferredProfile;

  // If we ever add a dedicated childrenNames field in future,
  // we can prefer it here. For now, derive from childName + siblings.
  const primary = profile?.childName || session.childName || '';
  const siblings = profile?.siblings ?? [];

  return [primary, ...siblings]
    .map((n) => (n || '').trim())
    .filter(Boolean);
}
