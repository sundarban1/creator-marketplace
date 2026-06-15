-- Add isOnboarded flag to users
ALTER TABLE "users" ADD COLUMN "isOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- Add unique username to creator profiles
ALTER TABLE "creator_profiles" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "creator_profiles_username_key" ON "creator_profiles"("username");
