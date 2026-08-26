-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropIndex
DROP INDEX "business_profiles_businessName_trgm_idx";

-- DropIndex
DROP INDEX "business_profiles_description_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_category_trgm_idx";

-- DropIndex
DROP INDEX "campaigns_searchVector_idx";

-- DropIndex
DROP INDEX "campaigns_title_trgm_idx";

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_key_key" ON "payment_methods"("key");
