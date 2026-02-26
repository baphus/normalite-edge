-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropIndex
DROP INDEX "notifications_user_id_created_at_idx";

-- AlterTable
ALTER TABLE "notifications" RENAME COLUMN "user_id" TO "recipient_user_id";

-- AlterTable
ALTER TABLE "notifications" RENAME COLUMN "read" TO "is_read";

-- AlterTable
ALTER TABLE "notifications"
ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "entity_type" TEXT,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'INFO';

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_created_at_idx" ON "notifications"("recipient_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_is_read_idx" ON "notifications"("recipient_user_id", "is_read");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
