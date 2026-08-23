-- §13/§16 — team member assignment to a won booking. Prisma's five stray
-- DROP INDEX statements for the raw-SQL search indexes were removed.

-- CreateTable
CREATE TABLE "application_assignments" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_assignments_memberId_assignedAt_idx" ON "application_assignments"("memberId", "assignedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "application_assignments_applicationId_memberId_key" ON "application_assignments"("applicationId", "memberId");

-- AddForeignKey
ALTER TABLE "application_assignments" ADD CONSTRAINT "application_assignments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_assignments" ADD CONSTRAINT "application_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
