# Tests

```bash
npm test          # everything (integration tests skipped if no DB, see below)
npm run test:unit # pure-function tests only, no DB
npm run test:watch
```

## Layout

| Pattern | Kind | DB |
|---|---|---|
| `src/**/*.test.ts` | pure unit — state machine, config, DTO mapper | none |
| `test/*.int.test.ts` | integration — escrow money flows, sweeps, disputes | Postgres |

Integration tests `describe.skip` themselves when `TEST_DATABASE_URL` is unset,
so `npm test` is safe to run with no database.

## Running the integration tests

Point them at a **throwaway** database — `globalSetup.ts` runs
`prisma migrate deploy` against it and each test `TRUNCATE`s between cases.

```bash
# one-time
docker exec marketplace_postgres psql -U postgres -c 'CREATE DATABASE creatormarket_test'

# every run
TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/creatormarket_test' npm test
```

`test/setup.ts` copies `TEST_DATABASE_URL` over `DATABASE_URL` before the app's
singleton Prisma client is constructed (dotenv does not override an already-set
var), so the app code under test transparently uses the test database.
