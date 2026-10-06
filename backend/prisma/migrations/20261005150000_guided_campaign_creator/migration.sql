-- CreateEnum
CREATE TYPE "LocationScope" AS ENUM ('SPECIFIC', 'NATIONWIDE', 'ANYWHERE');

-- CreateEnum
CREATE TYPE "CampaignComplexity" AS ENUM ('QUICK', 'STANDARD', 'ADVANCED');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "aiProvenance" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "applicationDeadline" TIMESTAMP(3),
ADD COLUMN     "brief" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "complexity" "CampaignComplexity",
ADD COLUMN     "deliverableItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "draftStep" TEXT,
ADD COLUMN     "locationScope" "LocationScope" NOT NULL DEFAULT 'SPECIFIC',
ADD COLUMN     "locations" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "startDate" TIMESTAMP(3);

