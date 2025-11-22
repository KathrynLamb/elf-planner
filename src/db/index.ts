// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.POSTGRES_DATABASE_URL) {
  throw new Error('POSTGRES_DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Re-export tables for convenience
export * from './schema';
