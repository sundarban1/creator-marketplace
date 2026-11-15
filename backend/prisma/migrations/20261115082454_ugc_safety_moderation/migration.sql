-- CreateEnum
CREATE TYPE "ReportVerification" AS ENUM ('UNVERIFIED', 'VALID', 'INVALID', 'NEEDS_MORE_INFORMATION');

-- CreateEnum
CREATE TYPE "ReportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ModerationEventType" AS ENUM ('USER_BLOCKED', 'USER_UNBLOCKED', 'CONTENT_AUTO_REJECTED', 'CONTENT_HELD_FOR_REVIEW', 'MODERATION_SERVICE_ERROR');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('REMOVE_CONTENT', 'RESTORE_CONTENT', 'WARN_USER', 'RESTRICT_MESSAGING', 'SUSPEND_TEMPORARY', 'SUSPEND_PERMANENT', 'LIFT_RESTRICTIONS', 'NO_ACTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportReason" ADD VALUE 'HATE_SPEECH';
ALTER TYPE "ReportReason" ADD VALUE 'VIOLENCE';
ALTER TYPE "ReportReason" ADD VALUE 'COPYRIGHT';
ALTER TYPE "ReportReason" ADD VALUE 'EXPLOITATION';
ALTER TYPE "ReportReason" ADD VALUE 'AGE_INAPPROPRIATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportStatus" ADD VALUE 'NEEDS_MORE_INFO';
ALTER TYPE "ReportStatus" ADD VALUE 'RESOLVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportTargetType" ADD VALUE 'COMPETITION_SUBMISSION';
ALTER TYPE "ReportTargetType" ADD VALUE 'PORTFOLIO_ITEM';

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "contentFlaggedAt" TIMESTAMP(3),
ADD COLUMN     "moderationHiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "competition_submissions" ADD COLUMN     "moderationHiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "portfolio_items" ADD COLUMN     "moderationHiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "priority" "ReportPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "reportedUserId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "reviewStartedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verification" "ReportVerification" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "messagingRestrictedUntil" TIMESTAMP(3),
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "moderation_events" (
    "id" TEXT NOT NULL,
    "type" "ModerationEventType" NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "reportId" TEXT,
    "contentType" TEXT,
    "contentId" TEXT,
    "metadata" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "targetUserId" TEXT,
    "adminId" TEXT NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "contentType" TEXT,
    "contentId" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "durationDays" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "guidelinesVersion" TEXT NOT NULL,
    "privacyVersion" TEXT,
    "ageConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "platform" TEXT,
    "ipAddress" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_events_type_createdAt_idx" ON "moderation_events"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "moderation_events_targetUserId_idx" ON "moderation_events"("targetUserId");

-- CreateIndex
CREATE INDEX "moderation_events_actorUserId_idx" ON "moderation_events"("actorUserId");

-- CreateIndex
CREATE INDEX "moderation_actions_reportId_idx" ON "moderation_actions"("reportId");

-- CreateIndex
CREATE INDEX "moderation_actions_targetUserId_createdAt_idx" ON "moderation_actions"("targetUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "terms_acceptances_userId_acceptedAt_idx" ON "terms_acceptances"("userId", "acceptedAt" DESC);

-- CreateIndex
CREATE INDEX "reports_reportedUserId_idx" ON "reports"("reportedUserId");

-- CreateIndex
CREATE INDEX "reports_reporterId_targetType_targetId_idx" ON "reports"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "reports_assignedToId_idx" ON "reports"("assignedToId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Self-blocking is meaningless and is rejected by the API; enforce it in the DB
-- too. NOT VALID so any legacy row can't fail the migration — new rows are
-- still checked.
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_no_self_block" CHECK ("blockerId" <> "blockedId") NOT VALID;
