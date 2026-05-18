-- Phase 6: learning paths.
-- A learning_path is a curated, ordered bundle of courses (e.g.
-- "New Hire Onboarding" = Course A + B + C). HR can assign a path to
-- learners; assignment creates an underlying enrollment for each course
-- in the path AND a learning_path_assignment row for path-level rollup.

CREATE TABLE learning_path (
    id            UUID PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    summary       VARCHAR(280),
    cover_color   VARCHAR(7),
    tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
    status        VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at  TIMESTAMPTZ
);

CREATE INDEX idx_learning_path_status ON learning_path(status);
CREATE INDEX idx_learning_path_tags ON learning_path USING GIN (tags jsonb_path_ops);

CREATE TABLE learning_path_course (
    id          UUID PRIMARY KEY,
    path_id     UUID NOT NULL REFERENCES learning_path(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    position    INT NOT NULL,
    required    BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_path_course_position UNIQUE (path_id, position),
    CONSTRAINT uk_path_course UNIQUE (path_id, course_id)
);

CREATE INDEX idx_lpc_course ON learning_path_course(course_id);

CREATE TABLE learning_path_assignment (
    id                 UUID PRIMARY KEY,
    path_id            UUID NOT NULL REFERENCES learning_path(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL,
    user_email         VARCHAR(255) NOT NULL,
    user_name          VARCHAR(255),
    manager_email      VARCHAR(255),
    department         VARCHAR(128),
    status             VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
    mandatory          BOOLEAN     NOT NULL DEFAULT FALSE,
    assigned_by_email  VARCHAR(255),
    assigned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at             TIMESTAMPTZ,
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    progress_pct       INT         NOT NULL DEFAULT 0,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_path_assignment_path_user UNIQUE (path_id, user_id)
);

CREATE INDEX idx_lpa_user   ON learning_path_assignment(user_id);
CREATE INDEX idx_lpa_status ON learning_path_assignment(status);
