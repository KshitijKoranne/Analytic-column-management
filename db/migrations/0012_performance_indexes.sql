CREATE INDEX IF NOT EXISTS "column_masters_status_idx" ON "column_masters" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "column_masters_created_at_idx" ON "column_masters" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "column_units_status_idx" ON "column_units" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "column_units_master_id_idx" ON "column_units" ("master_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "column_units_current_holder_id_idx" ON "column_units" ("current_holder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "column_units_created_at_idx" ON "column_units" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "receipts_status_idx" ON "receipts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_column_unit_id_idx" ON "receipts" ("column_unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_created_at_idx" ON "receipts" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "issuances_status_idx" ON "issuances" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issuances_column_unit_id_idx" ON "issuances" ("column_unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issuances_created_at_idx" ON "issuances" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "performance_entries_status_idx" ON "performance_entries" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_entries_column_unit_id_idx" ON "performance_entries" ("column_unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_entries_created_at_idx" ON "performance_entries" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "destructions_status_idx" ON "destructions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "destructions_column_unit_id_idx" ON "destructions" ("column_unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "destructions_created_at_idx" ON "destructions" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "approval_tasks_status_idx" ON "approval_tasks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_tasks_created_at_idx" ON "approval_tasks" ("created_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "audit_events_created_at_idx" ON "audit_events" ("created_at" DESC);
