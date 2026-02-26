/*
  Warnings:

  - You are about to drop the column `program_track` on the `study_decks` table. All the data in the column will be lost.
  - You are about to drop the `study_materials` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "study_materials" DROP CONSTRAINT "study_materials_created_by_fkey";

-- AlterTable
ALTER TABLE "study_decks" DROP COLUMN "program_track";

-- DropTable
DROP TABLE "study_materials";

-- DropEnum
DROP TYPE "ContentType";

-- CreateTable
CREATE TABLE "tracks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_deck_tracks" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_deck_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracks_name_key" ON "tracks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_code_key" ON "tracks"("code");

-- CreateIndex
CREATE INDEX "study_deck_tracks_track_id_idx" ON "study_deck_tracks"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_deck_tracks_deck_id_track_id_key" ON "study_deck_tracks"("deck_id", "track_id");

-- AddForeignKey
ALTER TABLE "study_deck_tracks" ADD CONSTRAINT "study_deck_tracks_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "study_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_deck_tracks" ADD CONSTRAINT "study_deck_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
