-- Restores the trigram/full-text indexes that 20260816014018_add_application_
-- shortlist_status dropped (Prisma regenerates the same 4 stray "DropIndex"
-- statements described in 20260814130000_restore_search_indexes every time
-- it diffs, since schema.prisma never declares these raw-SQL indexes).
--
-- Without this, the next migration (20260816055704_add_system_message_type)
-- tries to DROP these same indexes again and fails with P3009 ("index ...
-- does not exist") because nothing recreated them in between. IF NOT EXISTS
-- makes this safe to run regardless of current state.
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
