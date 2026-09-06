-- CreateEnum
CREATE TYPE "BudgetRateType" AS ENUM ('FIXED', 'RANGE');

-- CreateEnum
CREATE TYPE "BudgetInputType" AS ENUM ('PER_CREATOR', 'TOTAL');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "budgetInputType" "BudgetInputType",
ADD COLUMN     "budgetRateType" "BudgetRateType",
ADD COLUMN     "totalBudget" DOUBLE PRECISION;

-- Backfill existing rows: per-creator bounds are already what budgetMin/budgetMax
-- hold, so a flat fee is min == max, and the campaign-wide total is the
-- per-creator ceiling times the number of creators.
UPDATE "campaigns"
SET "budgetRateType"  = CASE WHEN "budgetMin" = "budgetMax" THEN 'FIXED'::"BudgetRateType" ELSE 'RANGE'::"BudgetRateType" END,
    "budgetInputType" = 'PER_CREATOR'::"BudgetInputType",
    "totalBudget"     = "creatorsNeeded" * "budgetMax";
