-- Public event detail-page view counter (deduped per visitor per 24h in app code).
ALTER TABLE "campaigns" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
