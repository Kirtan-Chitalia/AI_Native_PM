// ─── lib/migrate.ts ───────────────────────────────────────────────────────────
// Lightweight idempotent migration runner for AI tables.
// Called once per process from AI route handlers via ensureAITables().
// Uses a module-level promise so the DDL runs at most once per server process,
// even if multiple requests arrive concurrently during cold start.

import { query } from '@/lib/db'

let migrationPromise: Promise<void> | null = null

const AI_TABLES_DDL = `
-- prd_versions ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prd_versions (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version       INTEGER     NOT NULL CHECK (version > 0),
    content       TEXT        NOT NULL,
    is_current    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by    UUID        NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS prd_versions_current_idx
    ON prd_versions (project_id)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS prd_versions_project_id_idx
    ON prd_versions (project_id, created_at DESC);

-- ai_task_generations ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_task_generations (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    prd_version_id  UUID        REFERENCES prd_versions(id) ON DELETE SET NULL,
    version         INTEGER     NOT NULL CHECK (version > 0),
    tasks_json      JSONB       NOT NULL DEFAULT '[]',
    model_used      VARCHAR(100),
    duration_ms     INTEGER,
    created_by      UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, version)
);

CREATE INDEX IF NOT EXISTS ai_task_generations_project_id_idx
    ON ai_task_generations (project_id, created_at DESC);
`

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
