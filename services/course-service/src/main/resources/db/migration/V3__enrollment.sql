-- Phase 1: course assignment + per-lesson progress
--
-- enrollment    : a learner has been assigned a course (HR / admin action)
-- lesson_progress : per-(user, lesson) start/complete state, drives the
--                   enrollment progress percentage.

CREATE TABLE enrollment (
    id                 UUID PRIMARY KEY,
    course_id          UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    user_id            UUID NOT NULL,
    user_email         VARCHAR(255) NOT NULL,
    user_name          VARCHAR(255),
    status             VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
    mandatory          BOOLEAN     NOT NULL DEFAULT FALSE,
    assigned_by_email  VARCHAR(255),
    assigned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at             TIMESTAMPTZ,
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    progress_pct       INT         NOT NULL DEFAULT 0,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_enrollment_course_user UNIQUE (course_id, user_id)
);

CREATE INDEX idx_enrollment_user        ON enrollment(user_id);
CREATE INDEX idx_enrollment_course      ON enrollment(course_id);
CREATE INDEX idx_enrollment_status      ON enrollment(status);
CREATE INDEX idx_enrollment_due_at      ON enrollment(due_at) WHERE due_at IS NOT NULL;

CREATE TABLE lesson_progress (
    id            UUID PRIMARY KEY,
    user_id       UUID NOT NULL,
    lesson_id     UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    course_id     UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    status        VARCHAR(32) NOT NULL DEFAULT 'STARTED',
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    CONSTRAINT uk_lesson_progress_user_lesson UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user_course ON lesson_progress(user_id, course_id);
