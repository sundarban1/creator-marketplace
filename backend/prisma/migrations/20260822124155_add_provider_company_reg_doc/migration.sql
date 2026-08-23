-- §5 — provider-side company registration document. Prisma's five stray
-- DROP INDEX statements for the raw-SQL search indexes were removed.

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "companyRegDocStatus" "DocumentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "companyRegDocUploadedAt" TIMESTAMP(3),
ADD COLUMN     "companyRegDocUrl" TEXT;
