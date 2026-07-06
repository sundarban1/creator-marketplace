-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "defaultBudgetRange" TEXT,
ADD COLUMN     "defaultCreatorCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "defaultPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "presenceServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "socialLinks" JSONB NOT NULL DEFAULT '{}';

