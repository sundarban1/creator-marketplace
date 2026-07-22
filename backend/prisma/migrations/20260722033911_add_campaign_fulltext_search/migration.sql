-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "searchVector" tsvector;

-- Trigram support: typo-tolerant / partial matching via similarity() on
-- title (and business name), on top of exact-token full-text search below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Weighted full-text index, mirroring relevance order:
--   A: title, category, hashtags       — highest-signal, exact-match-worthy
--   B: location, venue                  — where it's happening
--   C: description, sampleCaption, targetAudience, contentGuidelines — long-form context
CREATE FUNCTION campaigns_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(NEW.hashtags, ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '') || ' ' || coalesce(NEW.venue, '')), 'B') ||
    setweight(to_tsvector('english',
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW."sampleCaption", '') || ' ' ||
      array_to_string(NEW."targetAudience", ' ') || ' ' ||
      array_to_string(NEW."contentGuidelines", ' ')
    ), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "campaigns"
  FOR EACH ROW EXECUTE FUNCTION campaigns_search_vector_update();

-- Backfill existing rows — the trigger above only fires on future inserts/updates.
UPDATE "campaigns" SET "searchVector" =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'A') ||
  setweight(to_tsvector('english', array_to_string(hashtags, ' ')), 'A') ||
  setweight(to_tsvector('english', coalesce(location, '') || ' ' || coalesce(venue, '')), 'B') ||
  setweight(to_tsvector('english',
    coalesce(description, '') || ' ' ||
    coalesce("sampleCaption", '') || ' ' ||
    array_to_string("targetAudience", ' ') || ' ' ||
    array_to_string("contentGuidelines", ' ')
  ), 'C');

CREATE INDEX "campaigns_searchVector_idx" ON "campaigns" USING GIN ("searchVector");
CREATE INDEX "campaigns_title_trgm_idx" ON "campaigns" USING GIN (title gin_trgm_ops);
CREATE INDEX "campaigns_category_trgm_idx" ON "campaigns" USING GIN (category gin_trgm_ops);
CREATE INDEX "business_profiles_businessName_trgm_idx" ON "business_profiles" USING GIN ("businessName" gin_trgm_ops);
