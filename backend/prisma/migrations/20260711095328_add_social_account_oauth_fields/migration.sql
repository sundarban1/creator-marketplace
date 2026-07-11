-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "connectedViaOAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformUserId" TEXT;
