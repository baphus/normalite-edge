-- CreateEnum
CREATE TYPE "ApplicableCategory" AS ENUM ('GENERAL_EDUCATION', 'PROFESSIONAL_EDUCATION', 'SPECIALIZATION');

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "category" "ApplicableCategory" NOT NULL DEFAULT 'GENERAL_EDUCATION';

-- AlterTable
ALTER TABLE "study_decks" ADD COLUMN     "category" "ApplicableCategory" NOT NULL DEFAULT 'GENERAL_EDUCATION';

INSERT INTO "tracks" ("id", "name", "code", "is_active", "created_at", "updated_at") VALUES
	(gen_random_uuid(), 'Bachelor of Elementary Education', 'BEED', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Secondary Education', 'BSED', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Physical Education', 'BPED', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Culture & Arts Education', 'BCAED', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Early Childhood Education', 'BECED', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Special Needs Education', 'BSNED', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Secondary Education – Mathematics', 'BSED-MATH', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Secondary Education – Science', 'BSED-SCI', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Secondary Education – English', 'BSED-ENG', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Secondary Education – Filipino', 'BSED-FIL', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Secondary Education – Social Studies', 'BSED-SOC', true, now(), now()),
	(gen_random_uuid(), 'Bachelor of Technology and Livelihood Education – Home Economics', 'BTLED-HE', true, now(), now()),
	(gen_random_uuid(), 'Diploma in Professional Education', 'DPE', true, now(), now())
ON CONFLICT ("code") DO UPDATE SET
	"name" = EXCLUDED."name",
	"is_active" = true,
	"updated_at" = now();
