ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "length_value" text;--> statement-breakpoint
ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "length_unit" text;--> statement-breakpoint
ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "diameter_value" text;--> statement-breakpoint
ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "diameter_unit" text;--> statement-breakpoint
ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "particle_size_value" text;--> statement-breakpoint
ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "particle_size_unit" text;--> statement-breakpoint
ALTER TABLE "column_masters" ADD COLUMN IF NOT EXISTS "packing" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "po_number" text;--> statement-breakpoint
ALTER TABLE "column_units" ADD COLUMN IF NOT EXISTS "dedicated_product" text;--> statement-breakpoint
ALTER TABLE "column_units" ADD COLUMN IF NOT EXISTS "dedicated_test" text;--> statement-breakpoint
ALTER TABLE "column_units" ADD COLUMN IF NOT EXISTS "dedicated_at" timestamp;--> statement-breakpoint
ALTER TABLE "issuances" ALTER COLUMN "expected_return_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "issuances" ADD COLUMN IF NOT EXISTS "is_dedicated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "issuances" ADD COLUMN IF NOT EXISTS "dedicated_product" text;--> statement-breakpoint
ALTER TABLE "issuances" ADD COLUMN IF NOT EXISTS "dedicated_test" text;--> statement-breakpoint
ALTER TABLE "performance_entries" ADD COLUMN IF NOT EXISTS "criteria" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_entries" ADD COLUMN IF NOT EXISTS "retest_of_id" uuid;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "electronic_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "meaning" text NOT NULL,
  "reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_actor_id_users_id_fk"
    FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "electronic_signatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "electronic_signatures" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS app_runtime_all ON "electronic_signatures";--> statement-breakpoint
CREATE POLICY app_runtime_all ON "electronic_signatures"
  FOR ALL
  USING (current_setting('app.runtime', true) = 'column-management-server')
  WITH CHECK (current_setting('app.runtime', true) = 'column-management-server');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS electronic_signatures_entity_idx
  ON "electronic_signatures" ("entity_type", "entity_id", "created_at");--> statement-breakpoint
COMMENT ON TABLE "electronic_signatures" IS 'Part 11 style password re-authentication records for controlled transactions.';
