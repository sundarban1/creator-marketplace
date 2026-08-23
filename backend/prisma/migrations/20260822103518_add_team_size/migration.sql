-- §4 — team size for TEAM providers. The five DROP INDEX statements Prisma
-- generated alongside this were removed: schema.prisma can't model the raw-SQL
-- trigram/GIN search indexes, so every diff reads them as drift (see the init
-- migration's warning).

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "teamSize" INTEGER;
