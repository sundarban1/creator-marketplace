/*
  Warnings:

  - Added the required column `updatedAt` to the `withdrawals` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('BANK', 'ESEWA', 'KHALTI');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CAMPAIGN_PAYOUT', 'REFERRAL_REWARD', 'REFERRAL_BONUS', 'WITHDRAWAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "payoutMethodId" TEXT,
ADD COLUMN     "payoutSnapshot" JSONB,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processedByAdminId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "screenshotUrl" TEXT,
ADD COLUMN     "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "transactionReference" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "payout_methods" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "PayoutMethodType" NOT NULL,
    "label" TEXT,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT,
    "branch" TEXT,
    "accountNumber" TEXT,
    "walletId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "direction" "WalletDirection" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_methods_creatorId_idx" ON "payout_methods"("creatorId");

-- CreateIndex
CREATE INDEX "wallet_transactions_creatorId_createdAt_idx" ON "wallet_transactions"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_referenceId_type_key" ON "wallet_transactions"("referenceId", "type");

-- CreateIndex
CREATE INDEX "withdrawals_status_createdAt_idx" ON "withdrawals"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "payout_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
