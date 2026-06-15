-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';

-- Remove the default after adding (column is now required from app layer)
ALTER TABLE "users" ALTER COLUMN "phone" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
