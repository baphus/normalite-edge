-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "color" TEXT;

-- AlterTable
ALTER TABLE "streak_days" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_streaks" ALTER COLUMN "id" DROP DEFAULT;
