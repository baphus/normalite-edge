-- Backfill users.track_id based on existing users.program_track values.
-- Matches either track name or track code, case-insensitive.

UPDATE "users" AS u
SET
  "track_id" = t."id",
  "program_track" = t."name"
FROM "tracks" AS t
WHERE u."track_id" IS NULL
  AND u."program_track" IS NOT NULL
  AND (
    LOWER(TRIM(u."program_track")) = LOWER(t."name")
    OR LOWER(TRIM(u."program_track")) = LOWER(COALESCE(t."code", ''))
  );
