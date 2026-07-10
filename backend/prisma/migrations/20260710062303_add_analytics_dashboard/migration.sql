-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_analytics" (
    "userId" TEXT NOT NULL,
    "totalProfileViews" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invitationsReceived" INTEGER NOT NULL DEFAULT 0,
    "applicationsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "applicationsAccepted" INTEGER NOT NULL DEFAULT 0,
    "applicationsRejected" INTEGER NOT NULL DEFAULT 0,
    "activeCampaigns" INTEGER NOT NULL DEFAULT 0,
    "completedCampaigns" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "responseTimeAvgMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTimeSamples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_analytics_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "brand_analytics" (
    "userId" TEXT NOT NULL,
    "campaignsCreated" INTEGER NOT NULL DEFAULT 0,
    "activeCampaigns" INTEGER NOT NULL DEFAULT 0,
    "completedCampaigns" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicationsReceived" INTEGER NOT NULL DEFAULT 0,
    "creatorsHired" INTEGER NOT NULL DEFAULT 0,
    "averageRatingGiven" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingsGivenCount" INTEGER NOT NULL DEFAULT 0,
    "responseTimeAvgMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responseTimeSamples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_analytics_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "profile_views_creatorId_viewedAt_idx" ON "profile_views"("creatorId", "viewedAt");

-- CreateIndex
CREATE INDEX "profile_views_creatorId_businessId_viewedAt_idx" ON "profile_views"("creatorId", "businessId", "viewedAt");

-- CreateIndex
CREATE INDEX "reviews_toUserId_idx" ON "reviews"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_applicationId_fromUserId_key" ON "reviews"("applicationId", "fromUserId");

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
