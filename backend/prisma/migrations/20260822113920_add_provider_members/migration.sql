-- The five DROP INDEX statements Prisma generated here were removed: the
-- raw-SQL trigram/GIN search indexes can't be modelled in schema.prisma, so
-- every diff reads them as drift (see the init migration's warning).

-- CreateEnum
CREATE TYPE "ProviderMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER');

-- CreateTable
CREATE TABLE "provider_members" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "jobRole" TEXT,
    "accessRole" "ProviderMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "provider_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_members_memberId_status_idx" ON "provider_members"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_members_providerId_memberId_key" ON "provider_members"("providerId", "memberId");

-- AddForeignKey
ALTER TABLE "provider_members" ADD CONSTRAINT "provider_members_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_members" ADD CONSTRAINT "provider_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
