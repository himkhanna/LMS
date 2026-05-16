ALTER TABLE app_user
    ADD COLUMN microsoft_oid VARCHAR(64),
    ADD COLUMN tenant_id     VARCHAR(64);

ALTER TABLE app_user
    ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX idx_app_user_msoid ON app_user(microsoft_oid)
    WHERE microsoft_oid IS NOT NULL;
