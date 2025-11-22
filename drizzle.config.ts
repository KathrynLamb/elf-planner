// drizzle.config.ts
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// ✅ Load env vars from .env.local for drizzle CLI commands
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // ✅ This must match the key you got from Vercel/Neon
    url: process.env.POSTGRES_DATABASE_URL!,
  },
});
