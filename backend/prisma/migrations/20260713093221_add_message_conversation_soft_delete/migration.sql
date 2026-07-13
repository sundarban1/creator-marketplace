-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "hiddenForBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenForCreator" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "hiddenForBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenForCreator" BOOLEAN NOT NULL DEFAULT false;
