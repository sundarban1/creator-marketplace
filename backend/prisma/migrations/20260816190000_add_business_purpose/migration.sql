-- CreateEnum
CREATE TYPE "BusinessPurpose" AS ENUM ('BRAND_MARKETING', 'CONTENT_CREATION', 'EVENT', 'WEDDING', 'PHOTOSHOOT', 'PERFORMANCE', 'COLLABORATION', 'OTHER');

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "purpose" "BusinessPurpose";
