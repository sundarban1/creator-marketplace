-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'BUSINESS', 'SERVICE', 'OPPORTUNITY', 'POST', 'MESSAGE', 'REVIEW');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'SCAM', 'FRAUD', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'FAKE_PROFILE', 'PAYMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'ACTION_TAKEN', 'DISMISSED');

-- DropIndex
DROP INDEX "business_profiles_businessName_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_category_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_searchVector_idx";

-- DropIndex
DROP INDEX "campaigns_title_trgm_idx";

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'NEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "actionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
