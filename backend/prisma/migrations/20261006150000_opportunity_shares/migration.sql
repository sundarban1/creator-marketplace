-- CreateEnum
CREATE TYPE "SharePlatform" AS ENUM ('WHATSAPP', 'SMS', 'COPY_LINK', 'NATIVE_SHARE', 'OTHER');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "opportunityShareId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "signupShareId" TEXT;

-- CreateTable
CREATE TABLE "opportunity_shares" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sharerId" TEXT NOT NULL,
    "platform" "SharePlatform" NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_shares_token_key" ON "opportunity_shares"("token");

-- CreateIndex
CREATE INDEX "opportunity_shares_sharerId_createdAt_idx" ON "opportunity_shares"("sharerId", "createdAt");

-- CreateIndex
CREATE INDEX "opportunity_shares_campaignId_idx" ON "opportunity_shares"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_shares_campaignId_sharerId_platform_key" ON "opportunity_shares"("campaignId", "sharerId", "platform");

-- CreateIndex
CREATE INDEX "applications_opportunityShareId_idx" ON "applications"("opportunityShareId");

-- CreateIndex
CREATE INDEX "users_signupShareId_idx" ON "users"("signupShareId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_signupShareId_fkey" FOREIGN KEY ("signupShareId") REFERENCES "opportunity_shares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_opportunityShareId_fkey" FOREIGN KEY ("opportunityShareId") REFERENCES "opportunity_shares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_shares" ADD CONSTRAINT "opportunity_shares_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_shares" ADD CONSTRAINT "opportunity_shares_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

