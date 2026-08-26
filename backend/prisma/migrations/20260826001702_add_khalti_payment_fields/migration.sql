-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "khaltiPidx" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "applications_khaltiPidx_key" ON "applications"("khaltiPidx");

