-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "coverImageUrl" TEXT;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "creator2SeenAt" TIMESTAMP(3),
ADD COLUMN     "creatorId2" TEXT,
ADD COLUMN     "hiddenForCreator2" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "businessId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "hiddenForCreator2" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "conversations_creatorId2_hiddenForCreator2_lastMessageAt_idx" ON "conversations"("creatorId2", "hiddenForCreator2", "lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_creatorId_creatorId2_key" ON "conversations"("creatorId", "creatorId2");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_creatorId2_fkey" FOREIGN KEY ("creatorId2") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

