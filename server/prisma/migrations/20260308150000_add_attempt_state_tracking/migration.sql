-- Add backend-authoritative attempt state fields and per-question view tracking
ALTER TABLE "exam_attempts"
ADD COLUMN "ends_at" TIMESTAMP(3),
ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
ADD COLUMN "current_question_index" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "attempt_answers"
ADD COLUMN "viewed_at" TIMESTAMP(3);

-- Backfill ends_at using attempt start plus exam configured duration
UPDATE "exam_attempts" ea
SET "ends_at" = ea."started_at" + (e."time_limit_minutes" * INTERVAL '1 minute')
FROM "exams" e
WHERE ea."exam_id" = e."id"
  AND ea."ends_at" IS NULL;

-- Fallback for edge cases where exam join is missing
UPDATE "exam_attempts"
SET "ends_at" = "started_at"
WHERE "ends_at" IS NULL;

-- Backfill activity timestamp for historical attempts
UPDATE "exam_attempts"
SET "last_activity_at" = COALESCE("last_saved_at", "started_at", NOW())
WHERE "last_activity_at" IS NULL;

ALTER TABLE "exam_attempts"
ALTER COLUMN "ends_at" SET NOT NULL;

CREATE INDEX "exam_questions_exam_id_idx" ON "exam_questions"("exam_id");
CREATE INDEX "exam_attempts_user_id_status_updated_at_idx" ON "exam_attempts"("user_id", "status", "updated_at" DESC);
CREATE INDEX "attempt_answers_attempt_id_idx" ON "attempt_answers"("attempt_id");
