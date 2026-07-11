-- =============================================================================
-- Migration 002 — Enhanced Project Management Tables
-- TaskLynx
-- =============================================================================
-- Adds: sprints, milestones, task_dependencies, project_metadata,
--        research_sessions, and extends tasks with hierarchy/sprint/progress.
-- All statements are idempotent (IF NOT EXISTS / IF NOT EXISTS).
-- =============================================================================

-- =============================================================================
-- SPRINTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS sprints (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    goal            TEXT,
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    created_by      UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(project_id, status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);

-- =============================================================================
-- MILESTONES
-- =============================================================================

CREATE TABLE IF NOT EXISTS milestones (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    due_date        TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
    created_by      UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due ON milestones(due_date) WHERE status != 'completed';

-- =============================================================================
-- TASK DEPENDENCIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    predecessor_id  UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS'
                    CHECK (dependency_type IN ('FS', 'FF', 'SS', 'SF')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (predecessor_id, successor_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_predecessor ON task_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_successor ON task_dependencies(successor_id);

-- =============================================================================
-- PROJECT METADATA (key-value per project)
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_metadata (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    meta_key        VARCHAR(100) NOT NULL,
    meta_value      TEXT        NOT NULL DEFAULT '',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, meta_key)
);

CREATE INDEX IF NOT EXISTS idx_project_metadata_project ON project_metadata(project_id);

-- =============================================================================
-- RESEARCH SESSIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS research_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    context_json    JSONB       NOT NULL DEFAULT '{}',
    result_json     JSONB       NOT NULL DEFAULT '{}',
    model_used      VARCHAR(100),
    duration_ms     INTEGER,
    created_by      UUID        NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_task ON research_sessions(task_id, created_at DESC);

-- =============================================================================
-- EXTEND TASKS TABLE
-- =============================================================================
-- Safe column additions — IF NOT EXISTS prevents errors on re-run.

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'parent_task_id') THEN
        ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sprint_id') THEN
        ALTER TABLE tasks ADD COLUMN sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'milestone_id') THEN
        ALTER TABLE tasks ADD COLUMN milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'start_date') THEN
        ALTER TABLE tasks ADD COLUMN start_date TIMESTAMPTZ;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'progress') THEN
        ALTER TABLE tasks ADD COLUMN progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100);
    END IF;
END $$;

-- Indexes for new task columns
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date) WHERE start_date IS NOT NULL;

-- Triggers for updated_at on new tables
CREATE OR REPLACE TRIGGER trg_sprints_updated_at
    BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

\echo 'Migration 002 — Enhanced Project Management applied.'
