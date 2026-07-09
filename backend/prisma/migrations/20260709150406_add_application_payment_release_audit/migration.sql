-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "releasedByAdminId" TEXT;
