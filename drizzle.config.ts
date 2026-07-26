import { defineConfig } from 'drizzle-kit'

// Used by `pnpm db:push` to sync lib/db/schema.ts directly to the database.
// The committed drizzle/schema.sql (via `pnpm db:setup`) is the simpler path
// for a first-time local setup; use push when iterating on the schema.
export default defineConfig({
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: 'snake_case',
})
