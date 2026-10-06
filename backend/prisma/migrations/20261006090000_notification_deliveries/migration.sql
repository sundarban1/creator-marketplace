-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "applicationId" TEXT,
    "campaignId" TEXT,
    "notificationId" TEXT,
    "pushSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_dedupeKey_key" ON "notification_deliveries"("dedupeKey");

-- CreateIndex
CREATE INDEX "notification_deliveries_userId_createdAt_idx" ON "notification_deliveries"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notification_deliveries_applicationId_idx" ON "notification_deliveries"("applicationId");

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
