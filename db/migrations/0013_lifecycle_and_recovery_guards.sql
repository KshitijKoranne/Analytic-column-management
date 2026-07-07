-- Remember the column's status at destruction-request time so a returned request restores it
-- exactly (instead of forcing every column back to "available").
ALTER TABLE "destructions"
  ADD COLUMN IF NOT EXISTS "column_prior_status" "column_status";--> statement-breakpoint

-- Recovery (forgot-password) throttling: count consecutive wrong security answers and lock the
-- recovery flow for a cooldown window once the threshold is hit.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "recovery_failed_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "recovery_locked_until" timestamp;
