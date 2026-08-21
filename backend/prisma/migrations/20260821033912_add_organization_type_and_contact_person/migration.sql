-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('COMPANY', 'BRAND', 'RESTAURANT_CAFE', 'HOTEL_RESORT', 'AGENCY', 'STARTUP', 'NGO', 'INGO', 'EDUCATION', 'EVENT_ORGANIZER', 'MEDIA_PRODUCTION', 'RETAIL_SHOP', 'ECOMMERCE', 'COMMUNITY_CLUB', 'GOVERNMENT', 'OTHER');

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "contactPersonName" TEXT,
ADD COLUMN     "organizationType" "OrganizationType",
ADD COLUMN     "organizationTypeOther" TEXT;

-- NOTE: `prisma migrate dev` also generated five stray DROP INDEX statements
-- for the raw-SQL trigram/GIN search indexes (business_profiles_*_trgm_idx,
-- campaigns_*_trgm_idx, campaigns_searchVector_idx), exactly as the init
-- migration warns it would — schema.prisma can't model them, so every diff
-- reads them as drift. They were deleted from this file; the CREATE INDEX
-- statements below re-assert them so a database that already ran the dropping
-- version of this migration is repaired.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_description_trgm_idx" ON "business_profiles" USING GIN (description gin_trgm_ops);
