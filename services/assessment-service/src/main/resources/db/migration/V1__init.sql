CREATE TABLE quiz (
    id          UUID PRIMARY KEY,
    course_id   UUID,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    pass_score  INT NOT NULL DEFAULT 70,
    status      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE question (
    id        UUID PRIMARY KEY,
    quiz_id   UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    prompt    TEXT NOT NULL,
    options   JSONB NOT NULL,
    answer_index INT NOT NULL,
    position  INT NOT NULL,
    UNIQUE (quiz_id, position)
);
CREATE TABLE attempt (
    id        UUID PRIMARY KEY,
    quiz_id   UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id   VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    score     INT,
    passed    BOOLEAN
);
CREATE INDEX idx_attempt_user ON attempt(user_id, started_at DESC);
