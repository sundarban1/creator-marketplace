import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasDb, resetDb, seedFundedEngagement } from './helpers';
import { CampaignService } from '../src/modules/campaign/campaign.service';
import { logger } from '../src/config/logger';
import { LogEvent } from '../src/config/observability';

const d = hasDb ? describe : describe.skip;
const campaignService = new CampaignService();

d('Payment gateway callback idempotency logging', () => {
  beforeEach(resetDb);

  it('confirmKhaltiPayment logs the already-processed event and stays a no-op when payment is already PAID', async () => {
    const s = await seedFundedEngagement();
    const infoSpy = vi.spyOn(logger, 'info');

    // paymentStatus is already PAID from the seed — this must hit the early
    // idempotent-skip return without ever calling out to Khalti's lookup API.
    await expect(campaignService.confirmKhaltiPayment(s.applicationId, 'any-pidx')).resolves.toBeUndefined();

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: LogEvent.PAYMENT_CALLBACK_ALREADY_PROCESSED, appId: s.applicationId, method: 'khalti' }),
      expect.any(String),
    );
    infoSpy.mockRestore();
  });

  it('confirmEsewaPayment logs the already-processed event and stays a no-op when payment is already PAID', async () => {
    const s = await seedFundedEngagement();
    const infoSpy = vi.spyOn(logger, 'info');

    await expect(campaignService.confirmEsewaPayment(s.applicationId, 'any-data')).resolves.toBeUndefined();

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: LogEvent.PAYMENT_CALLBACK_ALREADY_PROCESSED, appId: s.applicationId, method: 'esewa' }),
      expect.any(String),
    );
    infoSpy.mockRestore();
  });
});
