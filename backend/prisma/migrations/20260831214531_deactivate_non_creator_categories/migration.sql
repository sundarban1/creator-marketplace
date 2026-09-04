-- The app now connects content creators with businesses only. The older broad
-- "provider role" taxonomy (Photographer, Videographer, DJ, Dancer, Singer,
-- Model, Makeup Artist, Event Planner, Host/MC, Graphic Designer, …) is retired.
--
-- Deactivate (not delete) every CREATOR-scope category except the surviving
-- content-creator family. Deletion is unsafe: campaign_requirements.categoryId
-- is ON DELETE RESTRICT and legacy multi-role campaigns still reference these
-- rows. Deactivating hides them from every public picker
-- (CategoryRepository.findManyPublic filters status = 'ACTIVE') and from the
-- campaign-AI provider-type list, while legacy campaigns keep rendering.
--
-- Reversible: set status back to 'ACTIVE' to restore a row.

UPDATE "categories"
SET "status" = 'INACTIVE'
WHERE "scope" = 'CREATOR'
  AND "key" NOT IN (
    'content-creator',
    'ugc-creator',
    'influencer',
    'social-media-creator',
    'other-provider'
  );
