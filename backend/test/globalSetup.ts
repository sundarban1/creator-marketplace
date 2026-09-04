import { execSync } from 'child_process';

// Brings the test database up to the current schema once per `vitest` run.
// No-op when TEST_DATABASE_URL is unset — the pure unit tests still run.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn('[test] TEST_DATABASE_URL not set — integration tests will be skipped');
    return;
  }
  console.log('[test] applying migrations to the test database…');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
