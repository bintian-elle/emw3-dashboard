ALTER TABLE content_testing_reports.runs ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production','staging'));
