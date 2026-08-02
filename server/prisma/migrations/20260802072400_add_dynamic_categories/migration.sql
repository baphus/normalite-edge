-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- Seed initial categories
INSERT INTO "categories" ("id", "name", "created_at", "updated_at") VALUES
    (gen_random_uuid(), 'General Education', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Professional Education', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Specialization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add new categoryId columns
ALTER TABLE "exams" ADD COLUMN "category_id" UUID;
ALTER TABLE "study_decks" ADD COLUMN "category_id" UUID;

-- Migrate existing data: map enum values to category IDs
UPDATE "exams" e SET "category_id" = c."id"
FROM "categories" c WHERE c."name" = 'General Education' AND e."category" = 'GENERAL_EDUCATION';

UPDATE "exams" e SET "category_id" = c."id"
FROM "categories" c WHERE c."name" = 'Professional Education' AND e."category" = 'PROFESSIONAL_EDUCATION';

UPDATE "exams" e SET "category_id" = c."id"
FROM "categories" c WHERE c."name" = 'Specialization' AND e."category" = 'SPECIALIZATION';

UPDATE "study_decks" d SET "category_id" = c."id"
FROM "categories" c WHERE c."name" = 'General Education' AND d."category" = 'GENERAL_EDUCATION';

UPDATE "study_decks" d SET "category_id" = c."id"
FROM "categories" c WHERE c."name" = 'Professional Education' AND d."category" = 'PROFESSIONAL_EDUCATION';

UPDATE "study_decks" d SET "category_id" = c."id"
FROM "categories" c WHERE c."name" = 'Specialization' AND d."category" = 'SPECIALIZATION';

-- Drop old enum columns
ALTER TABLE "exams" DROP COLUMN "category";
ALTER TABLE "study_decks" DROP COLUMN "category";

-- Drop old enum type
DROP TYPE "ApplicableCategory";

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_decks" ADD CONSTRAINT "study_decks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
