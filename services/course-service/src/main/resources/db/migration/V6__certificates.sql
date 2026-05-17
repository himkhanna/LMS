-- Phase 5: completion certificates.
-- Issued automatically when an enrollment flips to COMPLETED; one per
-- enrollment. The serial is a human-friendly verification code.

CREATE TABLE certificate (
    id              UUID PRIMARY KEY,
    enrollment_id   UUID NOT NULL UNIQUE REFERENCES enrollment(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    user_email      VARCHAR(255) NOT NULL,
    user_name       VARCHAR(255),
    course_id       UUID NOT NULL REFERENCES course(id),
    course_title    VARCHAR(255) NOT NULL,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    serial          VARCHAR(64) NOT NULL UNIQUE
);

CREATE INDEX idx_certificate_user ON certificate(user_id, issued_at DESC);
