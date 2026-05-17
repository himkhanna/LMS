-- Phase 1: HR role + org metadata on users
-- Add manager_email + department to support assignment + manager rollups.
-- HR is a new role value; no schema change required (column is VARCHAR(32)).

ALTER TABLE app_user
    ADD COLUMN manager_email VARCHAR(255),
    ADD COLUMN department    VARCHAR(128);

CREATE INDEX idx_app_user_manager_email ON app_user(lower(manager_email))
    WHERE manager_email IS NOT NULL;
CREATE INDEX idx_app_user_department ON app_user(department)
    WHERE department IS NOT NULL;
