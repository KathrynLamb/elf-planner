import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id').primaryKey(),
  userId: varchar('user_id').references(() => users.id),
  expiresAt: timestamp('expires_at'),
});
