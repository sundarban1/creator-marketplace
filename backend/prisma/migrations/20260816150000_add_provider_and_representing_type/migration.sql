-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('INDIVIDUAL', 'TEAM', 'AGENCY');

-- CreateEnum
CREATE TYPE "RepresentingType" AS ENUM ('ORGANIZATION', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "providerType" "ProviderType";

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "representingType" "RepresentingType";
