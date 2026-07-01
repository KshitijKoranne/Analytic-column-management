DELETE FROM "user_roles"
WHERE "role_id" IN (
  SELECT "id" FROM "roles" WHERE "key" IN ('analyst', 'auditor', 'manager', 'reviewer')
);
--> statement-breakpoint
DELETE FROM "role_permissions"
WHERE "role_id" IN (
  SELECT "id" FROM "roles" WHERE "key" IN ('analyst', 'auditor', 'manager', 'reviewer')
);
--> statement-breakpoint
DELETE FROM "roles"
WHERE "key" IN ('analyst', 'auditor', 'manager', 'reviewer');
