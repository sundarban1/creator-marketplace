-- Re-restores the trigram/full-text indexes that 20260815152737_add_service_requests
-- dropped again (Prisma regenerates those same 4 stray "DropIndex" statements
-- on every migration it diffs, since schema.prisma never declares these
-- raw-SQL indexes — see 20260814130000_restore_search_indexes for the full
-- explanation). IF NOT EXISTS makes this safe to run even when the indexes
-- are already present (e.g. restored by hand outside a tracked migration).
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
