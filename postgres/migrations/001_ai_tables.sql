-- =============================================================================
-- Migration 001 — AI Tables
-- AI-Native PM Platform
-- =============================================================================
-- Apply with:
--   docker-compose exec db psql -U pmadmin -d pmplatform -f /migrations/001_ai_tables.sql
-- Or directly:
--   psql "$DATABASE_URL" -f postgres/migrations/001_ai_tables.sql
-- =============================================================================

-- =============================================================================
-- PRD VERSION HISTORY
-- =============================================================================
-- Stores every generated / edited version of a project's PRD.
-- Only one row per project can have is_current = TRUE (enforced by partial index).

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

-- Ensures at most one "current" PRD per project at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS prd_versions_current_idx
    ON prd_versions (project_id)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS prd_versions_project_id_idx
    ON prd_versions (project_id, created_at DESC);

-- =============================================================================
-- AI TASK GENERATION RUNS
-- =============================================================================
-- Each POST to /api/projects/[id]/ai-tasks creates one row here.
-- Tasks are stored as JSONB so the schema is flexible and does not pollute
-- the real `tasks` table. PMs can selectively import tasks using the UI.

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
