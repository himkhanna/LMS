-- Phase 6: course-level discussion threads.
-- Top-level posts have parent_id = NULL. Replies set parent_id to the
-- top-level post (single-level threading — no deep nesting in v1).

CREATE TABLE discussion_post (
    id              UUID PRIMARY KEY,
    course_id       UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES discussion_post(id) ON DELETE CASCADE,
    author_user_id  UUID NOT NULL,
    author_email    VARCHAR(255) NOT NULL,
    author_name     VARCHAR(255),
    body            TEXT NOT NULL,
    pinned          BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_post_course        ON discussion_post(course_id, created_at DESC);
CREATE INDEX idx_discussion_post_parent        ON discussion_post(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_discussion_post_top_pinned_at ON discussion_post(course_id, pinned DESC, created_at DESC)
    WHERE parent_id IS NULL AND deleted_at IS NULL;
