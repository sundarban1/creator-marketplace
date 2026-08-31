-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "invitationGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "invitationImageKey" TEXT,
ADD COLUMN     "invitationImageUrl" TEXT,
ADD COLUMN     "invitationTemplateId" TEXT DEFAULT 'elegant',
ADD COLUMN     "invitationVersion" INTEGER NOT NULL DEFAULT 0;
