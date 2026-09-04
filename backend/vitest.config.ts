import { defineConfig } from 'vitest/config';

// Two kinds of tests live side by side:
//   *.unit.test.ts  — pure functions, no DB, always run
//   *.int.test.ts   — hit a real Postgres (TEST_DATABASE_URL); skipped when unset
// `npm test` runs both; `npm run test:unit` runs only the pure ones.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    setupFiles: ['test/setup.ts'],
    // Integration tests share one Postgres schema and truncate between tests —
    // they must not run in parallel across files.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
});
