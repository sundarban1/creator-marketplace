-- Competition prize payments (additive only). Existing competitions keep
-- prizePaymentMethod = NULL and fundingStatus = NOT_REQUIRED, so their
-- behaviour is unchanged.

-- CreateEnum
CREATE TYPE "CompetitionPrizePaymentMethod" AS ENUM ('KOLAB', 'DIRECT');

-- CreateEnum
CREATE TYPE "CompetitionFundingStatus" AS ENUM ('NOT_REQUIRED', 'UNFUNDED', 'PENDING', 'PARTIALLY_FUNDED', 'FUNDED', 'FAILED', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CompetitionFundingKind" AS ENUM ('CHARGE', 'REFUND');

-- CreateEnum
CREATE TYPE "CompetitionFundingTxStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompetitionPayoutStatus" AS ENUM ('NOT_READY', 'AWAITING_BUSINESS_PAYMENT', 'APPROVED', 'PROCESSING', 'AWAITING_CONFIRMATION', 'PAID', 'FAILED', 'DISPUTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "cashPrizePoolPaisa" INTEGER,
ADD COLUMN     "fundedAmountPaisa" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fundedAt" TIMESTAMP(3),
ADD COLUMN     "fundingStatus" "CompetitionFundingStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "paymentTermsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "paymentTermsAcceptedById" TEXT,
ADD COLUMN     "paymentTermsMethod" "CompetitionPrizePaymentMethod",
ADD COLUMN     "prizePaymentMethod" "CompetitionPrizePaymentMethod",
ADD COLUMN     "prizeTieRule" TEXT;

-- CreateTable
CREATE TABLE "competition_fundings" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "kind" "CompetitionFundingKind" NOT NULL DEFAULT 'CHARGE',
    "amountPaisa" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "providerTxnId" TEXT,
    "status" "CompetitionFundingTxStatus" NOT NULL DEFAULT 'INITIATED',
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "initiatedById" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_fundings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_payouts" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "awardId" TEXT,
    "prizeId" TEXT NOT NULL,
    "prizeTitle" TEXT NOT NULL,
    "prizeKind" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "method" "CompetitionPrizePaymentMethod" NOT NULL,
    "grossPaisa" INTEGER NOT NULL,
    "deductionsPaisa" INTEGER NOT NULL DEFAULT 0,
    "netPaisa" INTEGER NOT NULL,
    "status" "CompetitionPayoutStatus" NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "payoutChannel" TEXT,
    "payoutDestination" JSONB,
    "providerRef" TEXT,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "reportedAmountPaisa" INTEGER,
    "reportedPaidOn" TIMESTAMP(3),
    "reportedMethod" TEXT,
    "reportedReference" TEXT,
    "evidenceUrl" TEXT,
    "reportedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "adminVerifiedById" TEXT,
    "adminVerifiedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_payout_events" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "fromStatus" "CompetitionPayoutStatus",
    "toStatus" "CompetitionPayoutStatus" NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_payout_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competition_fundings_idempotencyKey_key" ON "competition_fundings"("idempotencyKey");

-- CreateIndex
CREATE INDEX "competition_fundings_competitionId_createdAt_idx" ON "competition_fundings"("competitionId", "createdAt");

-- CreateIndex
CREATE INDEX "competition_fundings_status_initiatedAt_idx" ON "competition_fundings"("status", "initiatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "competition_fundings_provider_providerRef_key" ON "competition_fundings"("provider", "providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "competition_payouts_awardId_key" ON "competition_payouts"("awardId");

-- CreateIndex
CREATE INDEX "competition_payouts_competitionId_status_idx" ON "competition_payouts"("competitionId", "status");

-- CreateIndex
CREATE INDEX "competition_payouts_creatorId_idx" ON "competition_payouts"("creatorId");

-- CreateIndex
CREATE INDEX "competition_payouts_status_updatedAt_idx" ON "competition_payouts"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "competition_payout_events_payoutId_createdAt_idx" ON "competition_payout_events"("payoutId", "createdAt");

-- AddForeignKey
ALTER TABLE "competition_fundings" ADD CONSTRAINT "competition_fundings_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_payouts" ADD CONSTRAINT "competition_payouts_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_payouts" ADD CONSTRAINT "competition_payouts_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "competition_awards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_payout_events" ADD CONSTRAINT "competition_payout_events_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "competition_payouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

