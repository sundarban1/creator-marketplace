// Runs before every test file. Points the app's singleton Prisma client at the
// test database *before* src/config/env.ts reads process.env (dotenv.config()
// does not override already-set vars, so this wins).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.NODE_ENV = 'test';
// Keep the pool tiny — the whole suite is one process.
process.env.DB_CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT ?? '3';
