-- CreateEnum
CREATE TYPE "RequirementBudgetType" AS ENUM ('FIXED', 'RANGE', 'NEGOTIABLE');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'WITHDRAWN';

-- DropIndex
-- Replaced below by two partial unique indexes (Prisma's @@unique can't
-- express "unique except when null" — see the comment above Application's
-- @@index([campaignId, creatorId]) in schema.prisma).
DROP INDEX "applications_campaignId_creatorId_key";

-- NOTE: the auto-generated DROP INDEX statements for the four raw-SQL-managed
-- trigram/full-text search indexes (business_profiles_businessName_trgm_idx,
-- campaigns_category_trgm_idx, campaigns_searchVector_idx,
-- campaigns_title_trgm_idx) were deliberately removed from this migration —
-- Prisma always regenerates them because those indexes are invisible to
-- schema.prisma (see 20260722103717_add_campaign_fulltext_search and
-- 20260814130000_restore_search_indexes). Do not re-add them.

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "requirementId" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "group" TEXT;

-- CreateTable
CREATE TABLE "campaign_requirements" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "budgetType" "RequirementBudgetType" NOT NULL DEFAULT 'FIXED',
    "budgetFixed" DOUBLE PRECISION,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "deliverables" TEXT,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_requirements_campaignId_idx" ON "campaign_requirements"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_requirements_categoryId_idx" ON "campaign_requirements"("categoryId");

-- CreateIndex
CREATE INDEX "applications_campaignId_creatorId_idx" ON "applications"("campaignId", "creatorId");

-- CreateIndex
CREATE INDEX "applications_requirementId_idx" ON "applications"("requirementId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "campaign_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_requirements" ADD CONSTRAINT "campaign_requirements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_requirements" ADD CONSTRAINT "campaign_requirements_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Two-part uniqueness replacing the old plain @@unique([campaignId, creatorId]):
-- simple campaigns (requirementId IS NULL, the common case, unchanged from
-- today) keep exactly one application per creator per campaign; multi-role
-- campaigns allow one application per creator PER REQUIREMENT, so a provider
-- with multiple categories can apply to two different roles in the same
-- campaign (e.g. Photographer + Content Creator) without violating uniqueness.
CREATE UNIQUE INDEX "applications_campaign_creator_no_requirement_key" ON "applications"("campaignId", "creatorId") WHERE "requirementId" IS NULL;
CREATE UNIQUE INDEX "applications_campaign_creator_requirement_key" ON "applications"("campaignId", "creatorId", "requirementId") WHERE "requirementId" IS NOT NULL;
