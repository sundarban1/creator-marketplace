CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_accounts_creatorProfileId_platform_key" ON "social_accounts"("creatorProfileId", "platform");

ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_creatorProfileId_fkey"
    FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
