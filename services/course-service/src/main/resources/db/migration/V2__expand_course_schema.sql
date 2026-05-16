-- Asset storage metadata for lessons
CREATE TABLE lesson_asset (
    id           UUID PRIMARY KEY,
    lesson_id    UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    storage_key  VARCHAR(512) NOT NULL,
    content_type VARCHAR(128),
    size_bytes   BIGINT,
    original_name VARCHAR(512),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_asset_lesson ON lesson_asset(lesson_id);

-- Full-text search on courses
ALTER TABLE course ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;

CREATE INDEX idx_course_search_vector ON course USING GIN(search_vector);
CREATE INDEX idx_course_status ON course(status);

-- Publishing lifecycle metadata
ALTER TABLE course ADD COLUMN published_at TIMESTAMPTZ;
