ALTER TABLE "destructions"
  RENAME COLUMN "manager_approved_by" TO "final_approved_by";--> statement-breakpoint

ALTER TABLE "destructions"
  RENAME CONSTRAINT "destructions_manager_approved_by_users_id_fk" TO "destructions_final_approved_by_users_id_fk";
