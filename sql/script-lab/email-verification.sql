\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE script_lab.customer_accounts ADD COLUMN IF NOT EXISTS verified_at timestamptz;
CREATE TABLE IF NOT EXISTS script_lab.customer_email_verifications (
  token_digest text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL
);
GRANT SELECT, INSERT ON script_lab.customer_email_verifications TO ubuntu;
GRANT UPDATE (password_digest, verified_at) ON script_lab.customer_accounts TO ubuntu;
COMMIT;
