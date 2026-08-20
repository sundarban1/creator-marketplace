-- Re-restores the trigram/full-text indexes yet again — 20260816151815_add_
-- privacy_settings regenerated the same 4 stray "DropIndex" statements
-- described in 20260814130000_restore_search_indexes. IF NOT EXISTS makes
-- this safe regardless of current state.
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
