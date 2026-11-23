\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE script_lab.customer_email_verifications
  ADD COLUMN IF NOT EXISTS pending_password_digest text;
COMMIT;
