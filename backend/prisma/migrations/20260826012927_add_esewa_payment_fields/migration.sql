-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "esewaTransactionUuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "applications_esewaTransactionUuid_key" ON "applications"("esewaTransactionUuid");
