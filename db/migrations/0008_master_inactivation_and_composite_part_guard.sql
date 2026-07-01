INSERT INTO "permissions" ("key", "resource", "action")
VALUES ('masters:inactivate', 'masters', 'inactivate')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."key" = 'admin'
  AND p."key" = 'masters:inactivate'
ON CONFLICT DO NOTHING;--> statement-breakpoint

DROP INDEX IF EXISTS column_masters_part_number_unique_idx;--> statement-breakpoint
DROP INDEX IF EXISTS column_masters_part_number_lookup_idx;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS column_masters_part_composite_lookup_idx
  ON "column_masters" (lower("column_type"), lower("manufacturer"), lower("part_number"));--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "column_masters"
    GROUP BY lower("column_type"), lower("manufacturer"), lower("part_number")
    HAVING count(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS column_masters_part_composite_unique_idx ON "column_masters" (lower("column_type"), lower("manufacturer"), lower("part_number"))';
  END IF;
END $$;
