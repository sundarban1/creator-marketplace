-- Deliverable content reports via "Raise an issue" (additive only).
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'DELIVERABLE';
ALTER TYPE "ReportReason" ADD VALUE IF NOT EXISTS 'SEXUAL_CONTENT';
ALTER TYPE "ReportReason" ADD VALUE IF NOT EXISTS 'ILLEGAL_CONTENT';

ALTER TABLE "applications" ADD COLUMN "deliverableHiddenAt" TIMESTAMP(3);
