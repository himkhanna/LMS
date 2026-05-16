CREATE TABLE learning_event (
    id          UUID PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL,
    event_type  VARCHAR(64)  NOT NULL,
    course_id   UUID,
    lesson_id   UUID,
    payload     JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_user ON learning_event(user_id, occurred_at DESC);
CREATE INDEX idx_event_type ON learning_event(event_type, occurred_at DESC);
CREATE INDEX idx_event_course ON learning_event(course_id, occurred_at DESC);
