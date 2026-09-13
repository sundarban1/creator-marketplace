-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RedemptionSessionStatus" AS ENUM ('ISSUED', 'SCANNED', 'BILL_ENTERED', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreatorPointsTransactionType" AS ENUM ('CAMPAIGN_REWARD', 'PROMO_REDEMPTION_DEBIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BusinessCreditsTransactionType" AS ENUM ('PROMO_REDEMPTION_CREDIT', 'CAMPAIGN_BUDGET_SPEND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "discountType" "PromotionDiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscountCap" DOUBLE PRECISION,
    "dailyRedemptionLimit" INTEGER,
    "totalRedemptionLimit" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_sessions" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "RedemptionSessionStatus" NOT NULL DEFAULT 'ISSUED',
    "promotionSnapshot" JSONB NOT NULL,
    "billAmount" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "pointsCost" INTEGER,
    "creditsEarned" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scannedAt" TIMESTAMP(3),
    "scannedByUserId" TEXT,
    "billEnteredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "redemption_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_points_accounts" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_points_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_points_ledger" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "CreatorPointsTransactionType" NOT NULL,
    "direction" "WalletDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_points_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_credits_accounts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_credits_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_credits_ledger" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "BusinessCreditsTransactionType" NOT NULL,
    "direction" "WalletDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_credits_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_businessId_status_idx" ON "promotions"("businessId", "status");

-- CreateIndex
CREATE INDEX "promotions_status_validFrom_validUntil_idx" ON "promotions"("status", "validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_sessions_token_key" ON "redemption_sessions"("token");

-- CreateIndex
CREATE INDEX "redemption_sessions_promotionId_status_issuedAt_idx" ON "redemption_sessions"("promotionId", "status", "issuedAt");

-- CreateIndex
CREATE INDEX "redemption_sessions_creatorId_status_idx" ON "redemption_sessions"("creatorId", "status");

-- CreateIndex
CREATE INDEX "redemption_sessions_status_expiresAt_idx" ON "redemption_sessions"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "creator_points_accounts_creatorId_key" ON "creator_points_accounts"("creatorId");

-- CreateIndex
CREATE INDEX "creator_points_ledger_creatorId_createdAt_idx" ON "creator_points_ledger"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "creator_points_ledger_referenceId_type_key" ON "creator_points_ledger"("referenceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "business_credits_accounts_businessId_key" ON "business_credits_accounts"("businessId");

-- CreateIndex
CREATE INDEX "business_credits_ledger_businessId_createdAt_idx" ON "business_credits_ledger"("businessId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "business_credits_ledger_referenceId_type_key" ON "business_credits_ledger"("referenceId", "type");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_sessions" ADD CONSTRAINT "redemption_sessions_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_sessions" ADD CONSTRAINT "redemption_sessions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_sessions" ADD CONSTRAINT "redemption_sessions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_points_accounts" ADD CONSTRAINT "creator_points_accounts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_points_ledger" ADD CONSTRAINT "creator_points_ledger_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_credits_accounts" ADD CONSTRAINT "business_credits_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_credits_ledger" ADD CONSTRAINT "business_credits_ledger_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
