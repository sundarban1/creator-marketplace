-- DropIndex
DROP INDEX "conversations_businessId_idx";

-- CreateIndex
CREATE INDEX "business_profiles_isVerified_idx" ON "business_profiles"("isVerified");

-- CreateIndex
CREATE INDEX "conversations_creatorId_hiddenForCreator_lastMessageAt_idx" ON "conversations"("creatorId", "hiddenForCreator", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "conversations_businessId_hiddenForBusiness_lastMessageAt_idx" ON "conversations"("businessId", "hiddenForBusiness", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "creator_profiles_isVerified_idx" ON "creator_profiles"("isVerified");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
