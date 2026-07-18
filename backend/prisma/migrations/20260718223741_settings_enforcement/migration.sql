-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "netPayoutAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "commissionRate" DOUBLE PRECISION;
