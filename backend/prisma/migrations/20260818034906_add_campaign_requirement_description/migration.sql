-- DropIndex
DROP INDEX "business_profiles_businessName_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_category_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_searchVector_idx";

-- DropIndex
DROP INDEX "campaigns_title_trgm_idx";

-- AlterTable
ALTER TABLE "campaign_requirements" ADD COLUMN     "description" TEXT;
