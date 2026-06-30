UPDATE "electronic_signatures"
SET "reason" = 'Legacy signature before mandatory remarks'
WHERE "reason" IS NULL OR btrim("reason") = '';
--> statement-breakpoint
ALTER TABLE "electronic_signatures" ALTER COLUMN "reason" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "electronic_signatures" DROP CONSTRAINT IF EXISTS electronic_signatures_reason_present;
--> statement-breakpoint
ALTER TABLE "electronic_signatures"
  ADD CONSTRAINT electronic_signatures_reason_present
  CHECK (btrim("reason") <> '');
