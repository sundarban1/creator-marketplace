import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { hasDb, resetDb } from './helpers';
import prisma from '../src/prisma';

// Admin alerts go through notificationService; let a test make it fail to
// prove a notification outage never loses a report.
const failAdminAlerts = vi.hoisted(() => ({ value: false }));
vi.mock('../src/modules/notifications/notification.service', async (orig) => {
  const actual = await orig<typeof import('../src/modules/notifications/notification.service')>();
  return {
    ...actual,
    sendExpoPush: vi.fn(async () => {}),
    notificationService: {
      ...actual.notificationService,
      createForAdmins: vi.fn(async (data: Parameters<typeof actual.notificationService.createForAdmins>[0]) => {
        if (failAdminAlerts.value) throw new Error('push provider down');
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        await prisma.notification.createMany({ data: admins.map((a) => ({ ...data, userId: a.id })) });
      }),
      create: vi.fn(async (data: { userId: string; type: string; title: string; body: string; refId?: string; refType?: string }) =>
        prisma.notification.create({ data })),
    },
  };
});

import { ReportService } from '../src/modules/report/report.service';
import { createReportSchema } from '../src/modules/report/report.schema';
import { moderationAdminService } from '../src/modules/moderation/moderation.admin.service';
import { blockService, hiddenFor } from '../src/modules/moderation/block.service';
import { termsService } from '../src/modules/legal/terms.service';
import { CampaignService } from '../src/modules/campaign/campaign.service';

const d = hasDb ? describe : describe.skip;
const reports = new ReportService();

async function seed() {
  const mk = (role: 'BUSINESS' | 'CREATOR' | 'ADMIN') =>
    prisma.user.create({ data: { email: `${role.toLowerCase()}-${randomUUID()}@test.dev`, password: 'x', role, isOnboarded: true } });
  const [reporterUser, ownerUser, bizUser, admin, admin2] = await Promise.all([mk('CREATOR'), mk('CREATOR'), mk('BUSINESS'), mk('ADMIN'), mk('ADMIN')]);
  const reporter = await prisma.creatorProfile.create({ data: { userId: reporterUser.id, fullName: 'Reporter', categories: [] } });
  const owner = await prisma.creatorProfile.create({ data: { userId: ownerUser.id, fullName: 'Owner', categories: [] } });
  const business = await prisma.businessProfile.create({ data: { userId: bizUser.id, businessName: 'Blocked Biz', categories: [] } });
  const item = await prisma.portfolioItem.create({ data: { creatorProfileId: owner.id, title: 'Shoot', description: 'desc', mediaUrl: 'https://x/y.jpg' } });
  return { reporterUser, ownerUser, bizUser, admin, admin2, reporter, owner, business, item };
}

d('UGC moderation (integration)', () => {
  beforeEach(async () => { await resetDb(); failAdminAlerts.value = false; });

  it('persists a report as NEW with owner + evidence and alerts every admin', async () => {
    const s = await seed();
    const r = await reports.create(s.reporterUser.id, { targetType: 'PORTFOLIO_ITEM', targetId: s.item.id, reason: 'HARASSMENT', description: 'mean' });
    const row = await prisma.report.findUniqueOrThrow({ where: { id: r.id } });
    expect(row.status).toBe('NEW');
    expect(row.verification).toBe('UNVERIFIED');
    expect(row.reportedUserId).toBe(s.ownerUser.id);
    expect(row.priority).toBe('HIGH');
    expect((row.evidence as Record<string, unknown>).description).toBe('desc');
    // Response never leaks internals.
    expect(Object.keys(r).sort()).toEqual(['createdAt', 'id', 'status']);
    await new Promise((res) => setTimeout(res, 50));
    expect(await prisma.notification.count({ where: { refId: r.id, refType: 'report' } })).toBe(2);
  });

  it('never loses a report when admin alerts fail', async () => {
    const s = await seed();
    failAdminAlerts.value = true;
    const r = await reports.create(s.reporterUser.id, { targetType: 'USER', targetId: s.ownerUser.id, reason: 'SPAM' });
    expect(await prisma.report.count({ where: { id: r.id } })).toBe(1);
    const list = await moderationAdminService.listReports({ page: 1, limit: 20 }, s.admin.id);
    expect(list.items.map((i) => i.id)).toContain(r.id);
  });

  it('rejects self-reports, duplicates, missing content, and OTHER without detail', async () => {
    const s = await seed();
    await expect(reports.create(s.ownerUser.id, { targetType: 'PORTFOLIO_ITEM', targetId: s.item.id, reason: 'SPAM' })).rejects.toThrow(/your own/);
    await reports.create(s.reporterUser.id, { targetType: 'PORTFOLIO_ITEM', targetId: s.item.id, reason: 'SPAM' });
    await expect(reports.create(s.reporterUser.id, { targetType: 'PORTFOLIO_ITEM', targetId: s.item.id, reason: 'SCAM' })).rejects.toThrow(/already reported/);
    await expect(reports.create(s.reporterUser.id, { targetType: 'OPPORTUNITY', targetId: 'nope', reason: 'SPAM' })).rejects.toThrow(/no longer available/);
    expect(createReportSchema.safeParse({ targetType: 'USER', targetId: 'x', reason: 'OTHER' }).success).toBe(false);
  });

  it('only lets a conversation participant report a message', async () => {
    const s = await seed();
    const conv = await prisma.conversation.create({ data: { creatorId: s.owner.id, businessId: s.business.id, status: 'ACCEPTED' } });
    const msg = await prisma.message.create({ data: { conversationId: conv.id, senderId: s.bizUser.id, content: 'abusive' } });
    await expect(reports.create(s.reporterUser.id, { targetType: 'MESSAGE', targetId: msg.id, reason: 'HARASSMENT' })).rejects.toThrow();
    const r = await reports.create(s.ownerUser.id, { targetType: 'MESSAGE', targetId: msg.id, reason: 'HARASSMENT' });
    const row = await prisma.report.findUniqueOrThrow({ where: { id: r.id } });
    expect(row.conversationId).toBe(conv.id);
    expect(row.reportedUserId).toBe(s.bizUser.id);
  });

  it('enforces verify → act → resolve, hides content, audits, and tells the reporter', async () => {
    const s = await seed();
    const { id } = await reports.create(s.reporterUser.id, { targetType: 'PORTFOLIO_ITEM', targetId: s.item.id, reason: 'INAPPROPRIATE_CONTENT' });

    await expect(moderationAdminService.resolve(id, s.admin.id, undefined, true)).rejects.toThrow(/verification decision/);
    await expect(moderationAdminService.takeAction(id, s.admin.id, { action: 'REMOVE_CONTENT', reason: 'nsfw' })).rejects.toThrow(/VALID/);

    await moderationAdminService.startReview(id, s.admin.id);
    await moderationAdminService.verify(id, s.admin.id, 'VALID', 'Confirmed explicit image');
    const after = await moderationAdminService.takeAction(id, s.admin.id, { action: 'REMOVE_CONTENT', reason: 'Sexual content' });
    expect(after.status).toBe('ACTION_TAKEN');
    expect((await prisma.portfolioItem.findUniqueOrThrow({ where: { id: s.item.id } })).moderationHiddenAt).not.toBeNull();

    const resolved = await moderationAdminService.resolve(id, s.admin.id, 'done', true);
    expect(resolved.status).toBe('RESOLVED');
    expect(await prisma.moderationAction.count({ where: { reportId: id, action: 'REMOVE_CONTENT' } })).toBe(1);
    await new Promise((res) => setTimeout(res, 50));
    const audit = await prisma.auditLog.findMany({ where: { entityType: 'Report', entityId: id } });
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['report.status_changed', 'report.verified', 'moderation.action', 'report.resolved']));
    const notice = await prisma.notification.findFirst({ where: { userId: s.reporterUser.id, type: 'report_update' } });
    expect(notice?.body).toMatch(/took appropriate action/);
    // The owner is told, with the reason, but never who reported.
    const ownerNotice = await prisma.notification.findFirst({ where: { userId: s.ownerUser.id, type: 'moderation_notice' } });
    expect(ownerNotice?.body).toMatch(/Sexual content/);
    expect(ownerNotice?.body).not.toMatch(/Reporter/);

    // Restore still works after resolution (invalid on appeal, etc).
    await moderationAdminService.takeAction(id, s.admin.id, { action: 'RESTORE_CONTENT', reason: 'Appeal upheld' });
    expect((await prisma.portfolioItem.findUniqueOrThrow({ where: { id: s.item.id } })).moderationHiddenAt).toBeNull();
  });

  it('dismisses only after INVALID, and blocks another moderator from acting on an assigned report', async () => {
    const s = await seed();
    const { id } = await reports.create(s.reporterUser.id, { targetType: 'USER', targetId: s.ownerUser.id, reason: 'SPAM' });
    await moderationAdminService.assign(id, s.admin.id, s.admin2.id);
    await expect(moderationAdminService.startReview(id, s.admin.id)).rejects.toThrow(/another moderator/);
    await expect(moderationAdminService.dismiss(id, s.admin2.id, 'nothing there')).rejects.toThrow(/INVALID/);
    await moderationAdminService.verify(id, s.admin2.id, 'INVALID', 'No spam found');
    const dismissed = await moderationAdminService.dismiss(id, s.admin2.id, 'No spam found');
    expect(dismissed.status).toBe('DISMISSED');
    await moderationAdminService.resolve(id, s.admin2.id, undefined, true);
    const notice = await prisma.notification.findFirst({ where: { userId: s.reporterUser.id, type: 'report_update' } });
    expect(notice?.body).toMatch(/did not identify a violation/);
  });

  it('temporary suspension requires confirmation + duration and revokes access', async () => {
    const s = await seed();
    const { id } = await reports.create(s.reporterUser.id, { targetType: 'USER', targetId: s.ownerUser.id, reason: 'HARASSMENT' });
    await moderationAdminService.verify(id, s.admin.id, 'VALID', 'Repeated harassment in chat');
    await expect(moderationAdminService.takeAction(id, s.admin.id, { action: 'SUSPEND_TEMPORARY', reason: 'x', durationDays: 7 })).rejects.toThrow(/Confirm/);
    await expect(moderationAdminService.takeAction(id, s.admin.id, { action: 'SUSPEND_TEMPORARY', reason: 'x', confirm: true })).rejects.toThrow(/Duration/);
    await moderationAdminService.takeAction(id, s.admin.id, { action: 'SUSPEND_TEMPORARY', reason: 'Harassment', durationDays: 7, confirm: true });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: s.ownerUser.id } });
    expect(u.isActive).toBe(false);
    expect(u.suspendedUntil!.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  });

  it('block: immediate, symmetric hiding, admin signal, no self-block, unblock', async () => {
    const s = await seed();
    await expect(blockService.block(s.reporterUser.id, s.reporterUser.id)).rejects.toThrow(/yourself/);

    // An ACTIVE event from the business shows up before the block…
    await prisma.campaign.create({ data: {
      businessId: s.business.id, title: 'Visible event', description: 'd', category: 'content-creator', contentType: 'video',
      deliverables: '1', deadline: new Date(Date.now() + 7 * 86_400_000), budgetMin: 1, budgetMax: 1, paymentType: 'fixed',
      status: 'ACTIVE', campaignType: 'PAID_CAMPAIGN',
    } });
    const campaigns = new CampaignService();
    expect((await campaigns.list({} as never, 'en', s.reporterUser.id)).total).toBe(1);

    await blockService.block(s.reporterUser.id, s.business.id /* profile id accepted */, { source: 'profile' });
    expect(await prisma.moderationEvent.count({ where: { type: 'USER_BLOCKED', actorUserId: s.reporterUser.id, targetUserId: s.bizUser.id } })).toBe(1);
    await new Promise((res) => setTimeout(res, 50));
    expect(await prisma.notification.count({ where: { type: 'moderation_block' } })).toBe(2);

    // …and disappears for the blocker AND the blocked party right away.
    expect((await campaigns.list({} as never, 'en', s.reporterUser.id)).total).toBe(0);
    expect((await hiddenFor(s.bizUser.id)).userIds).toContain(s.reporterUser.id);
    // Others still see it.
    expect((await campaigns.list({} as never, 'en', s.ownerUser.id)).total).toBe(1);

    // Idempotent: a second tap doesn't create a second event.
    await blockService.block(s.reporterUser.id, s.bizUser.id);
    expect(await prisma.block.count()).toBe(1);

    expect((await blockService.list(s.reporterUser.id))[0]!.name).toBe('Blocked Biz');
    await blockService.unblock(s.reporterUser.id, s.bizUser.id);
    expect((await campaigns.list({} as never, 'en', s.reporterUser.id)).total).toBe(1);
  });

  it('terms: version-bound acceptance, optional declared age', async () => {
    const s = await seed();
    expect((await termsService.status(s.reporterUser.id)).accepted).toBe(false);
    await expect(termsService.accept(s.reporterUser.id, { termsVersion: '0', guidelinesVersion: '1' })).rejects.toThrow(/updated/);
    const kid = new Date(); kid.setUTCFullYear(kid.getUTCFullYear() - 15);
    await expect(termsService.accept(s.reporterUser.id, { termsVersion: '1', guidelinesVersion: '1', birthDate: kid.toISOString() })).rejects.toThrow(/at least 18/);
    // Date of birth is optional — accepting without one succeeds.
    await termsService.accept(s.reporterUser.id, { termsVersion: '1', guidelinesVersion: '1' });
    expect((await termsService.status(s.reporterUser.id)).accepted).toBe(true);

    // A new mandatory version requires re-acceptance (age is not asked again).
    await prisma.platformSetting.create({ data: { key: 'legal.version.terms', value: JSON.stringify('2') } });
    const { invalidateSettingsCache } = await import('../src/utils/settingsCache');
    invalidateSettingsCache();
    const st = await termsService.status(s.reporterUser.id);
    expect(st.accepted).toBe(false);
    expect(st.ageRequired).toBe(false);
    expect(await prisma.termsAcceptance.count({ where: { userId: s.reporterUser.id } })).toBe(1);
  });
});
