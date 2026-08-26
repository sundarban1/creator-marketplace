-- Every withdrawal request now carries an auto-generated, human-readable
-- reference (e.g. "WD-A7K2QP9M") set the moment the creator submits it. It is
-- the shared handle the creator, an admin and support use to refer to one
-- request, and is distinct from `transactionReference` (the external transfer
-- id an admin records only at "Mark as Paid").

-- 1. Add nullable so the backfill can run against an already-populated table.
ALTER TABLE "withdrawals" ADD COLUMN "referenceCode" TEXT;

-- 2. Backfill pre-existing rows with a deterministic code derived from the row
--    id (md5 is stable and collision-free across distinct ids).
UPDATE "withdrawals"
SET "referenceCode" = 'WD-' || upper(substr(md5("id"), 1, 8))
WHERE "referenceCode" IS NULL;

-- 3. Lock it down: required + unique. New rows always get a value from the app.
ALTER TABLE "withdrawals" ALTER COLUMN "referenceCode" SET NOT NULL;
CREATE UNIQUE INDEX "withdrawals_referenceCode_key" ON "withdrawals"("referenceCode");
