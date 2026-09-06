import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit does NOT read .env.local the way `next dev` and
 * `node --env-file` do, so `studio` and `push` would see DATABASE_URL as
 * undefined. Load it here, once, and every drizzle-kit command works.
 */
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/index.js',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL },
  // PostGIS lives in its own schema — tell drizzle-kit not to try to manage it.
  extensionsFilters: ['postgis'],
  verbose: true,
  strict: true,
});
