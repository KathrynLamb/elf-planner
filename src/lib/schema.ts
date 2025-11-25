// src/lib/schema.ts
import { pgTable, uuid, text, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';

// USERS
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// MAGIC LINK TOKENS
export const loginTokens = pgTable('login_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

// LOGIN SESSIONS
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ELF SESSIONS (one per purchased plan / flow)
export const elfSessions = pgTable('elf_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // tie-back to checkout provider if you want
  paypalSessionId: text('paypal_session_id'),
  stripeSessionId: text('stripe_session_id'),

  paidAt: timestamp('paid_at', { withTimezone: true }),

  childName: text('child_name'),
  ageRange: text('age_range'),
  ageYears: text('age_years'),
  vibe: text('vibe'),
  startDate: text('start_date'),

  // inferred profile + plan as JSONB
  inferredProfile: jsonb('inferred_profile'),
  plan: jsonb('plan'),
  planGeneratedAt: timestamp('plan_generated_at', { withTimezone: true }),

  miniPreview: text('mini_preview'),
  introChatTranscript: jsonb('intro_chat_transcript'),
  hotlineTranscript: jsonb('hotline_transcript'),

  reminderEmail: text('reminder_email'),
  reminderTimezone: text('reminder_timezone'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
