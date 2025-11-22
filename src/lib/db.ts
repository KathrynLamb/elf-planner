// src/lib/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';

const pool = new Pool({
  connectionString: process.env.POSTGRES_DATABASE_URL,
});

// Main db client you already import in routes
export const db = drizzle(pool, { schema });

// Re-export tables so existing imports keep working:
// import { db, loginTokens, sessions } from '@/lib/db';
export * from '@/db/schema';
