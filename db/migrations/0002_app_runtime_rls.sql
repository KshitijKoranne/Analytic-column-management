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
    EXECUTE format(
      'CREATE POLICY app_runtime_all ON %I FOR ALL USING (current_setting(''app.runtime'', true) = ''column-management-server'') WITH CHECK (current_setting(''app.runtime'', true) = ''column-management-server'')',
      table_name
    );
  END LOOP;
END $$;

COMMENT ON POLICY app_runtime_all ON "users" IS 'Allows access only from the server runtime connection that sets app.runtime. Application RBAC remains enforced in server actions.';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON "users" (lower("email")) WHERE "email" IS NOT NULL;

ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS attachments_size_positive;
ALTER TABLE "attachments"
  ADD CONSTRAINT attachments_size_positive CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880);

CREATE UNIQUE INDEX IF NOT EXISTS approval_tasks_one_pending_step
  ON "approval_tasks" ("workflow_run_id", "step")
  WHERE "status" = 'pending';
