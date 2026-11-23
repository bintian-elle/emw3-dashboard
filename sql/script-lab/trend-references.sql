CREATE TABLE IF NOT EXISTS script_lab.trend_references (
    id text PRIMARY KEY,
    item jsonb NOT NULL,
    checked_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
GRANT SELECT, INSERT, UPDATE ON script_lab.trend_references TO ubuntu;
