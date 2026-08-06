-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('ONSITE', 'REMOTE');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "locationType" "LocationType" NOT NULL DEFAULT 'ONSITE';
