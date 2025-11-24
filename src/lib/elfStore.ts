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

/* ------------ Rich plan types used across the app ---------- */

export type NightType =
  | 'hijinks'           // elf caught in silly scene
  | 'quick-morning'     // 2–5 min morning interaction
  | 'weekend-project'   // bigger setup / activity
  | 'emotional-support' // feelings, worries, confidence
  | 'event-or-tradition'; // birthdays, school events, cultural/religious days

export type EffortLevel =
  | 'micro-2-min'
  | 'short-5-min'
  | 'medium-10-min'
  | 'bigger-20-plus';

export type MessLevel = 'none' | 'low' | 'medium' | 'high';

// src/lib/elfStore.ts

export type ElfPlanStatus = 'draft' | 'final';




export type ElfPlanDay = {
  dayNumber: number;
  date: string;    // "YYYY-MM-DD"
  weekday: string; // "Monday"

  title: string;
  description: string; // what the parent sets up at night

  noteFromElf?: string | null;

  imagePrompt: string;
  imageUrl?: string | null; // filled lazily when we generate the image

  // Rich metadata for emails / UI / filters
  morningMoment?: string | null;
  easyVariant?: string | null;
  materials?: string[];

  nightType?: NightType;
  effortLevel?: EffortLevel;
  messLevel?: MessLevel;

  tags?: string[];
  emailSubject?: string | null;
  emailPreview?: string | null;
};

export type ElfPlanObject = {
  /** A cosy overview paragraph or two explaining the month’s arc. */
  planOverview: string;

  /** Optional notes to the parent (global tips, safety notes, etc.). */
  parentNotes?: string | null;

  days: ElfPlanDay[];

  /** Is this still being tweaked, or signed off and ready for emails? */
  status?: ElfPlanStatus;

  /** Increment each time we regenerate the whole plan. */
  version?: number;

  /** Timestamp when the parent approved the plan (for final only). */
  approvedAt?: number | null;
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
  humourTone: string;
  notesForElf: string;
};

/* ----------------------- Session record -------------------- */

export type ElfSessionRecord = {
  sessionId: string;

  childName: string | null;
  ageRange: string | null;
  ageYears: number | null;
  startDate: string | null;
  vibe: ElfVibe | null;

  miniPreview: string | null;

  introChatTranscript: any[];
  hotlineTranscript: HotlineTurn[];

  inferredProfile: InferredElfProfile | null;

  plan: ElfPlanObject | null;
  planGeneratedAt: number | null;
  pdfUrl: string | null;

  userEmail: string | null;
  payerEmail: string | null;

  // NEW
  planCommittedAt: number | null;

  // reminder settings
  reminderEmail?: string | null;
  reminderTimezone?: string | null;
  reminderHourLocal?: number | null;

  createdAt: number;
  updatedAt: number;
};


/**
 * Lightweight shape we return from /api/elf-session for the Success page UI.
 * All fields are optional except the IDs + timestamps.
 */
export type StoredElfPlan = {
  sessionId: string;

  childName?: string;
  ageRange?: string;
  startDate?: string;
  vibe?: ElfVibe;

  userEmail?: string | null;
  payerEmail?: string | null;

  miniPreview?: string | null;

  introChatTranscript?: any;
  hotlineTranscript?: any;

  plan?: ElfPlanObject | null;
  planGeneratedAt?: number | null;

  pdfUrl?: string | null;

  // NEW
  planCommittedAt?: number | null;

  reminderEmail?: string | null;
  reminderTimezone?: string | null;
  reminderHourLocal?: number | null;

  createdAt: number;
  updatedAt: number;
};


export const REMINDER_SET_KEY = 'elf:reminder:sessions';

/* ---------------------- Redis helpers ---------------------- */

const sessionKey = (sessionId: string) => `elf:session:${sessionId}`;
const userIndexKey = (email: string) =>
  `elf:user:${email.toLowerCase()}:sessions`;

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
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as T)
        : null;
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

    // NEW
    planCommittedAt: data.planCommittedAt ? Number(data.planCommittedAt) : null,

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

    // NEW
    planCommittedAt: existing?.planCommittedAt ?? null,

    reminderEmail: existing?.reminderEmail ?? null,
    reminderTimezone: existing?.reminderTimezone ?? null,
    reminderHourLocal: existing?.reminderHourLocal ?? null,

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

    // NEW
    planCommittedAt:
      merged.planCommittedAt != null ? String(merged.planCommittedAt) : '',

    reminderEmail: merged.reminderEmail ?? '',
    reminderTimezone: merged.reminderTimezone ?? '',
    reminderHourLocal:
      merged.reminderHourLocal != null ? String(merged.reminderHourLocal) : '',

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
