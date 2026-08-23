-- §3 step 4 — provider service mode. Prisma's five stray DROP INDEX
-- statements for the raw-SQL search indexes were removed.

-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('CLIENT_LOCATION', 'MY_LOCATION', 'ONLINE', 'HYBRID');

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "serviceMode" "ServiceMode";
