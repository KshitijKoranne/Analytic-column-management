CREATE INDEX IF NOT EXISTS column_masters_part_number_lookup_idx
  ON "column_masters" (lower("part_number"));--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "column_masters"
    GROUP BY lower("part_number")
    HAVING count(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS column_masters_part_number_unique_idx ON "column_masters" (lower("part_number"))';
  END IF;
END $$;
