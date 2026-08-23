-- §5 — provider website. Prisma's five stray DROP INDEX statements for the
-- raw-SQL search indexes were removed (see the init migration's warning).

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "website" TEXT;
