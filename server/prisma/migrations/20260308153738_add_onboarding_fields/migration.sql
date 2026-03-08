-- AlterTable
ALTER TABLE "users" ADD COLUMN     "completed_tours" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_onboarded" BOOLEAN NOT NULL DEFAULT false;
