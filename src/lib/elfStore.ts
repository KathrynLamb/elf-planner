// src/lib/elfStore.ts
import { Redis } from '@upstash/redis';

export const redis = Redis.fromEnv();

/* ----------------------- Basic types ----------------------- */

export type ElfVibe = 'silly' | 'kind' | 'calm';

export type HotlineTurn = {
  from: 'elf' | 'parent';
  text: string;
  at: number;
};

/**
 * Matches the structured plan JSON we ask the model for
 * in /api/generate-plan
 */




export type ElfPlanDay = {
  dayNumber: number;
  date: string;         // "YYYY-MM-DD"
  weekday: string;      // "Monday"
  title: string;
  description: string;  // how to set up
  noteFromElf?: string | null;
  imagePrompt: string;
  imageUrl?: string | null; // <-- filled lazily when we generate the image
};
export type ElfPlanObject = {
  planOverview: string;     // overall explanation of the month / arc
  days: ElfPlanDay[];
};


/* -------------------- Inferred profile --------------------- */

export type InferredElfProfile = {
  childName: string | null;
  ageYears: number | null;
  ageRange: string | null; // e.g. "4–6 years"
  vibe: ElfVibe | null;

  siblings: string[];
  pets: string[];
  interests: string[];

  energyLevel: 'exhausted' | 'normal-tired' | 'has-some-energy';
  messTolerance: 'very-low' | 'low' | 'medium' | 'high';

  bannedProps: string[];
  availableProps: string[];

  notesForElf: string;
};

/* ----------------------- Session record -------------------- */

export type ElfSessionRecord = {
  sessionId: string;

  childName: string | null;
  ageRange: string | null;
  ageYears: number | null;
  startDate: string | null; // YYYY-MM-DD or null
  vibe: ElfVibe | null;

  miniPreview: string | null;

  introChatTranscript: any[]; // mini-chat history
  hotlineTranscript: HotlineTurn[];

  inferredProfile: InferredElfProfile | null;

  plan: ElfPlanObject | null;
  planGeneratedAt: number | null;
  pdfUrl: string | null;

  userEmail: string | null;
  payerEmail: string | null;

    // NEW: reminder settings
    reminderEmail?: string | null;
    reminderTimezone?: string | null; // e.g. "Europe/London"
    reminderHourLocal?: number | null; // 7 = 7am local

  createdAt: number;
  updatedAt: number;
};

export type StoredElfPlan = {
  sessionId: string;

  childName?: string;
  ageRange?: string;
  startDate?: string;
  vibe?: ElfVibe;

  userEmail?: string | null;
  payerEmail?: string | null;

  miniPreview?: string | null;
  hotlineTranscript?: HotlineTurn[];

  introChatTranscript?: string | null;

  plan?: ElfPlanObject | null;
  planGeneratedAt?: number | null;

  pdfUrl?: string | null;

  // NEW
  reminderEmail?: string | null;
  reminderTimezone?: string | null;
  reminderHourLocal?: number | null;

  createdAt: number;
  updatedAt: number;
};

const REMINDER_SET_KEY = 'elf:reminder:sessions';


/* ---------------------- Redis helpers ---------------------- */

const sessionKey = (sessionId: string) => `elf:session:${sessionId}`;
const userIndexKey = (email: string) => `elf:user:${email.toLowerCase()}:sessions`;

// 🔐 Safe JSON helpers (handle strings, objects, legacy junk)
function safeParseArray(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeParseObject<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as T) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* --------------------- getElfSession ----------------------- */

export async function getElfSession(
  sessionId: string,
): Promise<ElfSessionRecord | null> {
  const data = await redis.hgetall<Record<string, string>>(sessionKey(sessionId));
  if (!data || Object.keys(data).length === 0) return null;

  const now = Date.now();

  const inferredProfile = safeParseObject<InferredElfProfile>(
    data.inferredProfile,
  );
  const plan = safeParseObject<ElfPlanObject>(data.plan);

  return {
    sessionId,

    childName: data.childName ?? null,
    ageRange: data.ageRange ?? null,
    ageYears: data.ageYears ? Number(data.ageYears) : null,
    startDate: data.startDate ?? null,
    vibe: (data.vibe as ElfVibe) ?? null,

    miniPreview: data.miniPreview ?? null,

    introChatTranscript: safeParseArray(data.introChatTranscript),
    hotlineTranscript: safeParseArray(data.hotlineTranscript) as HotlineTurn[],

    inferredProfile,

    plan,
    planGeneratedAt: data.planGeneratedAt ? Number(data.planGeneratedAt) : null,
    pdfUrl: data.pdfUrl ?? null,

    userEmail: data.userEmail ?? null,
    payerEmail: data.payerEmail ?? null,

    reminderEmail: data.reminderEmail ?? null,
    reminderTimezone: data.reminderTimezone ?? null,
    reminderHourLocal: data.reminderHourLocal
      ? Number(data.reminderHourLocal)
      : null,

    createdAt: data.createdAt ? Number(data.createdAt) : now,
    updatedAt: data.updatedAt ? Number(data.updatedAt) : now,
  };
}

/* -------------------- patchElfSession ---------------------- */

export async function patchElfSession(
  sessionId: string,
  patch: Partial<ElfSessionRecord>,
): Promise<ElfSessionRecord> {
  const now = Date.now();
  const existing = await getElfSession(sessionId);

  const merged: ElfSessionRecord = {
    sessionId,

    childName: existing?.childName ?? null,
    ageRange: existing?.ageRange ?? null,
    ageYears: existing?.ageYears ?? null,
    startDate: existing?.startDate ?? null,
    vibe: existing?.vibe ?? null,

    miniPreview: existing?.miniPreview ?? null,

    introChatTranscript: existing?.introChatTranscript ?? [],
    hotlineTranscript: existing?.hotlineTranscript ?? [],

    inferredProfile: existing?.inferredProfile ?? null,

    plan: existing?.plan ?? null,
    planGeneratedAt: existing?.planGeneratedAt ?? null,
    pdfUrl: existing?.pdfUrl ?? null,

    userEmail: existing?.userEmail ?? null,
    payerEmail: existing?.payerEmail ?? null,

    createdAt: existing?.createdAt ?? now,
    updatedAt: now,

    ...patch,
  };

  const toStore: Record<string, string> = {
    sessionId: merged.sessionId,
    childName: merged.childName ?? '',
    ageRange: merged.ageRange ?? '',
    ageYears: merged.ageYears != null ? String(merged.ageYears) : '',
    startDate: merged.startDate ?? '',
    vibe: merged.vibe ?? '',

    miniPreview: merged.miniPreview ?? '',

    introChatTranscript: JSON.stringify(merged.introChatTranscript ?? []),
    hotlineTranscript: JSON.stringify(merged.hotlineTranscript ?? []),

    inferredProfile: JSON.stringify(merged.inferredProfile),

    plan: JSON.stringify(merged.plan),
    planGeneratedAt:
      merged.planGeneratedAt != null ? String(merged.planGeneratedAt) : '',
    pdfUrl: merged.pdfUrl ?? '',

    userEmail: merged.userEmail ?? '',
    payerEmail: merged.payerEmail ?? '',

    createdAt: String(merged.createdAt),
    updatedAt: String(merged.updatedAt),
  };

  await redis.hset(sessionKey(sessionId), toStore);
  return merged;
}

/* ----------------- attachSessionToUser --------------------- */

export async function attachSessionToUser(email: string, sessionId: string) {
  await redis.sadd(userIndexKey(email), sessionId);
}
