-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "raisedByRole" "CampaignEventActor" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolutionNote" TEXT,
    "creatorAmount" DOUBLE PRECISION,
    "businessAmount" DOUBLE PRECISION,
    "resolvedByAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_reliability" (
    "creatorId" TEXT NOT NULL,
    "completedCampaigns" INTEGER NOT NULL DEFAULT 0,
    "lateCampaigns" INTEGER NOT NULL DEFAULT 0,
    "failedCampaigns" INTEGER NOT NULL DEFAULT 0,
    "missedConfirmations" INTEGER NOT NULL DEFAULT 0,
    "cancelledAfterConfirmation" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_reliability_pkey" PRIMARY KEY ("creatorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "disputes_applicationId_key" ON "disputes"("applicationId");

-- CreateIndex
CREATE INDEX "disputes_status_createdAt_idx" ON "disputes"("status", "createdAt");

-- CreateIndex
CREATE INDEX "disputes_campaignId_idx" ON "disputes"("campaignId");

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_reliability" ADD CONSTRAINT "creator_reliability_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

