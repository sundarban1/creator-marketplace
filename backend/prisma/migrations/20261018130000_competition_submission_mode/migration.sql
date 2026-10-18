-- One deadline for all entries (SINGLE) vs a deadline per stage (PER_STAGE).
CREATE TYPE "CompetitionSubmissionMode" AS ENUM ('PER_STAGE', 'SINGLE');
ALTER TABLE "competitions" ADD COLUMN "submissionMode" "CompetitionSubmissionMode" NOT NULL DEFAULT 'PER_STAGE';
