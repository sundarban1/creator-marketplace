-- Escrow state machine — Phase 0 / Task 1.
-- Adds the authoritative per-engagement escrow state (applications.escrowStatus)
-- and turns payment_transactions into a fully-fledged escrow ledger (REFUND /
-- PARTIAL_REFUND movement types + an idempotency `reference` key + `metadata`).
-- Purely additive: existing reads keep using applications.paymentStatus, which
-- is still written alongside escrowStatus.

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('NOT_FUNDED', 'PAYMENT_PENDING', 'HELD', 'RELEASE_PENDING', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FROZEN');

-- AlterEnum
ALTER TYPE "PaymentTransactionType" ADD VALUE 'REFUND';
ALTER TYPE "PaymentTransactionType" ADD VALUE 'PARTIAL_REFUND';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'NOT_FUNDED';

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN "metadata" JSONB,
ADD COLUMN "reference" TEXT;

-- Backfill applications.escrowStatus from the legacy coarse paymentStatus, with
-- an open dispute (workStatus DISPUTED) mapping to FROZEN rather than HELD.
UPDATE "applications" SET "escrowStatus" =
  CASE
    WHEN "paymentStatus" = 'PAID' AND "workStatus" = 'DISPUTED' THEN 'FROZEN'::"EscrowStatus"
    WHEN "paymentStatus" = 'PAID'     THEN 'HELD'::"EscrowStatus"
    WHEN "paymentStatus" = 'RELEASED' THEN 'RELEASED'::"EscrowStatus"
    WHEN "paymentStatus" = 'REFUNDED' THEN 'REFUNDED'::"EscrowStatus"
    ELSE 'NOT_FUNDED'::"EscrowStatus"
  END;

-- Backfill payment_transactions.reference so the unique index below can be
-- created. One canonical reference per (application, type); should a legacy
-- application somehow carry two ESCROW_IN / PAYOUT rows, only the earliest is
-- keyed and the rest stay NULL (Postgres treats NULLs as distinct).
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY "applicationId", "type" ORDER BY "createdAt", id) AS rn,
    CASE "type" WHEN 'ESCROW_IN' THEN 'escrow:' WHEN 'PAYOUT' THEN 'payout:' END AS prefix,
    "applicationId"
  FROM "payment_transactions"
)
UPDATE "payment_transactions" p
SET "reference" = ranked.prefix || ranked."applicationId"
FROM ranked
WHERE p.id = ranked.id AND ranked.rn = 1 AND ranked.prefix IS NOT NULL;

-- CreateIndex
CREATE INDEX "applications_escrowStatus_idx" ON "applications"("escrowStatus");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_reference_key" ON "payment_transactions"("reference");
