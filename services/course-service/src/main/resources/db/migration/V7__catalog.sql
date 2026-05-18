-- Phase 6: course catalog.
-- Add lightweight tagging so HR can categorise courses (e.g. "compliance",
-- "onboarding", "leadership") and learners can filter the catalog. Tags
-- are free-form text — no central taxonomy.

ALTER TABLE course
    ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN summary VARCHAR(280),
    ADD COLUMN cover_color VARCHAR(7);

CREATE INDEX idx_course_tags ON course USING GIN (tags jsonb_path_ops);
