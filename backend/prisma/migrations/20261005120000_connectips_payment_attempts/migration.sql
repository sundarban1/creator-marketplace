-- CreateEnum
CREATE TYPE "ConnectIpsPaymentStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'EXPIRED');

-- DropIndex
DROP INDEX "applications_connectipsTxnId_key";

-- AlterTable
ALTER TABLE "applications" DROP COLUMN "connectipsTxnId";

-- CreateTable
CREATE TABLE "connectips_payments" (
    "id" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "status" "ConnectIpsPaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "providerStatus" TEXT,
    "providerStatusDesc" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectips_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "connectips_payments_txnId_key" ON "connectips_payments"("txnId");

-- CreateIndex
CREATE INDEX "connectips_payments_applicationId_status_idx" ON "connectips_payments"("applicationId", "status");

-- CreateIndex
CREATE INDEX "connectips_payments_status_createdAt_idx" ON "connectips_payments"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "connectips_payments" ADD CONSTRAINT "connectips_payments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

