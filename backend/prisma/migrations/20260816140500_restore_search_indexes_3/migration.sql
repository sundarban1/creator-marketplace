-- Re-restores the trigram/full-text indexes yet again — 20260816014018_add_
-- application_shortlist_status regenerated the same 4 stray "DropIndex"
-- statements described in 20260814130000_restore_search_indexes. Lesson from
-- this round: never edit an already-applied migration's .sql after the fact
-- (it desyncs the tracked checksum from the file and forces a drift
-- reset) — always add a new idempotent follow-up migration like this one
-- instead, applied via `prisma db execute` + `prisma migrate resolve --applied`.
CREATE INDEX IF NOT EXISTS "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
