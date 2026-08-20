-- One-time reset migration. Runs first (its timestamp sorts before every
-- other migration) and wipes every table, enum type, view, and sequence in
-- the "public" schema before the squashed 20260820000001_init
-- migration recreates the schema from scratch. This exists to let the
-- 43 previously-applied migrations be squashed into one without carrying
-- forward their history — see 20260820000001_init.
--
-- "_prisma_migrations" itself is deliberately excluded: it's what Prisma is
-- using right now to record that this migration ran, so dropping it here
-- would break the deploy mid-transaction.
--
-- Safe to run against an already-empty database (every loop is a no-op).

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop views first — they can depend on tables/other views.
  FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
  END LOOP;

  -- Drop tables (CASCADE also drops dependent constraints/indexes/triggers).
  FOR r IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  ) LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;

  -- Drop any standalone sequences not already removed via table CASCADE.
  FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
    EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
  END LOOP;

  -- Drop enum types (Prisma enums become Postgres ENUM types). Deliberately
  -- scoped to 'e' only, not 'c' (composite) — every table implicitly owns a
  -- composite row type of the same name, so including 'c' here tries to drop
  -- _prisma_migrations's own row type mid-transaction and fails with 2BP01.
  FOR r IN (
    SELECT t.typname FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  ) LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;

  -- Drop functions this schema manages via raw SQL (see init's search section).
  -- Excludes functions owned by an extension (e.g. pg_trgm's
  -- gin_extract_query_trgm) — those can only be removed by dropping the
  -- extension itself, not the individual function.
  FOR r IN (
    SELECT p.proname, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;
