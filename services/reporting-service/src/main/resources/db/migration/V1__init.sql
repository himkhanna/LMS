CREATE TABLE report (
    id           UUID PRIMARY KEY,
    type         VARCHAR(64) NOT NULL,
    params       JSONB,
    status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    file_key     VARCHAR(512),
    rows         INTEGER,
    requested_by VARCHAR(255),
    error_message TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_report_status ON report(status, created_at DESC);
