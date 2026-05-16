CREATE TABLE search_doc (
    id          UUID PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id   UUID NOT NULL,
    title       VARCHAR(512) NOT NULL,
    body        TEXT,
    tags        TEXT[],
    indexed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B')
    ) STORED,
    UNIQUE (entity_type, entity_id)
);
CREATE INDEX idx_search_vector ON search_doc USING GIN(search_vector);
CREATE INDEX idx_search_tags ON search_doc USING GIN(tags);
