-- Deliverable deadline extensions, manual refund requests, and invitation
-- deadline tracking. Additive only: existing rows keep working unchanged.

-- CreateEnum
CREATE TYPE "DeliverableExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableExtensionKind" AS ENUM ('STANDARD', 'ADMIN_EXCEPTIONAL');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvitationStatus" ADD VALUE 'DEADLINE_MISSED';
ALTER TYPE "InvitationStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "contentOverdueAt" TIMESTAMP(3),
ADD COLUMN     "deliverableClosedAt" TIMESTAMP(3),
ADD COLUMN     "deliverableClosedReason" TEXT,
ADD COLUMN     "extensionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "originalContentDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "campaign_invitations" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedReason" TEXT;

-- CreateTable
CREATE TABLE "deliverable_extensions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" "DeliverableExtensionKind" NOT NULL DEFAULT 'STANDARD',
    "status" "DeliverableExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedByRole" "CampaignEventActor" NOT NULL DEFAULT 'CREATOR',
    "reason" TEXT NOT NULL,
    "proposedDeadline" TIMESTAMP(3) NOT NULL,
    "previewUrl" TEXT,
    "previousDeadline" TIMESTAMP(3),
    "decisionDueAt" TIMESTAMP(3),
    "approvedDeadline" TIMESTAMP(3),
    "decidedById" TEXT,
    "decidedByRole" "CampaignEventActor",
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "businessConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT,
    "paymentTransactionId" TEXT,
    "paymentReference" TEXT,
    "paymentMethod" TEXT,
    "reasonCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "deductionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundableAmount" DECIMAL(12,2) NOT NULL,
    "calculationNote" TEXT,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "escrowStatusBefore" TEXT,
    "initiatedByType" "CampaignEventActor" NOT NULL DEFAULT 'SYSTEM',
    "initiatedById" TEXT,
    "recipientName" TEXT,
    "recipientMethod" TEXT,
    "recipientAccount" JSONB,
    "recipientVerifiedAt" TIMESTAMP(3),
    "recipientVerifiedById" TEXT,
    "firstApprovedById" TEXT,
    "firstApprovedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "processingStartedById" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "transferMethod" TEXT,
    "transferAmount" DECIMAL(12,2),
    "transferredAt" TIMESTAMP(3),
    "transferReference" TEXT,
    "proofUrl" TEXT,
    "adminNotes" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_request_events" (
    "id" TEXT NOT NULL,
    "refundRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "CampaignEventActor" NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deliverable_extensions_applicationId_createdAt_idx" ON "deliverable_extensions"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "deliverable_extensions_status_decisionDueAt_idx" ON "deliverable_extensions"("status", "decisionDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_referenceCode_key" ON "refund_requests"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_idempotencyKey_key" ON "refund_requests"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refund_requests_status_createdAt_idx" ON "refund_requests"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "refund_requests_applicationId_idx" ON "refund_requests"("applicationId");

-- CreateIndex
CREATE INDEX "refund_requests_businessId_idx" ON "refund_requests"("businessId");

-- CreateIndex
CREATE INDEX "refund_request_events_refundRequestId_createdAt_idx" ON "refund_request_events"("refundRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_invitations_status_idx" ON "campaign_invitations"("status");

-- AddForeignKey
ALTER TABLE "deliverable_extensions" ADD CONSTRAINT "deliverable_extensions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_request_events" ADD CONSTRAINT "refund_request_events_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

