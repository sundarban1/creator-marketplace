-- CreateEnum
CREATE TYPE "CompletionType" AS ENUM ('SERVICE', 'DELIVERABLE');

-- AlterTable
ALTER TABLE "campaign_requirements" ADD COLUMN     "completionReason" TEXT,
ADD COLUMN     "completionType" "CompletionType";

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "completionReason" TEXT,
ADD COLUMN     "completionType" "CompletionType";
