-- CreateTable
CREATE TABLE "campaign_submission_versions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "note" TEXT,
    "urls" TEXT,
    "videos" JSONB NOT NULL DEFAULT '[]',
    "files" JSONB NOT NULL DEFAULT '[]',
    "late" BOOLEAN NOT NULL DEFAULT false,
    "reviewOutcome" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_submission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_submission_versions_applicationId_version_idx" ON "campaign_submission_versions"("applicationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_submission_versions_applicationId_version_key" ON "campaign_submission_versions"("applicationId", "version");

-- AddForeignKey
ALTER TABLE "campaign_submission_versions" ADD CONSTRAINT "campaign_submission_versions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

