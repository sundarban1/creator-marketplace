-- Creator skills split out from content formats.
ALTER TABLE "competitions" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
