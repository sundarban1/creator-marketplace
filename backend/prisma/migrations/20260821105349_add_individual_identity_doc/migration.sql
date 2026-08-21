-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "identityDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "identityDocUploadedAt" TIMESTAMP(3),
ADD COLUMN     "identityDocUrl" TEXT;

-- NOTE: `prisma migrate dev` also generated five stray DROP INDEX statements
-- for the raw-SQL trigram/GIN search indexes, exactly as the init migration
-- warns it will — schema.prisma cannot model them, so every diff reads them as
-- drift. Deleted here; the statements below re-assert them so a database that
-- somehow lost them is repaired.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_description_trgm_idx" ON "business_profiles" USING GIN (description gin_trgm_ops);
