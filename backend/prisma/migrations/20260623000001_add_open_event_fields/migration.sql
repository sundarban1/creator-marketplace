-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('PAID_CAMPAIGN', 'OPEN_EVENT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "benefits" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "campaignType" "CampaignType" NOT NULL DEFAULT 'PAID_CAMPAIGN',
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "eventStatus" "EventStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "venue" TEXT;
