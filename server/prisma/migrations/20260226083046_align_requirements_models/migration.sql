-- CreateEnum
CREATE TYPE "DeckSessionMode" AS ENUM ('VIEW', 'FLASHCARDS', 'QUIZ');

-- CreateEnum
CREATE TYPE "DeckSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'REJECT';
ALTER TYPE "AuditAction" ADD VALUE 'ROLE_CHANGE';

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_user_id_fkey";

-- CreateTable
CREATE TABLE "study_decks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "program_track" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_deck_questions" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "order_no" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "choice_a" TEXT,
    "choice_b" TEXT,
    "choice_c" TEXT,
    "choice_d" TEXT,
    "correct_choice" CHAR(1),
    "answer_text" TEXT,
    "rationalization" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "study_deck_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_sessions" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mode" "DeckSessionMode" NOT NULL,
    "status" "DeckSessionStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_saved_at" TIMESTAMP(3),
    "current_index" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "total_items" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "deck_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_session_items" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "deck_question_id" UUID NOT NULL,
    "was_viewed" BOOLEAN NOT NULL DEFAULT false,
    "selected_choice" CHAR(1),
    "is_correct" BOOLEAN,
    "interacted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deck_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_decks_created_by_created_at_idx" ON "study_decks"("created_by", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "study_deck_questions_deck_id_order_no_key" ON "study_deck_questions"("deck_id", "order_no");

-- CreateIndex
CREATE INDEX "deck_sessions_user_id_deck_id_started_at_idx" ON "deck_sessions"("user_id", "deck_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "deck_session_items_session_id_deck_question_id_key" ON "deck_session_items"("session_id", "deck_question_id");

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_decks" ADD CONSTRAINT "study_decks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_deck_questions" ADD CONSTRAINT "study_deck_questions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "study_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_sessions" ADD CONSTRAINT "deck_sessions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "study_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_sessions" ADD CONSTRAINT "deck_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_session_items" ADD CONSTRAINT "deck_session_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "deck_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_session_items" ADD CONSTRAINT "deck_session_items_deck_question_id_fkey" FOREIGN KEY ("deck_question_id") REFERENCES "study_deck_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
