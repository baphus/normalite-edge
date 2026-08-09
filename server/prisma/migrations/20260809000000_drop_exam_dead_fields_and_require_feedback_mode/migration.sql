-- AlterTable: Drop dead fields from exams
ALTER TABLE "exams" DROP COLUMN "max_attempts",
DROP COLUMN "cooldown_minutes",
DROP COLUMN "close_on_deadline";

-- AlterTable: Make feedback_mode required (set existing NULLs to AFTER_SUBMIT)
UPDATE "exams" SET "feedback_mode" = 'AFTER_SUBMIT' WHERE "feedback_mode" IS NULL;
ALTER TABLE "exams" ALTER COLUMN "feedback_mode" SET NOT NULL;

-- AlterTable: Drop allow_multiple_attempts from system_settings
ALTER TABLE "system_settings" DROP COLUMN "allow_multiple_attempts";
