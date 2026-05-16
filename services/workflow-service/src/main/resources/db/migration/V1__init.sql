CREATE TABLE approval_task (
    id           UUID PRIMARY KEY,
    entity_type  VARCHAR(64) NOT NULL,
    entity_id    UUID NOT NULL,
    action       VARCHAR(64) NOT NULL,
    requester_id VARCHAR(255) NOT NULL,
    approver_id  VARCHAR(255),
    status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at   TIMESTAMPTZ
);
CREATE INDEX idx_approval_status ON approval_task(status, created_at DESC);
CREATE INDEX idx_approval_entity ON approval_task(entity_type, entity_id);
