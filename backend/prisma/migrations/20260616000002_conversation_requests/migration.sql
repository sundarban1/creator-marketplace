-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable: add new columns; set existing rows to ACCEPTED so they aren't blocked
ALTER TABLE "conversations"
  ADD COLUMN "status"         "ConversationStatus" NOT NULL DEFAULT 'ACCEPTED',
  ADD COLUMN "requestMessage" TEXT,
  ADD COLUMN "lastMessageAt"  TIMESTAMP(3),
  ADD COLUMN "businessSeenAt" TIMESTAMP(3),
  ADD COLUMN "creatorSeenAt"  TIMESTAMP(3);
