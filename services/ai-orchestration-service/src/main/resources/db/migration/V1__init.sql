CREATE TABLE pipeline_run (
    id           UUID PRIMARY KEY,
    pipeline     VARCHAR(64) NOT NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    input        JSONB,
    output       JSONB,
    model        VARCHAR(255),
    provider_id  UUID,
    user_id      VARCHAR(255),
    error_message TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_pipeline_run_pipeline ON pipeline_run(pipeline, created_at DESC);
