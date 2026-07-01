ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS "password_reset_required" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "security_question" text,
  ADD COLUMN IF NOT EXISTS "security_answer_hash" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_by" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_updated_by_users_id_fk'
  ) THEN
    ALTER TABLE "app_settings"
      ADD CONSTRAINT "app_settings_updated_by_users_id_fk"
      FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

INSERT INTO "app_settings" ("key", "value")
VALUES ('password_expiry_days', '90')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "app_settings" ("key", "value")
VALUES ('date_format', 'DD/MM/YY')
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_settings" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS app_runtime_all ON "app_settings";--> statement-breakpoint
CREATE POLICY app_runtime_all ON "app_settings"
  FOR ALL
  USING (current_setting('app.runtime', true) = 'column-management-server')
  WITH CHECK (current_setting('app.runtime', true) = 'column-management-server');
