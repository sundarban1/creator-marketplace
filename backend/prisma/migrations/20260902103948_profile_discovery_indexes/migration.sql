-- Discovery/search performance indexes for the two most-browsed tables.
-- All are additive (no data change, no column change). Safe to apply to a
-- populated production database, but a plain CREATE INDEX takes an ACCESS
-- EXCLUSIVE lock for the build; on prod, run each of these once as
--   CREATE INDEX CONCURRENTLY ...
-- by hand instead, then `prisma migrate resolve --applied 20260902103948_profile_discovery_indexes`.
-- IF NOT EXISTS keeps that path idempotent.

-- CreatorProfile: default Explore ordering is createdAt DESC, id ASC
CREATE INDEX IF NOT EXISTS "creator_profiles_createdAt_idx" ON "creator_profiles" ("createdAt" DESC);

-- CreatorProfile: categories / industries filtered with array hasSome
CREATE INDEX IF NOT EXISTS "creator_profiles_categories_idx" ON "creator_profiles" USING GIN ("categories");
CREATE INDEX IF NOT EXISTS "creator_profiles_industries_idx" ON "creator_profiles" USING GIN ("industries");

-- BusinessProfile: categories filtered with array `has`; ordered by
-- isVerified DESC, businessName ASC
CREATE INDEX IF NOT EXISTS "business_profiles_categories_idx" ON "business_profiles" USING GIN ("categories");
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_idx" ON "business_profiles" ("businessName");
CREATE INDEX IF NOT EXISTS "business_profiles_createdAt_idx" ON "business_profiles" ("createdAt" DESC);
