-- AlterTable
ALTER TABLE "applications" ADD COLUMN "connectipsTxnId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "applications_connectipsTxnId_key" ON "applications"("connectipsTxnId");
