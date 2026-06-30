-- AlterTable
ALTER TABLE "applications" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "applications" ADD COLUMN "paidAt" TIMESTAMP(3);
