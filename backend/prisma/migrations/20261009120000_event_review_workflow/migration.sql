-- Event review workflow: CHANGES_REQUESTED / REJECTED statuses, current review
-- state on campaigns, append-only campaign_reviews history.

-- CreateEnum
CREATE TYPE "CampaignReviewAction" AS ENUM ('SUBMITTED', 'RESUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CampaignStatus" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "CampaignStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "resubmissionAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reviewFeedback" TEXT,
ADD COLUMN     "reviewRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "submittedForReviewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaign_reviews" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "CampaignReviewAction" NOT NULL,
    "fromStatus" "CampaignStatus",
    "toStatus" "CampaignStatus" NOT NULL,
    "feedback" TEXT,
    "revision" INTEGER NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_reviews_campaignId_createdAt_idx" ON "campaign_reviews"("campaignId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "campaigns_status_submittedForReviewAt_idx" ON "campaigns"("status", "submittedForReviewAt");

-- AddForeignKey
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill (conservative): existing published/closed/etc. rows are untouched.
-- Events already waiting in the old PENDING_APPROVAL queue join the new queue
-- as revision 1, ordered by when they were last touched. Old admin rejections
-- (stored as CANCELLED) are ambiguous with business cancellations and stay as-is.
UPDATE "campaigns"
SET "submittedForReviewAt" = "updatedAt", "reviewRevision" = 1
WHERE "status" = 'PENDING_APPROVAL' AND "submittedForReviewAt" IS NULL;
