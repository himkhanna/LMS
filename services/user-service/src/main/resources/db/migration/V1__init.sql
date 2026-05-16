CREATE TABLE user_profile (
    id           UUID PRIMARY KEY,
    auth_user_id UUID NOT NULL UNIQUE,
    display_name VARCHAR(255),
    bio          TEXT,
    avatar_url   VARCHAR(1024),
    locale       VARCHAR(16) DEFAULT 'en',
    timezone     VARCHAR(64) DEFAULT 'UTC',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
