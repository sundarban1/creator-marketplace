-- Data-only: refresh the landing-hero "Popular searches" candidates. The admin
-- Settings save persists every key, so existing databases hold a stored copy
-- that shadows the new code default in admin.repository.ts DEFAULTS.
UPDATE "platform_settings"
SET "value" = '["Food creators in Biratnagar","Fitness creators in Pokhara","Beauty creators in Pokhara","Fashion creators in Nepal","TikTok creators in Pokhara","Lifestyle creators in Lalitpur","Travel creators in Pokhara","YouTube creators in Nepal","TikTok creators with 10k+ followers","Top Instagram creators in Kathmandu"]',
    "updatedAt" = NOW()
WHERE "key" = 'marketplace.popularCreatorSearches';
