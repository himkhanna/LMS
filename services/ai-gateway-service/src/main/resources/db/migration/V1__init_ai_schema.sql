CREATE TABLE ai_provider (
    id              UUID PRIMARY KEY,
    provider_type   VARCHAR(32) NOT NULL,
    name            VARCHAR(255) NOT NULL UNIQUE,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    api_key         TEXT,
    base_url        VARCHAR(512),
    default_model   VARCHAR(255),
    priority        INTEGER NOT NULL DEFAULT 0,
    config          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_provider_enabled ON ai_provider(enabled, priority DESC);

CREATE TABLE ai_usage_log (
    id                 UUID PRIMARY KEY,
    provider_id        UUID REFERENCES ai_provider(id) ON DELETE SET NULL,
    provider_type      VARCHAR(32),
    model              VARCHAR(255),
    use_case           VARCHAR(64),
    user_id            VARCHAR(255),
    prompt_tokens      INTEGER,
    completion_tokens  INTEGER,
    total_tokens       INTEGER,
    latency_ms         INTEGER,
    status             VARCHAR(32) NOT NULL,
    error_message      TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_provider ON ai_usage_log(provider_id, created_at DESC);
CREATE INDEX idx_ai_usage_status   ON ai_usage_log(status, created_at DESC);

-- Only one default provider at a time
CREATE UNIQUE INDEX idx_ai_provider_one_default ON ai_provider(is_default) WHERE is_default = TRUE;
