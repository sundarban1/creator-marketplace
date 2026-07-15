-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "businessProfileId" TEXT,
ALTER COLUMN "creatorProfileId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_businessProfileId_platform_key" ON "social_accounts"("businessProfileId", "platform");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

