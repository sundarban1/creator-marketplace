-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "panDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "panDocUploadedAt" TIMESTAMP(3),
ADD COLUMN     "panDocUrl" TEXT;
