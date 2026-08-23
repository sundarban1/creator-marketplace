-- §5 — agency legal identifiers. Prisma's five stray DROP INDEX statements
-- for the raw-SQL search indexes were removed (see the init migration).

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "companyRegNo" TEXT,
ADD COLUMN     "panNo" TEXT,
ADD COLUMN     "vatNo" TEXT;
