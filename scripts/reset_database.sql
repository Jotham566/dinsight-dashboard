-- Database reset (raw-SQL fallback for the dinsight DB).
--
-- Use this when you have a psql shell but no Go toolchain handy. The
-- canonical reset path is `./scripts/reset-db.sh`, which builds and
-- runs cmd/reset-db so it can also re-apply migrations and seed the
-- admin account in one step.
--
-- This file ONLY drops the schema. After running it, re-apply
-- migrations from a Go shell:
--
--   cd Dinsight_API
--   go run ./cmd/migrate up
--
-- The seed migrations (202605180001 / _190001 / _200001) provision
-- admin@disum.com / DInsight123! automatically. Set
-- DISABLE_SEED_ADMIN=true before re-running migrations to skip that.
--
-- Hand-curating a DROP TABLE list rots on every new migration. The
-- schema-level DROP CASCADE handles every current and future table,
-- plus orphans from old migrations, with no maintenance.

\echo 'Dropping public schema (CASCADE)...'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

\echo 'Done. Now run: (cd Dinsight_API && go run ./cmd/migrate up)'
