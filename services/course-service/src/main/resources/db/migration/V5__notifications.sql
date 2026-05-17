-- Phase 4: notifications + denormalized org metadata on enrollment.
--
-- Denormalizing manager_email + department onto enrollment avoids a
-- cross-service call to auth-service every time we send reminders or
-- compute manager rollups. Snapshotted at assign-time; HR can re-assign
-- to refresh.

ALTER TABLE enrollment
    ADD COLUMN manager_email VARCHAR(255),
    ADD COLUMN department    VARCHAR(128);

CREATE INDEX idx_enrollment_manager_email ON enrollment(lower(manager_email))
    WHERE manager_email IS NOT NULL;
CREATE INDEX idx_enrollment_department ON enrollment(department)
    WHERE department IS NOT NULL;

-- channel: IN_APP | EMAIL
-- type:    DUE_SOON | OVERDUE | ESCALATION | MANUAL | COMPLETED
-- status:  PENDING (created, not yet delivered)
--          SENT    (delivered to its channel — in-app means visible to user;
--                   email means handed off to the email sender)
--          FAILED  (sender threw; see error)
--          READ    (in-app only; user clicked it)
CREATE TABLE notification (
    id              UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    channel         VARCHAR(32) NOT NULL,
    type            VARCHAR(32) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    enrollment_id   UUID REFERENCES enrollment(id) ON DELETE SET NULL,
    course_id       UUID REFERENCES course(id) ON DELETE SET NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    error           TEXT,
    created_by_email VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ
);

CREATE INDEX idx_notification_recipient ON notification(recipient_user_id, created_at DESC);
CREATE INDEX idx_notification_status    ON notification(status);
CREATE INDEX idx_notification_enrollment ON notification(enrollment_id)
    WHERE enrollment_id IS NOT NULL;

-- Idempotency: only one "DUE_SOON N days" per (enrollment, type, day_bucket)
-- so the daily scheduler can be re-run safely.
CREATE TABLE notification_dispatch_log (
    id              UUID PRIMARY KEY,
    enrollment_id   UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    type            VARCHAR(32) NOT NULL,
    bucket          VARCHAR(32) NOT NULL,   -- e.g. "DUE_7D", "OVERDUE_DAILY-2026-05-17"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_dispatch_enrollment_type_bucket UNIQUE (enrollment_id, type, bucket)
);
