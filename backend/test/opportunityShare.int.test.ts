import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import express from 'express';
import { hasDb, resetDb } from './helpers';
import prisma from '../src/prisma';
import { signAccessToken } from '../src/utils/jwt';
import { logger } from '../src/config/logger';
import { errorHandler } from '../src/middleware/error';
import opportunityShareRoutes from '../src/modules/opportunity-share/opportunity-share.routes';
import {
  OpportunityShareService, issueReceipt, verifyReceipt,
} from '../src/modules/opportunity-share/opportunity-share.service';
import { CampaignService } from '../src/modules/campaign/campaign.service';

const d = hasDb ? describe : describe.skip;

// ── Fixtures ──────────────────────────────────────────────────────────────────

async function seedUser(role: 'CREATOR' | 'BUSINESS' | 'ADMIN', createdAt?: Date) {
  const user = await prisma.user.create({
    data: { email: `${role.toLowerCase()}-${randomUUID()}@test.dev`, password: 'x', role, ...(createdAt ? { createdAt } : {}) },
  });
  const token = signAccessToken({ id: user.id, email: user.email, role });
  return { user, token };
}

async function seedCreator(createdAt?: Date) {
  const { user, token } = await seedUser('CREATOR', createdAt);
  const profile = await prisma.creatorProfile.create({
    data: { userId: user.id, fullName: 'Test Creator', categories: [] },
  });
  // CampaignService.apply requires at least one connected social account.
  await prisma.socialAccount.create({
    data: { creatorProfileId: profile.id, platform: 'instagram', profileUrl: 'https://instagram.com/x' },
  });
  return { user, token, profile };
}

async function seedCampaign(opts: { status?: 'ACTIVE' | 'DRAFT' | 'CLOSED'; deleted?: boolean; slug?: string } = {}) {
  const { user } = await seedUser('BUSINESS');
  const business = await prisma.businessProfile.create({
    data: { userId: user.id, businessName: 'Test Co', categories: [] },
  });
  return prisma.campaign.create({
    data: {
      businessId: business.id,
      title: 'Food Creator Needed',
      slug: opts.slug,
      description: 'd',
      category: 'content-creator',
      contentType: 'video',
      deliverables: '1 reel',
      deadline: new Date(Date.now() + 7 * 86_400_000),
      budgetMin: 0,
      budgetMax: 0,
      paymentType: 'free',
      // A free event keeps apply() clear of the paid-only contract machinery.
      campaignType: 'OPEN_EVENT',
      status: opts.status ?? 'ACTIVE',
      deletedAt: opts.deleted ? new Date() : null,
    },
  });
}

const PROPOSAL = {
  coverLetter: 'I would love to take part — I post food reels weekly and know the area well.',
  proposedRate: 0,
  timeline: '1 week',
  socialHandles: {},
};

// ── HTTP harness: the real router + real auth middleware, no full app boot ──

let server: Server;
let base = '';

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${base}/api/opportunity-shares${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, json: (await res.json()) as { data?: any; message?: string } };
}

d('Share Opportunity — HTTP', () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { (req as any).log = logger; next(); });
    app.use('/api/opportunity-shares', opportunityShareRoutes);
    app.use(errorHandler);
    server = app.listen(0);
    await new Promise<void>((r) => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));
  beforeEach(resetDb);

  it('an authenticated creator gets a tracked /events/{slug}?ref= link', async () => {
    const creator = await seedCreator();
    const campaign = await seedCampaign({ slug: 'food-creator-ktm' });

    const res = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id, platform: 'WHATSAPP' } });

    expect(res.status).toBe(201);
    expect(res.json.data.shareUrl).toMatch(/\/events\/food-creator-ktm\?ref=[A-Za-z0-9_-]{16}$/);
    // No sharer identity anywhere in the link.
    expect(res.json.data.shareUrl).not.toContain(creator.profile.id);
    expect(res.json.data.shareUrl).not.toContain(creator.user.id);
    const row = await prisma.opportunityShare.findUniqueOrThrow({ where: { token: res.json.data.shareToken } });
    expect(row.sharerId).toBe(creator.profile.id);
    expect(row.platform).toBe('WHATSAPP');
  });

  it('rejects an unauthenticated share', async () => {
    const campaign = await seedCampaign();
    const res = await call('POST', '/', { body: { campaignId: campaign.id, platform: 'COPY_LINK' } });
    expect(res.status).toBe(401);
    expect(await prisma.opportunityShare.count()).toBe(0);
  });

  it('rejects a business account (creator-only feature)', async () => {
    const { token } = await seedUser('BUSINESS');
    const campaign = await seedCampaign();
    const res = await call('POST', '/', { token, body: { campaignId: campaign.id } });
    expect(res.status).toBe(403);
  });

  it('ignores a sharer id smuggled in the body — the sharer is always the session', async () => {
    const creator = await seedCreator();
    const other = await seedCreator();
    const campaign = await seedCampaign();
    const res = await call('POST', '/', {
      token: creator.token,
      body: { campaignId: campaign.id, platform: 'SMS', sharerId: other.profile.id, creatorId: other.profile.id },
    });
    expect(res.status).toBe(201);
    const row = await prisma.opportunityShare.findUniqueOrThrow({ where: { token: res.json.data.shareToken } });
    expect(row.sharerId).toBe(creator.profile.id);
  });

  it('rejects unknown, draft and deleted opportunities as not found', async () => {
    const creator = await seedCreator();
    const draft = await seedCampaign({ status: 'DRAFT' });
    const deleted = await seedCampaign({ deleted: true });
    for (const campaignId of ['does-not-exist', draft.id, deleted.id]) {
      const res = await call('POST', '/', { token: creator.token, body: { campaignId } });
      expect(res.status).toBe(404);
    }
  });

  it('rejects sharing an opportunity that is no longer accepting applications', async () => {
    const creator = await seedCreator();
    const closed = await seedCampaign({ status: 'CLOSED' });
    const res = await call('POST', '/', { token: creator.token, body: { campaignId: closed.id } });
    expect(res.status).toBe(400);
  });

  it('re-sharing on the same platform reuses the link; a different platform gets its own', async () => {
    const creator = await seedCreator();
    const campaign = await seedCampaign();
    const a = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id, platform: 'WHATSAPP' } });
    const b = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id, platform: 'WHATSAPP' } });
    const c = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id, platform: 'COPY_LINK' } });
    expect(b.json.data.shareToken).toBe(a.json.data.shareToken);
    expect(c.json.data.shareToken).not.toBe(a.json.data.shareToken);
    expect(await prisma.opportunityShare.count()).toBe(2);
  });

  it('a visit with a valid token counts a click and gives an anonymous visitor a receipt', async () => {
    const creator = await seedCreator();
    const campaign = await seedCampaign();
    const { json } = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id, platform: 'WHATSAPP' } });

    const visit = await call('POST', `/${json.data.shareToken}/visit`);

    expect(visit.status).toBe(200);
    expect(visit.json.data).toMatchObject({ valid: true, campaignId: campaign.id });
    expect(typeof visit.json.data.receipt).toBe('string');
    // Nothing about the sharer is exposed to the visitor.
    expect(JSON.stringify(visit.json.data)).not.toContain(creator.profile.id);
    const row = await prisma.opportunityShare.findUniqueOrThrow({ where: { token: json.data.shareToken } });
    expect(row.clickCount).toBe(1);
  });

  it('an invalid or malformed token is a quiet { valid: false }, never an error', async () => {
    for (const token of ['nope-nope-nope-nope', '<script>', 'a'.repeat(200)]) {
      const res = await call('POST', `/${encodeURIComponent(token)}/visit`);
      expect(res.status).toBe(200);
      expect(res.json.data).toEqual({ valid: false });
    }
  });

  it('a token for a since-deleted opportunity is treated as invalid', async () => {
    const creator = await seedCreator();
    const campaign = await seedCampaign();
    const { json } = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id } });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { deletedAt: new Date() } });
    const res = await call('POST', `/${json.data.shareToken}/visit`);
    expect(res.json.data).toEqual({ valid: false });
  });

  it('the sharer opening their own link is not a click', async () => {
    const creator = await seedCreator();
    const campaign = await seedCampaign();
    const { json } = await call('POST', '/', { token: creator.token, body: { campaignId: campaign.id } });
    await call('POST', `/${json.data.shareToken}/visit`, { token: creator.token });
    const row = await prisma.opportunityShare.findUniqueOrThrow({ where: { token: json.data.shareToken } });
    expect(row.clickCount).toBe(0);
  });

  it('signup claim requires auth and never errors on a junk receipt', async () => {
    expect((await call('POST', '/attribution/signup', { body: { receipt: 'x' } })).status).toBe(401);
    const { token } = await seedCreator();
    const res = await call('POST', '/attribution/signup', { token, body: { receipt: 'junk.123.sig' } });
    expect(res.status).toBe(200);
    expect(res.json.data).toEqual({ attributed: false });
  });

  it('the admin summary is admin-only', async () => {
    const creator = await seedCreator();
    expect((await call('GET', '/admin/summary', { token: creator.token })).status).toBe(403);
    const admin = await seedUser('ADMIN');
    const res = await call('GET', '/admin/summary', { token: admin.token });
    expect(res.status).toBe(200);
    expect(res.json.data).toMatchObject({ opportunities: [], byPlatform: [] });
  });
});

// ── Service-level: tokens, receipts, attribution rules ──────────────────────

d('Share Opportunity — tokens & receipts', () => {
  beforeEach(resetDb);
  const service = new OpportunityShareService();

  it('tokens are unique and high-entropy across many shares', async () => {
    const campaign = await seedCampaign();
    const tokens = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const creator = await seedCreator();
      const { shareToken } = await service.createShare(creator.user.id, { campaignId: campaign.id, platform: 'OTHER' });
      expect(shareToken).toMatch(/^[A-Za-z0-9_-]{16}$/); // 12 random bytes
      tokens.add(shareToken);
    }
    expect(tokens.size).toBe(20);
  });

  it('a receipt round-trips, and any tampering is rejected', () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const receipt = issueReceipt('AbCdEfGhIjKlMnOp', at);
    expect(verifyReceipt(receipt)).toEqual({ token: 'AbCdEfGhIjKlMnOp', clickedAt: at });

    const [tok, ms, sig] = receipt.split('.');
    expect(verifyReceipt(`${tok}.${Number(ms) - 86_400_000}.${sig}`)).toBeNull(); // backdated click
    expect(verifyReceipt(`ZZZZZZZZZZZZZZZZ.${ms}.${sig}`)).toBeNull();          // swapped token
    expect(verifyReceipt(`${tok}.${ms}.${sig.slice(0, -2)}xx`)).toBeNull();     // forged signature
  });
});

d('Share Opportunity — attribution', () => {
  beforeEach(resetDb);
  const service = new OpportunityShareService();
  const campaigns = new CampaignService();

  async function shareFor(campaignId: string) {
    const sharer = await seedCreator();
    const { shareToken } = await service.createShare(sharer.user.id, { campaignId, platform: 'WHATSAPP' });
    return { sharer, shareToken };
  }

  it('registration: an account created after the click is attributed, exactly once', async () => {
    const campaign = await seedCampaign();
    const { shareToken } = await shareFor(campaign.id);
    const visit = await service.recordVisit(shareToken, { viewerKey: 'anon-1' });
    const receipt = (visit as { receipt: string }).receipt;

    const newbie = await seedCreator(new Date(Date.now() + 1000)); // registers after clicking
    expect(await service.claimSignup(newbie.user.id, receipt)).toEqual({ attributed: true });
    // A second claim (another share, a replay) never overwrites the first.
    const other = await shareFor(campaign.id);
    const otherVisit = await service.recordVisit(other.shareToken, { viewerKey: 'anon-2' });
    expect(await service.claimSignup(newbie.user.id, (otherVisit as { receipt: string }).receipt)).toEqual({ attributed: false });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: newbie.user.id } });
    const share = await prisma.opportunityShare.findUniqueOrThrow({ where: { token: shareToken } });
    expect(user.signupShareId).toBe(share.id);
  });

  it('registration: an existing account (created before the click) is not attributed', async () => {
    const campaign = await seedCampaign();
    const veteran = await seedCreator(new Date(Date.now() - 86_400_000));
    const { shareToken } = await shareFor(campaign.id);
    const visit = await service.recordVisit(shareToken, { viewerKey: 'anon' });
    expect(await service.claimSignup(veteran.user.id, (visit as { receipt: string }).receipt)).toEqual({ attributed: false });
  });

  it('registration: a click older than the attribution window is not attributed', async () => {
    const campaign = await seedCampaign();
    const { shareToken } = await shareFor(campaign.id);
    const stale = issueReceipt(shareToken, new Date(Date.now() - 31 * 86_400_000));
    const newbie = await seedCreator();
    expect(await service.claimSignup(newbie.user.id, stale)).toEqual({ attributed: false });
  });

  it('registration: the sharer cannot attribute themselves', async () => {
    const campaign = await seedCampaign();
    const sharer = await seedCreator();
    const { shareToken } = await service.createShare(sharer.user.id, { campaignId: campaign.id, platform: 'SMS' });
    const receipt = issueReceipt(shareToken, new Date(sharer.user.createdAt.getTime() - 1000));
    expect(await service.claimSignup(sharer.user.id, receipt)).toEqual({ attributed: false });
  });

  it('application: a proposal submitted with a valid share token is attributed', async () => {
    const campaign = await seedCampaign();
    const { shareToken } = await shareFor(campaign.id);
    const applicant = await seedCreator();

    const app = await campaigns.apply(campaign.id, applicant.user.id, { ...PROPOSAL, shareToken });

    const row = await prisma.application.findUniqueOrThrow({ where: { id: app.id }, include: { opportunityShare: true } });
    expect(row.opportunityShare?.token).toBe(shareToken);
    expect(row.status).toBe('PENDING'); // normal proposal, nothing auto-accepted
  });

  it('application: works exactly as before with no share token', async () => {
    const campaign = await seedCampaign();
    const applicant = await seedCreator();
    const app = await campaigns.apply(campaign.id, applicant.user.id, PROPOSAL);
    const row = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(row.opportunityShareId).toBeNull();
  });

  it('application: an invalid token never blocks the proposal', async () => {
    const campaign = await seedCampaign();
    const applicant = await seedCreator();
    const app = await campaigns.apply(campaign.id, applicant.user.id, { ...PROPOSAL, shareToken: 'forged-token-123456' });
    const row = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(row.opportunityShareId).toBeNull();
  });

  it('application: a token for a different opportunity is not attributed', async () => {
    const campaignA = await seedCampaign();
    const campaignB = await seedCampaign();
    const { shareToken } = await shareFor(campaignA.id);
    const applicant = await seedCreator();
    const app = await campaigns.apply(campaignB.id, applicant.user.id, { ...PROPOSAL, shareToken });
    const row = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(row.opportunityShareId).toBeNull();
  });

  it('application: applying through your own share link is not attributed', async () => {
    const campaign = await seedCampaign();
    const { sharer, shareToken } = await shareFor(campaign.id);
    const app = await campaigns.apply(campaign.id, sharer.user.id, { ...PROPOSAL, shareToken });
    const row = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(row.opportunityShareId).toBeNull();
  });

  it('application: duplicate-application and status rules are unchanged by a share token', async () => {
    const campaign = await seedCampaign();
    const { shareToken } = await shareFor(campaign.id);
    const applicant = await seedCreator();
    await campaigns.apply(campaign.id, applicant.user.id, { ...PROPOSAL, shareToken });
    await expect(campaigns.apply(campaign.id, applicant.user.id, { ...PROPOSAL, shareToken })).rejects.toThrow();

    const closed = await seedCampaign({ status: 'CLOSED' });
    const other = await seedCreator();
    await expect(campaigns.apply(closed.id, other.user.id, { ...PROPOSAL, shareToken })).rejects.toThrow();
  });

  it('creates no reward, points or wallet records anywhere in the funnel', async () => {
    const campaign = await seedCampaign();
    const { sharer, shareToken } = await shareFor(campaign.id);
    const visit = await service.recordVisit(shareToken, { viewerKey: 'anon' });
    const newbie = await seedCreator(new Date(Date.now() + 1000));
    await service.claimSignup(newbie.user.id, (visit as { receipt: string }).receipt);
    await campaigns.apply(campaign.id, newbie.user.id, { ...PROPOSAL, shareToken });

    expect(await prisma.walletTransaction.count({ where: { creatorId: sharer.profile.id } })).toBe(0);
    expect(await prisma.referral.count()).toBe(0);
  });

  it('the admin summary reports the full funnel per opportunity', async () => {
    const campaign = await seedCampaign();
    const { shareToken } = await shareFor(campaign.id);
    const visit = await service.recordVisit(shareToken, { viewerKey: 'anon-a' });
    await service.recordVisit(shareToken, { viewerKey: 'anon-b' });
    const newbie = await seedCreator(new Date(Date.now() + 1000));
    await service.claimSignup(newbie.user.id, (visit as { receipt: string }).receipt);
    await campaigns.apply(campaign.id, newbie.user.id, { ...PROPOSAL, shareToken });

    const { opportunities, byPlatform } = await service.summary(10);
    expect(opportunities).toEqual([expect.objectContaining({
      campaignId: campaign.id, shares: 1, clicks: 2, registrations: 1, applications: 1,
    })]);
    expect(byPlatform).toEqual([expect.objectContaining({ platform: 'WHATSAPP', shares: 1, registrations: 1, applications: 1 })]);
  });
});
