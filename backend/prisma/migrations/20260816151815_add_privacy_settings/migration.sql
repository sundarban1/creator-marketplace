-- DropIndex
DROP INDEX "business_profiles_businessName_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_category_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_searchVector_idx";

-- DropIndex
DROP INDEX "campaigns_title_trgm_idx";

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "hideSocialLinks" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "hideContactDetails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideSocialLinks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showPublicProfile" BOOLEAN NOT NULL DEFAULT true;
