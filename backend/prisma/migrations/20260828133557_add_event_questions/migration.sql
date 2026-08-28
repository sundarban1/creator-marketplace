-- CreateTable
CREATE TABLE "event_questions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_questions_campaignId_createdAt_idx" ON "event_questions"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
