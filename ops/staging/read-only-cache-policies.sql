-- Run as the reporting database owner after provisioning the SELECT-only role.
-- Do not add policies for account preferences or the AI job queue.
DO $$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['testing_data_snapshots','testing_ai_readout_cache','testing_ai_readout_translations','dashboard_overview_publications']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=target_table AND policyname='emw3_staging_reader_select') THEN
      EXECUTE format('CREATE POLICY emw3_staging_reader_select ON public.%I FOR SELECT TO emw3_staging_reader USING (true)', target_table);
    END IF;
  END LOOP;
END $$;
