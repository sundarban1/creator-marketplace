import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { hasDb, resetDb } from './helpers';
import prisma from '../src/prisma';

// Capture outgoing review emails instead of hitting a provider.
const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; html: string }>);
const failNext = vi.hoisted(() => ({ value: false }));
vi.mock('../src/utils/email/eventReview', async (orig) => {
  const actual = await orig<typeof import('../src/utils/email/eventReview')>();
  return {
    ...actual,
    sendEventReviewEmail: vi.fn(async (to: string, e: { subject: string; html: string }) => {
      if (failNext.value) { failNext.value = false; throw new Error('provider down'); }
      sent.push({ to, ...e });
    }),
  };
});

import { CampaignService } from '../src/modules/campaign/campaign.service';
import { AdminService } from '../src/modules/admin/admin.service';
import { campaignReviewService, deliverReviewEmailOnce } from '../src/modules/campaign/campaign-review.service';
import { createCampaignSchema } from '../src/modules/campaign/campaign.schema';

const d = hasDb ? describe : describe.skip;

async function seedUsers() {
  const mk = (role: 'BUSINESS' | 'CREATOR' | 'ADMIN') =>
    prisma.user.create({ data: { email: `${role.toLowerCase()}-${randomUUID()}@test.dev`, password: 'x', role } });
  const [bizUser, otherBizUser, creatorUser, admin, admin2] = await Promise.all([mk('BUSINESS'), mk('BUSINESS'), mk('CREATOR'), mk('ADMIN'), mk('ADMIN')]);
  const business = await prisma.businessProfile.create({ data: { userId: bizUser.id, businessName: 'Himalayan Cafe', categories: [] } });
  await prisma.businessProfile.create({ data: { userId: otherBizUser.id, businessName: 'Other Co', categories: [] } });
  const creator = await prisma.creatorProfile.create({ data: { userId: creatorUser.id, fullName: 'C', categories: [] } });
  // Brand-new test accounts would otherwise trip the new-account cooldown.
  await prisma.platformSetting.create({ data: { key: 'rateLimit.newAccountCooldown.enabled', value: 'false' } });
  return { bizUser, otherBizUser, creatorUser, admin, admin2, business, creator };
}

const paidInput = () => createCampaignSchema.parse({
  title: 'Menu launch shoot', description: 'Shoot our new winter menu for Instagram.',
  category: 'Food', platforms: ['Instagram'], contentType: 'Reel', deliverables: '1 reel',
  deadline: new Date(Date.now() + 10 * 86_400_000).toISOString(), locationType: 'REMOTE',
  budgetMin: 3000, budgetMax: 3000, campaignType: 'PAID_CAMPAIGN', status: 'ACTIVE',
});
const openInput = () => createCampaignSchema.parse({
  title: 'Tasting night', description: 'Free tasting night for food creators.',
  category: 'Food', platforms: ['Instagram'], contentType: 'Story', deliverables: '2 stories',
  deadline: new Date(Date.now() + 10 * 86_400_000).toISOString(), locationType: 'REMOTE',
  budgetMin: 0, budgetMax: 0, campaignType: 'OPEN_EVENT', benefits: ['Free dinner'], status: 'ACTIVE',
});

const FEEDBACK = 'Please clarify the deliverables and whether the meal includes drinks.';

d('event review workflow', () => {
  const campaigns = new CampaignService();
  const admin = new AdminService();
  let u: Awaited<ReturnType<typeof seedUsers>>;

  beforeEach(async () => {
    await resetDb();
    sent.length = 0;
    failNext.value = false;
    u = await seedUsers();
  });

  async function createPending(kind: 'paid' | 'open' = 'paid') {
    return campaigns.create(u.bizUser.id, kind === 'paid' ? paidInput() : openInput());
  }

  it.each(['paid', 'open'] as const)('a new %s event enters PENDING_APPROVAL with a SUBMITTED history row', async (kind) => {
    const c = await createPending(kind);
    expect(c.status).toBe('PENDING_APPROVAL');
    expect(c.review.revision).toBe(1);
    const history = await campaignReviewService.history(c.id, { id: u.bizUser.id, role: 'BUSINESS' });
    expect(history.map((h) => h.action)).toEqual(['SUBMITTED']);
    // Admin review inbox is emailed after commit.
    await vi.waitFor(() => expect(sent.some((m) => m.subject === `New Event Awaiting Review — ${c.title}`)).toBe(true));
  });

  it('pending events are hidden from listings, detail and proposals', async () => {
    const c = await createPending();
    const list = await campaigns.list({ page: 1, limit: 50 } as never);
    expect(list.campaigns.map((x) => x.id)).not.toContain(c.id);
    const listByStatus = await campaigns.list({ page: 1, limit: 50, status: 'PENDING_APPROVAL' } as never);
    expect(listByStatus.campaigns.map((x) => x.id)).not.toContain(c.id);

    await expect(campaigns.getById(c.id, 'en', null)).rejects.toMatchObject({ statusCode: 404 });
    await expect(campaigns.getById(c.id, 'en', { id: u.creatorUser.id, role: 'CREATOR' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(campaigns.getById(c.id, 'en', { id: u.otherBizUser.id, role: 'BUSINESS' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(campaigns.getById(c.id, 'en', { id: u.bizUser.id, role: 'BUSINESS' })).resolves.toMatchObject({ id: c.id });
    await expect(campaigns.getById(c.id, 'en', { id: u.admin.id, role: 'ADMIN' })).resolves.toMatchObject({ id: c.id });

    await expect(campaigns.apply(c.id, u.creatorUser.id, { coverLetter: 'hi', proposedRate: 3000, timeline: '1w' } as never))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('a business cannot publish directly by sending status ACTIVE', async () => {
    const c = await createPending();
    const after = await campaigns.update(c.id, u.bizUser.id, { status: 'ACTIVE' } as never);
    expect(after.status).toBe('PENDING_APPROVAL');
  });

  it('approve publishes, records history and emails the business', async () => {
    const c = await createPending();
    const approved = await admin.approveCampaign(c.id, u.admin.id);
    expect(approved.status).toBe('ACTIVE');
    const list = await campaigns.list({ page: 1, limit: 50 } as never);
    expect(list.campaigns.map((x) => x.id)).toContain(c.id);
    await vi.waitFor(() => expect(sent.some((m) => m.subject === 'Your Kolab Event Has Been Approved' && m.to === u.bizUser.email)).toBe(true));
    // A second decision on the same submission is refused.
    await expect(admin.approveCampaign(c.id, u.admin.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('concurrent decisions: exactly one wins', async () => {
    const c = await createPending();
    const results = await Promise.allSettled([
      admin.approveCampaign(c.id, u.admin.id),
      admin.rejectCampaign(c.id, u.admin2.id, 'Not allowed on the platform, sorry.', true),
      admin.requestCampaignChanges(c.id, u.admin2.id, FEEDBACK),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const decisions = await prisma.campaignReview.count({ where: { campaignId: c.id, action: { not: 'SUBMITTED' } } });
    expect(decisions).toBe(1);
  });

  it('request changes requires real feedback, then edit-and-resubmit returns to review keeping history', async () => {
    const c = await createPending();
    await expect(admin.requestCampaignChanges(c.id, u.admin.id, '   ')).rejects.toMatchObject({ statusCode: 400 });
    await expect(admin.rejectCampaign(c.id, u.admin.id, '', true)).rejects.toMatchObject({ statusCode: 400 });

    const changed = await admin.requestCampaignChanges(c.id, u.admin.id, FEEDBACK);
    expect(changed.status).toBe('CHANGES_REQUESTED');
    await vi.waitFor(() => expect(sent.find((m) => m.subject === 'Action Required: Please Update Your Kolab Event')?.html).toContain('Please clarify the deliverables'));

    // Business sees its own feedback; another business can't.
    const own = await campaigns.getById(c.id, 'en', { id: u.bizUser.id, role: 'BUSINESS' });
    expect(own.review.feedback).toBe(FEEDBACK);
    await expect(campaignReviewService.history(c.id, { id: u.otherBizUser.id, role: 'BUSINESS' })).rejects.toMatchObject({ statusCode: 404 });
    // Another business can't edit it either.
    await expect(campaigns.update(c.id, u.otherBizUser.id, { title: 'Hijack attempt' } as never)).rejects.toMatchObject({ statusCode: 403 });

    const resubmitted = await campaigns.update(c.id, u.bizUser.id, { deliverables: '1 reel + 2 stories, drinks included' } as never);
    expect(resubmitted.status).toBe('PENDING_APPROVAL');
    expect(resubmitted.review.revision).toBe(2);
    const history = await campaignReviewService.history(c.id, { id: u.admin.id, role: 'ADMIN' });
    expect(history.map((h) => h.action)).toEqual(['RESUBMITTED', 'CHANGES_REQUESTED', 'SUBMITTED']);
    expect(history[1].feedback).toBe(FEEDBACK);
    expect(history[1].actor?.id).toBe(u.admin.id);
    // Businesses never see which admin acted.
    const bizHistory = await campaignReviewService.history(c.id, { id: u.bizUser.id, role: 'BUSINESS' });
    expect(bizHistory.every((h) => h.actor === null)).toBe(true);
  });

  it('rejection: resubmittable vs permanent', async () => {
    const a = await createPending();
    await admin.rejectCampaign(a.id, u.admin.id, 'Event misrepresents the compensation offered.', true);
    const r1 = await campaignReviewService.resubmit(a.id, u.bizUser.id);
    expect(r1.status).toBe('PENDING_APPROVAL');

    const b = await createPending('open');
    const rejected = await admin.rejectCampaign(b.id, u.admin.id, 'Promotes a prohibited product category.', false);
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.review.resubmissionAllowed).toBe(false);
    await expect(campaignReviewService.resubmit(b.id, u.bizUser.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(campaigns.update(b.id, u.bizUser.id, { title: 'Renamed event' } as never)).rejects.toMatchObject({ statusCode: 403 });
    await vi.waitFor(() => expect(sent.find((m) => m.subject === 'Update Regarding Your Kolab Event' && m.html.includes('prohibited product'))?.html).toContain('Resubmission is not available'));
  });

  it('material edits to a published event send it back to review; harmless edits do not', async () => {
    const c = await createPending();
    await admin.approveCampaign(c.id, u.admin.id);

    const harmless = await campaigns.update(c.id, u.bizUser.id, { hashtags: ['winter'], title: c.title } as never);
    expect(harmless.status).toBe('ACTIVE');

    const material = await campaigns.update(c.id, u.bizUser.id, { budgetMin: 5000, budgetMax: 5000 } as never);
    expect(material.status).toBe('PENDING_APPROVAL');
    const [latest] = await campaignReviewService.history(c.id, { id: u.admin.id, role: 'ADMIN' });
    expect(latest).toMatchObject({ action: 'RESUBMITTED', fromStatus: 'ACTIVE' });
    expect(latest.changedFields).toEqual(expect.arrayContaining(['budgetMin', 'budgetMax']));

    // Re-approval republishes.
    expect((await admin.approveCampaign(c.id, u.admin.id)).status).toBe('ACTIVE');
  });

  it('admins cannot bypass review through the raw status endpoint', async () => {
    const c = await createPending();
    await expect(admin.setCampaignStatus(c.id, 'ACTIVE')).rejects.toMatchObject({ statusCode: 409 });
    await expect(admin.setCampaignStatus(c.id, 'REJECTED')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('an email failure leaves the committed decision intact, and delivery is deduped', async () => {
    const c = await createPending();
    await vi.waitFor(() => expect(sent.length).toBeGreaterThan(0));
    sent.length = 0;
    failNext.value = true;
    await admin.requestCampaignChanges(c.id, u.admin.id, FEEDBACK);
    const row = await prisma.campaign.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe('CHANGES_REQUESTED');
    expect(row.reviewFeedback).toBe(FEEDBACK);

    // A failed send released its claim, so a retry with the same key delivers once.
    const [review] = await prisma.campaignReview.findMany({ where: { campaignId: c.id, action: 'CHANGES_REQUESTED' } });
    await vi.waitFor(async () => expect(await prisma.notificationDelivery.count({ where: { dedupeKey: `campaign-review:${review.id}:email` } })).toBe(0));
    const email = { subject: 's', html: 'h' };
    const args = { dedupeKey: `campaign-review:${review.id}:email`, userId: u.bizUser.id, campaignId: c.id, type: 't', to: u.bizUser.email, email };
    expect(await deliverReviewEmailOnce(args)).toBe('sent');
    expect(await deliverReviewEmailOnce(args)).toBe('duplicate');
    expect(sent.filter((m) => m.subject === 's')).toHaveLength(1);
  });

  it('every admin status action notifies the business by bell (push rides on it) and email, with deep links', async () => {
    const c = await createPending();
    await admin.approveCampaign(c.id, u.admin.id);
    await vi.waitFor(() => expect(sent.find((m) => m.subject === 'Your Kolab Event Has Been Approved')?.html)
      .toContain(`kolab://campaign-detail?campaignId=${c.id}`));

    await admin.setCampaignStatus(c.id, 'PAUSED');
    await vi.waitFor(() => expect(sent.some((m) => m.subject === 'Your Kolab Event Has Been Paused' && m.to === u.bizUser.email)).toBe(true));
    await admin.setCampaignStatus(c.id, 'ACTIVE');
    await vi.waitFor(() => expect(sent.some((m) => m.subject === 'Your Kolab Event Is Active Again')).toBe(true));
    // Status change made through the admin edit form.
    await admin.updateCampaign(c.id, { status: 'PAUSED' } as never);
    await vi.waitFor(() => expect(sent.filter((m) => m.subject === 'Your Kolab Event Has Been Paused')).toHaveLength(2));

    const bells = await prisma.notification.findMany({ where: { userId: u.bizUser.id, type: 'campaign_status_changed' } });
    expect(bells.map((b) => b.title).sort()).toEqual(['Event Paused', 'Event Paused', 'Event Reactivated']);
    expect(bells.every((b) => b.refId === c.id && b.refType === 'campaign')).toBe(true);

    await admin.deleteCampaign(c.id);
    await vi.waitFor(() => expect(sent.find((m) => m.subject === 'Your Kolab Event Has Been Removed')?.html).toContain('kolab://campaigns'));
    const removed = await prisma.notification.findFirst({ where: { userId: u.bizUser.id, type: 'campaign_deleted' } });
    expect(removed).toMatchObject({ title: 'Event Removed', refId: null });
  });

  it('review decisions reach the business as a bell row too', async () => {
    const c = await createPending();
    await admin.requestCampaignChanges(c.id, u.admin.id, FEEDBACK);
    await vi.waitFor(async () => expect(await prisma.notification.findFirst({
      where: { userId: u.bizUser.id, type: 'campaign_changes_requested', refId: c.id },
    })).not.toBeNull());
  });

  it('existing published events and their proposals are untouched by the workflow', async () => {
    const legacy = await prisma.campaign.create({
      data: {
        businessId: u.business.id, title: 'Legacy live event', description: 'Published before review existed',
        category: 'Food', contentType: 'Reel', deliverables: '1 reel', deadline: new Date(Date.now() + 5 * 86_400_000),
        budgetMin: 2000, budgetMax: 2000, paymentType: 'Fixed Fee', status: 'ACTIVE', campaignType: 'PAID_CAMPAIGN',
      },
    });
    const list = await campaigns.list({ page: 1, limit: 50 } as never);
    expect(list.campaigns.map((x) => x.id)).toContain(legacy.id);
    await expect(campaigns.getById(legacy.id, 'en', null)).resolves.toMatchObject({ status: 'ACTIVE' });
  });
});
