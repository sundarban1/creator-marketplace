-- CreateEnum
CREATE TYPE "CategoryScope" AS ENUM ('CREATOR', 'BUSINESS', 'BOTH');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CitizenshipStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "companyRegDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "companyRegDocUploadedAt" TIMESTAMP(3),
ADD COLUMN     "companyRegDocUrl" TEXT,
ADD COLUMN     "panDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "panDocUploadedAt" TIMESTAMP(3),
ADD COLUMN     "panDocUrl" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiNeedsInputFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiPrompt" TEXT,
ADD COLUMN     "aiSuggestedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiSuggestedPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "approvalRequirements" TEXT,
ADD COLUMN     "callToAction" TEXT,
ADD COLUMN     "contentGuidelines" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "sampleCaption" TEXT,
ADD COLUMN     "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "citizenshipDocUrl" TEXT,
ADD COLUMN     "citizenshipStatus" "CitizenshipStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "citizenshipUploadedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "iconBg" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "CategoryScope" NOT NULL DEFAULT 'BOTH',
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

