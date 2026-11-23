\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS script_lab.customer_accounts (
  email text PRIMARY KEY,
  password_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS script_lab.customer_sessions (
  token_digest text PRIMARY KEY,
  email text NOT NULL REFERENCES script_lab.customer_accounts(email) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS script_lab_customer_sessions_expiry ON script_lab.customer_sessions (expires_at);
CREATE TABLE IF NOT EXISTS script_lab.customer_auth_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);
GRANT SELECT, INSERT ON script_lab.customer_accounts TO ubuntu;
GRANT SELECT, INSERT, DELETE ON script_lab.customer_sessions TO ubuntu;
GRANT SELECT, INSERT, UPDATE, DELETE ON script_lab.customer_auth_limits TO ubuntu;
COMMIT;
