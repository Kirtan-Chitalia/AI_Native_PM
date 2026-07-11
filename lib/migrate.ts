// ─── lib/migrate.ts ───────────────────────────────────────────────────────────
// Lightweight idempotent migration runner for AI tables.
// Called once per process from AI route handlers via ensureAITables().
// Uses a module-level promise so the DDL runs at most once per server process,
// even if multiple requests arrive concurrently during cold start.

import { readFileSync } from 'fs'
import { join } from 'path'
import { query } from '@/lib/db'

let migrationPromise: Promise<void> | null = null

let cachedMigrationSql: string | null = null

function getMigrationSql(): string {
  if (!cachedMigrationSql) {
    cachedMigrationSql = readFileSync(join(process.cwd(), 'postgres', 'runtime_ai_migrations.sql'), 'utf8')
  }
  return cachedMigrationSql
}

const AI_TABLES_DDL = getMigrationSql()

async function runMigration(): Promise<void> {
  await query(AI_TABLES_DDL)
  console.log('[migrate] AI tables ensured.')
}

/**
 * Call this at the top of any AI route handler.
 * The first call runs the DDL; subsequent calls are no-ops (resolved promise).
 */
export async function ensureAITables(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runMigration().catch((err) => {
      // Reset so the next request retries rather than silently swallowing the error
      migrationPromise = null
      throw err
    })
  }
  return migrationPromise
}
