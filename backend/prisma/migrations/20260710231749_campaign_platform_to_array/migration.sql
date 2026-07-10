-- Add new multi-select platforms column
ALTER TABLE "campaigns" ADD COLUMN "platforms" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill from the old single-value platform column
UPDATE "campaigns" SET "platforms" = ARRAY["platform"] WHERE "platform" IS NOT NULL AND "platform" != '';

-- Drop the old single-value column
ALTER TABLE "campaigns" DROP COLUMN "platform";
