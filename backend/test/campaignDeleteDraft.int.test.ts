import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { hasDb, resetDb } from './helpers';
import prisma from '../src/prisma';
import { CampaignService } from '../src/modules/campaign/campaign.service';

const d = hasDb ? describe : describe.skip;

async function seedBusinessWithCampaign(status: 'DRAFT' | 'ACTIVE' | 'CLOSED') {
  const user = await prisma.user.create({
    data: { email: `business-${randomUUID()}@test.dev`, password: 'x', role: 'BUSINESS' },
  });
  const business = await prisma.businessProfile.create({
    data: { userId: user.id, businessName: 'Test Co', categories: [] },
  });
  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      title: 'Draft campaign',
      description: 'd',
      category: 'content-creator',
      contentType: 'video',
      deliverables: '1 reel',
      deadline: new Date(Date.now() + 7 * 86_400_000),
      budgetMin: 0,
      budgetMax: 0,
      paymentType: 'free',
      campaignType: 'OPEN_EVENT',
      status,
    },
  });
  return { user, campaign };
}

d('CampaignService.delete — drafts only', () => {
  const service = new CampaignService();
  beforeEach(resetDb);

  it('deletes the owner\'s draft', async () => {
    const { user, campaign } = await seedBusinessWithCampaign('DRAFT');
    await service.delete(campaign.id, user.id);
    expect(await prisma.campaign.findUnique({ where: { id: campaign.id } })).toBeNull();
  });

  it.each(['ACTIVE', 'CLOSED'] as const)('refuses to delete a %s campaign with 409', async (status) => {
    const { user, campaign } = await seedBusinessWithCampaign(status);
    await expect(service.delete(campaign.id, user.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.campaign.findUnique({ where: { id: campaign.id } })).not.toBeNull();
  });

  it('refuses another business\'s draft with 403', async () => {
    const { campaign } = await seedBusinessWithCampaign('DRAFT');
    const { user: other } = await seedBusinessWithCampaign('DRAFT');
    await expect(service.delete(campaign.id, other.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});
