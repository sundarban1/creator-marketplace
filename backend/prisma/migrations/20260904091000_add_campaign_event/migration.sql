-- CreateEnum
CREATE TYPE "CampaignEventActor" AS ENUM ('BUSINESS', 'CREATOR', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "campaign_events" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicationId" TEXT,
    "axis" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "CampaignEventActor" NOT NULL DEFAULT 'SYSTEM',
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_events_campaignId_createdAt_idx" ON "campaign_events"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_events_applicationId_createdAt_idx" ON "campaign_events"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

