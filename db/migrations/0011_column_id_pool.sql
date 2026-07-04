CREATE TABLE IF NOT EXISTS "column_id_pool" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'available',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "used_at" timestamp,
  "used_by_column_unit_id" uuid
);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'column_id_pool_used_by_column_unit_id_column_units_id_fk'
  ) THEN
    ALTER TABLE "column_id_pool"
      ADD CONSTRAINT "column_id_pool_used_by_column_unit_id_column_units_id_fk"
      FOREIGN KEY ("used_by_column_unit_id") REFERENCES "public"."column_units"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "column_id_pool_status_idx" ON "column_id_pool" ("status");--> statement-breakpoint

ALTER TABLE "column_id_pool" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "column_id_pool" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS app_runtime_all ON "column_id_pool";--> statement-breakpoint
CREATE POLICY app_runtime_all ON "column_id_pool"
  FOR ALL
  USING (current_setting('app.runtime', true) = 'column-management-server')
  WITH CHECK (current_setting('app.runtime', true) = 'column-management-server');
