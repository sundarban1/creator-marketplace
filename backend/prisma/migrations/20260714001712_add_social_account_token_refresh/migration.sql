-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "followersSyncedAt" TIMESTAMP(3),
ADD COLUMN     "oauthConnectionType" TEXT,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);
