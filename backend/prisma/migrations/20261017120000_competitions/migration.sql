-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'AWAITING_RESULTS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CompetitionStageStatus" AS ENUM ('UPCOMING', 'OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING', 'RESULTS_PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CompetitionParticipantStatus" AS ENUM ('ACTIVE', 'NOT_SELECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CompetitionSubmissionMethod" AS ENUM ('VIDEO_UPLOAD', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "CompetitionDecisionValue" AS ENUM ('ADVANCE', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "CompetitionModerationFlag" AS ENUM ('NONE', 'FLAGGED', 'UNDER_INVESTIGATION', 'CLEARED');

-- CreateEnum
CREATE TYPE "CompetitionResultsVisibility" AS ENUM ('PUBLIC', 'PARTICIPANTS');

-- CreateEnum
CREATE TYPE "CompetitionReviewAction" AS ENUM ('SUBMITTED', 'RESUBMITTED', 'WITHDRAWN', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'EDIT_SUBMITTED', 'EDIT_APPROVED', 'EDIT_REJECTED');

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'COMPETITION';

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" TEXT,
    "coverImageUrl" TEXT,
    "rules" TEXT NOT NULL,
    "eligibility" TEXT,
    "contentFormats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submissionInstructions" TEXT,
    "videoMinSec" INTEGER,
    "videoMaxSec" INTEGER,
    "contactInstructions" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "resultsVisibility" "CompetitionResultsVisibility" NOT NULL DEFAULT 'PUBLIC',
    "publishAt" TIMESTAMP(3),
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allowSubmissionEdits" BOOLEAN NOT NULL DEFAULT true,
    "onePrizePerCreator" BOOLEAN NOT NULL DEFAULT true,
    "scoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "judgingCriteria" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "resultsPublishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "moderationFlag" "CompetitionModerationFlag" NOT NULL DEFAULT 'NONE',
    "moderationNote" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "reviewFeedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedForReviewAt" TIMESTAMP(3),
    "resubmissionAllowed" BOOLEAN NOT NULL DEFAULT true,
    "reviewRevision" INTEGER NOT NULL DEFAULT 0,
    "pendingChanges" JSONB,
    "pendingChangesSubmittedAt" TIMESTAMP(3),
    "pendingChangesFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_reviews" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "CompetitionReviewAction" NOT NULL,
    "feedback" TEXT,
    "revision" INTEGER NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_stages" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brief" TEXT,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "CompetitionStageStatus" NOT NULL DEFAULT 'UPCOMING',
    "advanceLimit" INTEGER,
    "allowedMethods" TEXT[] DEFAULT ARRAY['VIDEO_UPLOAD', 'EXTERNAL_LINK']::TEXT[],
    "videoMinSec" INTEGER,
    "videoMaxSec" INTEGER,
    "requirements" TEXT,
    "openedAt" TIMESTAMP(3),
    "submissionsClosedAt" TIMESTAMP(3),
    "resultsPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_participants" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "CompetitionParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStageOrder" INTEGER NOT NULL DEFAULT 1,
    "eliminatedAtOrder" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_submissions" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "method" "CompetitionSubmissionMethod" NOT NULL,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "storageRef" TEXT,
    "storageProvider" TEXT,
    "durationSec" INTEGER,
    "sizeBytes" INTEGER,
    "externalUrl" TEXT,
    "caption" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_submission_versions" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "method" "CompetitionSubmissionMethod" NOT NULL,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "externalUrl" TEXT,
    "durationSec" INTEGER,
    "caption" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_submission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_stage_decisions" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "decision" "CompetitionDecisionValue",
    "notes" TEXT,
    "scores" JSONB,
    "totalScore" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "decidedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_stage_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_prizes" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PLACEMENT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "recipientCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_awards" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "competitions_businessId_idx" ON "competitions"("businessId");

-- CreateIndex
CREATE INDEX "competitions_status_registrationDeadline_idx" ON "competitions"("status", "registrationDeadline");

-- CreateIndex
CREATE INDEX "competitions_status_publishAt_idx" ON "competitions"("status", "publishAt");

-- CreateIndex
CREATE INDEX "competitions_status_submittedForReviewAt_idx" ON "competitions"("status", "submittedForReviewAt");

-- CreateIndex
CREATE INDEX "competition_reviews_competitionId_createdAt_idx" ON "competition_reviews"("competitionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "competition_stages_status_deadline_idx" ON "competition_stages"("status", "deadline");

-- CreateIndex
CREATE INDEX "competition_stages_status_opensAt_idx" ON "competition_stages"("status", "opensAt");

-- CreateIndex
CREATE UNIQUE INDEX "competition_stages_competitionId_order_key" ON "competition_stages"("competitionId", "order");

-- CreateIndex
CREATE INDEX "competition_participants_creatorId_idx" ON "competition_participants"("creatorId");

-- CreateIndex
CREATE INDEX "competition_participants_competitionId_status_currentStageO_idx" ON "competition_participants"("competitionId", "status", "currentStageOrder");

-- CreateIndex
CREATE UNIQUE INDEX "competition_participants_competitionId_creatorId_key" ON "competition_participants"("competitionId", "creatorId");

-- CreateIndex
CREATE INDEX "competition_submissions_participantId_idx" ON "competition_submissions"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_submissions_stageId_participantId_key" ON "competition_submissions"("stageId", "participantId");

-- CreateIndex
CREATE INDEX "competition_submission_versions_submissionId_version_idx" ON "competition_submission_versions"("submissionId", "version");

-- CreateIndex
CREATE INDEX "competition_stage_decisions_stageId_decision_idx" ON "competition_stage_decisions"("stageId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "competition_stage_decisions_stageId_participantId_key" ON "competition_stage_decisions"("stageId", "participantId");

-- CreateIndex
CREATE INDEX "competition_prizes_competitionId_position_idx" ON "competition_prizes"("competitionId", "position");

-- CreateIndex
CREATE INDEX "competition_awards_competitionId_isPublished_idx" ON "competition_awards"("competitionId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "competition_awards_prizeId_participantId_key" ON "competition_awards"("prizeId", "participantId");

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_reviews" ADD CONSTRAINT "competition_reviews_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_stages" ADD CONSTRAINT "competition_stages_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_submissions" ADD CONSTRAINT "competition_submissions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "competition_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_submissions" ADD CONSTRAINT "competition_submissions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "competition_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_submission_versions" ADD CONSTRAINT "competition_submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "competition_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_stage_decisions" ADD CONSTRAINT "competition_stage_decisions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "competition_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_stage_decisions" ADD CONSTRAINT "competition_stage_decisions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "competition_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_prizes" ADD CONSTRAINT "competition_prizes_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_awards" ADD CONSTRAINT "competition_awards_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_awards" ADD CONSTRAINT "competition_awards_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "competition_prizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_awards" ADD CONSTRAINT "competition_awards_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "competition_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

