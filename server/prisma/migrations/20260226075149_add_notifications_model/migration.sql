/*
  Warnings:

  - The values [APPROVED,REJECTED] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `actorId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `actorRole` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `audit_logs` table. All the data in the column will be lost.
  - The primary key for the `exams` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `isPublished` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `program` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDate` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `timeLimit` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `totalItems` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `exams` table. All the data in the column will be lost.
  - The primary key for the `notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `notifications` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `major` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `picture` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `program` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `section` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `yearLevel` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `live_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `materials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `actor_id` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actor_role` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_type` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `created_by` to the `exams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `exams` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `exams` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `time_limit_minutes` on table `exams` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `user_id` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PDF', 'LINK', 'NOTE');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');
ALTER TABLE "public"."users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_examId_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "live_sessions" DROP CONSTRAINT "live_sessions_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_examId_fkey";

-- DropIndex
DROP INDEX "audit_logs_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_entityType_createdAt_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
DROP COLUMN "actorId",
DROP COLUMN "actorRole",
DROP COLUMN "createdAt",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
ADD COLUMN     "actor_id" UUID NOT NULL,
ADD COLUMN     "actor_role" "Role" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "entity_type" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "exams" DROP CONSTRAINT "exams_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "isPublished",
DROP COLUMN "program",
DROP COLUMN "scheduledDate",
DROP COLUMN "timeLimit",
DROP COLUMN "totalItems",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "subject" DROP NOT NULL,
ALTER COLUMN "time_limit_minutes" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT,
ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "major",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "picture",
DROP COLUMN "program",
DROP COLUMN "refreshToken",
DROP COLUMN "section",
DROP COLUMN "updatedAt",
DROP COLUMN "yearLevel",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "is_external_email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "middle_initial" CHAR(1),
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "refresh_token_hash" TEXT,
ADD COLUMN     "suffix" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "role" DROP DEFAULT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "attempts";

-- DropTable
DROP TABLE "live_sessions";

-- DropTable
DROP TABLE "materials";

-- DropTable
DROP TABLE "questions";

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "order_no" INTEGER NOT NULL,
    "section_time_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "order_no" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "choice_a" TEXT NOT NULL,
    "choice_b" TEXT NOT NULL,
    "choice_c" TEXT NOT NULL,
    "choice_d" TEXT NOT NULL,
    "correct_choice" CHAR(1) NOT NULL,
    "rationalization" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "last_saved_at" TIMESTAMP(3),
    "remaining_seconds" INTEGER,
    "submission_type" "SubmissionType" NOT NULL DEFAULT 'MANUAL',
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_choice" CHAR(1) NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_materials" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_type" "ContentType" NOT NULL,
    "file_url" TEXT,
    "subject" TEXT,
    "program_track" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conferences" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "meeting_link" TEXT NOT NULL,
    "host_id" UUID NOT NULL,
    "program_track" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_sections_exam_id_order_no_key" ON "exam_sections"("exam_id", "order_no");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_section_id_order_no_key" ON "exam_questions"("section_id", "order_no");

-- CreateIndex
CREATE INDEX "exam_attempts_user_id_exam_id_started_at_idx" ON "exam_attempts"("user_id", "exam_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_exam_id_user_id_attempt_no_key" ON "exam_attempts"("exam_id", "user_id", "attempt_no");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attempt_id_question_id_key" ON "attempt_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "study_materials_created_by_created_at_idx" ON "study_materials"("created_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_created_at_idx" ON "audit_logs"("entity_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "exams_created_by_created_at_idx" ON "exams"("created_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conferences" ADD CONSTRAINT "conferences_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
