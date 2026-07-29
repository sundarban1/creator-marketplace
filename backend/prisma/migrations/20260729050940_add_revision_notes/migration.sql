-- CreateTable
CREATE TABLE "revision_notes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revision_notes_applicationId_createdAt_idx" ON "revision_notes"("applicationId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "revision_notes" ADD CONSTRAINT "revision_notes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
