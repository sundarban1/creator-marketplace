-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_slug_key" ON "business_profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_slug_key" ON "campaigns"("slug");
