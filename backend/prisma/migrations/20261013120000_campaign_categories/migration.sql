-- Up to 3 creator types per campaign; `category` stays the primary (categories[0]).
ALTER TABLE "campaigns" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "campaigns" SET "categories" = ARRAY["category"] WHERE "category" <> '';
