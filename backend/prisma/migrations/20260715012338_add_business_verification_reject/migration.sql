-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "verificationRejectReason" TEXT,
ADD COLUMN     "verificationRejectedAt" TIMESTAMP(3);
