\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE script_lab.customer_accounts
  ALTER COLUMN password_digest DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS google_subject text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS picture text;
CREATE UNIQUE INDEX IF NOT EXISTS script_lab_customer_google_subject
  ON script_lab.customer_accounts (google_subject) WHERE google_subject IS NOT NULL;
GRANT UPDATE (google_subject, display_name, picture) ON script_lab.customer_accounts TO ubuntu;
COMMIT;
