-- NOTE: `prisma migrate dev` also generated five stray DROP INDEX statements
-- for the raw-SQL trigram/GIN search indexes (business_profiles_*_trgm_idx,
-- campaigns_*_trgm_idx, campaigns_searchVector_idx), exactly as the init
-- migration warns it would — schema.prisma can't model them, so every diff
-- reads them as drift. They were deleted from this file; the CREATE INDEX
-- statements at the bottom re-assert them so a database that already ran the
-- dropping version of this migration is repaired.

-- CreateTable
CREATE TABLE "shortlisted_campaigns" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlisted_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shortlisted_campaigns_creatorId_createdAt_idx" ON "shortlisted_campaigns"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "shortlisted_campaigns_creatorId_campaignId_key" ON "shortlisted_campaigns"("creatorId", "campaignId");

-- AddForeignKey
ALTER TABLE "shortlisted_campaigns" ADD CONSTRAINT "shortlisted_campaigns_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlisted_campaigns" ADD CONSTRAINT "shortlisted_campaigns_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_description_trgm_idx" ON "business_profiles" USING GIN (description gin_trgm_ops);
