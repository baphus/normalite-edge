-- CreateTable
CREATE TABLE "exam_tracks" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_tracks_track_id_idx" ON "exam_tracks"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_tracks_exam_id_track_id_key" ON "exam_tracks"("exam_id", "track_id");

-- AddForeignKey
ALTER TABLE "exam_tracks" ADD CONSTRAINT "exam_tracks_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_tracks" ADD CONSTRAINT "exam_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
