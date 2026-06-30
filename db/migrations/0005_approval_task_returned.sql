ALTER TABLE "approval_tasks" DROP CONSTRAINT IF EXISTS approval_tasks_status_check;
--> statement-breakpoint
ALTER TABLE "approval_tasks"
  ADD CONSTRAINT approval_tasks_status_check
  CHECK ("status" IN ('pending', 'approved', 'rejected', 'returned', 'cancelled'));
