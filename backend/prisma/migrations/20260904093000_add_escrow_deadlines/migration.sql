-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkStatus" ADD VALUE 'CONTENT_OVERDUE';
ALTER TYPE "WorkStatus" ADD VALUE 'CREATOR_FAILED';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "businessReviewDueAt" TIMESTAMP(3),
ADD COLUMN     "businessReviewReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "contentDeadline" TIMESTAMP(3),
ADD COLUMN     "contentGraceDeadline" TIMESTAMP(3),
ADD COLUMN     "creatorConfirmationDueAt" TIMESTAMP(3),
ADD COLUMN     "creatorConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentDueAt" TIMESTAMP(3),
ADD COLUMN     "paymentReleaseAt" TIMESTAMP(3),
ADD COLUMN     "submittedLate" BOOLEAN NOT NULL DEFAULT false;

