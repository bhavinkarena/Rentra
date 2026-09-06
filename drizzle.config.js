import { defineConfig } from 'drizzle-kit';

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
