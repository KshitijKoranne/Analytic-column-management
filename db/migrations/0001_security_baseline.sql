ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "checksum_sha256" text DEFAULT '' NOT NULL;

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_append_only ON "audit_events";
CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();

ALTER TABLE "column_masters" DROP CONSTRAINT IF EXISTS column_masters_status_check;
ALTER TABLE "column_masters"
  ADD CONSTRAINT column_masters_status_check
  CHECK ("status" IN ('draft', 'pending_review', 'active', 'superseded', 'retired'));

ALTER TABLE "workflow_definitions" DROP CONSTRAINT IF EXISTS workflow_definitions_status_check;
ALTER TABLE "workflow_definitions"
  ADD CONSTRAINT workflow_definitions_status_check
  CHECK ("status" IN ('draft', 'active', 'retired'));

ALTER TABLE "workflow_runs" DROP CONSTRAINT IF EXISTS workflow_runs_status_check;
ALTER TABLE "workflow_runs"
  ADD CONSTRAINT workflow_runs_status_check
  CHECK ("status" IN ('open', 'completed', 'cancelled'));

ALTER TABLE "approval_tasks" DROP CONSTRAINT IF EXISTS approval_tasks_status_check;
ALTER TABLE "approval_tasks"
  ADD CONSTRAINT approval_tasks_status_check
  CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled'));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'accounts',
    'approval_tasks',
    'attachments',
    'audit_events',
    'column_masters',
    'column_units',
    'destructions',
    'issuances',
    'performance_entries',
    'permissions',
    'receipts',
    'role_permissions',
    'roles',
    'sessions',
    'user_roles',
    'users',
    'verification_tokens',
    'workflow_definitions',
    'workflow_runs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_all ON %I', table_name);
    EXECUTE format('CREATE POLICY app_runtime_all ON %I FOR ALL USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END $$;
