-- CreateEnum
CREATE TYPE "VideoAssetStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachmentStatus" "VideoAssetStatus";
