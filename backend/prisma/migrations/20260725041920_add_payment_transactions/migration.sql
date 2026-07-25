-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('ESCROW_IN', 'PAYOUT');

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "applicationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creatorId" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_transactions_applicationId_idx" ON "payment_transactions"("applicationId");

-- CreateIndex
CREATE INDEX "payment_transactions_campaignId_idx" ON "payment_transactions"("campaignId");

-- CreateIndex
CREATE INDEX "payment_transactions_createdAt_idx" ON "payment_transactions"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: recreate history for applications that already moved money before
-- this ledger existed, so the admin list isn't empty for past events.
INSERT INTO "payment_transactions" ("id", "type", "amount", "applicationId", "campaignId", "businessId", "creatorId", "createdAt")
SELECT
  'ptxn_' || substr(md5(random()::text || a."id" || 'escrow'), 1, 20),
  'ESCROW_IN',
  a."proposedRate",
  a."id",
  a."campaignId",
  c."businessId",
  a."creatorId",
  a."paidAt"
FROM "applications" a
JOIN "campaigns" c ON c."id" = a."campaignId"
WHERE a."paidAt" IS NOT NULL;

INSERT INTO "payment_transactions" ("id", "type", "amount", "applicationId", "campaignId", "businessId", "creatorId", "adminId", "createdAt")
SELECT
  'ptxn_' || substr(md5(random()::text || a."id" || 'payout'), 1, 20),
  'PAYOUT',
  a."proposedRate",
  a."id",
  a."campaignId",
  c."businessId",
  a."creatorId",
  a."releasedByAdminId",
  a."releasedAt"
FROM "applications" a
JOIN "campaigns" c ON c."id" = a."campaignId"
WHERE a."releasedAt" IS NOT NULL;
