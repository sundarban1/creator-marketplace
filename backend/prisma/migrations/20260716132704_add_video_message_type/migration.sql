-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachmentDurationSec" INTEGER,
ADD COLUMN     "attachmentFormat" TEXT,
ADD COLUMN     "attachmentHeight" INTEGER,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentThumbnailUrl" TEXT,
ADD COLUMN     "attachmentWidth" INTEGER;
