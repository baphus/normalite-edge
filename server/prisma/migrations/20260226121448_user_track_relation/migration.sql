-- AlterTable
ALTER TABLE "users" ADD COLUMN     "track_id" UUID;

-- CreateIndex
CREATE INDEX "users_track_id_idx" ON "users"("track_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
