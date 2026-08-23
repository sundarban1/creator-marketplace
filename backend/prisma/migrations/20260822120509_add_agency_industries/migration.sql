-- §6 — industries an AGENCY serves. The five DROP INDEX statements Prisma
-- generated alongside this were removed: the raw-SQL trigram/GIN search
-- indexes can't be modelled in schema.prisma, so every diff reads them as
-- drift (see the init migration's warning).

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "industries" TEXT[] DEFAULT ARRAY[]::TEXT[];
