-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('PER_PROJECT', 'PER_HOUR', 'PER_DAY', 'PER_CAMPAIGN', 'CUSTOM_QUOTE');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'REPORTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "LocationVisibility" AS ENUM ('EXACT', 'CITY', 'DISTRICT');

-- CreateEnum
CREATE TYPE "BusinessSize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE', 'AGENCY', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkStatus" ADD VALUE 'REVISION';
ALTER TYPE "WorkStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "WorkStatus" ADD VALUE 'DISPUTED';

-- DropIndex
DROP INDEX "business_profiles_businessName_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_category_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_searchVector_idx";

-- DropIndex
DROP INDEX "campaigns_title_trgm_idx";

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "address" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "businessSize" "BusinessSize",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "locationVisibility" "LocationVisibility" NOT NULL DEFAULT 'CITY',
ADD COLUMN     "province" TEXT;

-- AlterTable
ALTER TABLE "campaign_invitations" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "address" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "locationVisibility" "LocationVisibility" NOT NULL DEFAULT 'CITY',
ADD COLUMN     "negotiable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "startingRate" DOUBLE PRECISION,
ADD COLUMN     "verificationRejectReason" TEXT,
ADD COLUMN     "verificationRejectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startingPrice" DOUBLE PRECISION,
    "pricingModel" "PricingModel" NOT NULL,
    "deliveryTime" TEXT,
    "whatsIncluded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "category" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "MediaType",
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_schedules" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "availableFrom" TEXT NOT NULL,
    "availableUntil" TEXT NOT NULL,

    CONSTRAINT "availability_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_creatorProfileId_idx" ON "services"("creatorProfileId");

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");

-- CreateIndex
CREATE INDEX "portfolio_items_creatorProfileId_idx" ON "portfolio_items"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_schedules_creatorProfileId_dayOfWeek_key" ON "availability_schedules"("creatorProfileId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_schedules" ADD CONSTRAINT "availability_schedules_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
