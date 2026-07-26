// Creates all FleetCare tables in the database pointed to by DATABASE_URL.
// Runs drizzle/schema.sql via the pg driver, so no `psql` install is required.
//
// Usage:
//   DATABASE_URL="postgres://user:pass@localhost:5432/fleetcare" node scripts/db-setup.mjs
//   (or simply `pnpm db:setup` after setting DATABASE_URL in .env)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

// Load .env / .env.local if present (optional; ignored if dotenv isn't installed).
try {
  const { config } = await import('dotenv')
  config({ path: '.env.local' })
  config({ path: '.env' })
} catch {
  // dotenv not available — rely on the ambient environment.
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('[db-setup] DATABASE_URL is not set. Aborting.')
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = join(__dirname, '..', 'drizzle', 'schema.sql')
const sql = readFileSync(sqlPath, 'utf8')

const pool = new pg.Pool({ connectionString })

try {
  console.log('[db-setup] Applying drizzle/schema.sql ...')
  await pool.query(sql)
  console.log('[db-setup] Done. All tables are ready.')
  console.log('[db-setup] Start the app with `pnpm dev` — demo data seeds automatically.')
} catch (err) {
  console.error('[db-setup] Failed to apply schema:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
