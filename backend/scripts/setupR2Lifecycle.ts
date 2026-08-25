// One-time (idempotent) infra setup — applies the bucket lifecycle rule that
// auto-aborts incomplete R2 multipart uploads (see r2.service.ts's
// putAbortIncompleteMultipartLifecycleRule for why this replaces an app-side
// cleanup cron). Run manually, not on server boot:
//
//   npm run r2:setup-lifecycle
//
// Re-running is safe — PutBucketLifecycleConfiguration replaces the whole
// rule set, so this always converges to the same one rule.
import * as r2 from '../src/services/r2.service';

const DAYS_AFTER_INITIATION = 2;

async function main() {
  if (!r2.isConfigured()) {
    console.error('R2 is not configured (missing R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME) — nothing to do.');
    process.exit(1);
  }

  await r2.putAbortIncompleteMultipartLifecycleRule(DAYS_AFTER_INITIATION);
  console.log(`✅ Lifecycle rule applied: incomplete multipart uploads are aborted after ${DAYS_AFTER_INITIATION} days.`);

  const rules = await r2.getLifecycleRules();
  console.log('Current bucket lifecycle rules:', JSON.stringify(rules, null, 2));
}

main().catch((err) => {
  console.error('Failed to apply R2 lifecycle rule:', err);
  process.exit(1);
});
