import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { hasDb, resetDb } from './helpers';
import prisma from '../src/prisma';

vi.mock('../src/modules/notifications/notification.service', async (orig) => {
  const actual = await orig<typeof import('../src/modules/notifications/notification.service')>();
  return { ...actual, sendExpoPush: vi.fn().mockResolvedValue(undefined) };
});
vi.mock('../src/utils/email/collaborationReminder', async (orig) => ({
  ...(await orig<typeof import('../src/utils/email/collaborationReminder')>()),
  sendActionEmail: vi.fn().mockResolvedValue(undefined),
}));
// No network in tests — Drive accessibility is inconclusive unless a test says otherwise.
const access = vi.hoisted(() => ({ value: 'UNKNOWN' as 'UNKNOWN' | 'RESTRICTED' | 'ACCESSIBLE' }));
vi.mock('../src/modules/competition/competition.links', async (orig) => ({
  ...(await orig<typeof import('../src/modules/competition/competition.links')>()),
  checkLinkAccessibility: vi.fn(async () => access.value),
}));

import { CompetitionService } from '../src/modules/competition/competition.service';
import { createCompetitionSchema } from '../src/modules/competition/competition.schema';
import { env } from '../src/config/env';

const d = hasDb ? describe : describe.skip;
const H = 3_600_000;
const svc = new CompetitionService();
const DRIVE = (n: number) => `https://drive.google.com/file/d/1AbCdEfGhIjKlMn${n}/view`;

async function mkUser(role: 'BUSINESS' | 'CREATOR' | 'ADMIN') {
  return prisma.user.create({ data: { email: `${role.toLowerCase()}-${randomUUID()}@test.dev`, password: 'x', role } });
}
async function mkCreator(name = 'Creator') {
  const u = await mkUser('CREATOR');
  const c = await prisma.creatorProfile.create({ data: { userId: u.id, fullName: name, categories: [] } });
  return { userId: u.id, creatorId: c.id };
}
async function seed() {
  const biz = await mkUser('BUSINESS');
  const otherBiz = await mkUser('BUSINESS');
  const admin = await mkUser('ADMIN');
  await prisma.businessProfile.create({ data: { userId: biz.id, businessName: 'Kolab', categories: [] } });
  await prisma.businessProfile.create({ data: { userId: otherBiz.id, businessName: 'Other', categories: [] } });
  const creators = await Promise.all([1, 2, 3, 4].map((i) => mkCreator(`Creator ${i}`)));
  return { bizId: biz.id, otherBizId: otherBiz.id, admin, creators };
}

function input(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return createCompetitionSchema.parse({
    title: 'Kolab Creator Challenge 2026',
    description: 'Create a 30–60 second video promoting Kolab.',
    rules: 'One entry per creator. Original work only.',
    registrationOpensAt: new Date(now - H),
    registrationDeadline: new Date(now + 48 * H),
    startsAt: new Date(now - H),
    endsAt: new Date(now + 30 * 24 * H),
    stages: [
      { name: 'Round 1', opensAt: new Date(now - H), deadline: new Date(now + 72 * H), advanceLimit: 2, allowedMethods: ['VIDEO_UPLOAD', 'EXTERNAL_LINK'] },
      { name: 'Final', opensAt: new Date(now + 96 * H), deadline: new Date(now + 120 * H), allowedMethods: ['VIDEO_UPLOAD', 'EXTERNAL_LINK'] },
    ],
    prizes: [
      { kind: 'PLACEMENT', title: 'Winner', amount: 10000, recipientCount: 1 },
      { kind: 'PLACEMENT', title: 'First runner-up', amount: 8000, recipientCount: 1 },
      { kind: 'SPECIAL', title: 'Consolation', amount: 2000, recipientCount: 5 },
    ],
    ...overrides,
  });
}

async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 3000): Promise<T> {
  const until = Date.now() + ms;
  let v = await fn();
  while (!ok(v) && Date.now() < until) { await new Promise((r) => setTimeout(r, 50)); v = await fn(); }
  return v;
}
const notifs = (userId: string, type: string) => prisma.notification.count({ where: { userId, type } });

/** Organizer submits, an admin approves — the only way a competition goes live. */
async function launch(s: Awaited<ReturnType<typeof seed>>, id: string, publishAt?: Date) {
  await svc.submitForReview(s.bizId, id, publishAt);
  await svc.approve(s.admin.id, id);
  return svc.getForOrganizer(s.bizId, id);
}

async function publishedWithJoins(s: Awaited<ReturnType<typeof seed>>, overrides: Record<string, unknown> = {}) {
  const c = await svc.create(s.bizId, input(overrides));
  await launch(s, c.id);
  for (const cr of s.creators) await svc.join(cr.userId, c.id);
  return c;
}

d('competitions', () => {
  let s: Awaited<ReturnType<typeof seed>>;
  beforeEach(async () => {
    await resetDb();
    access.value = 'UNKNOWN';
    s = await seed();
  });

  // ── Creation + discovery ──────────────────────────────────────────────────

  it('creates as a draft that is not discoverable, then publishes and opens round 1', async () => {
    const c = await svc.create(s.bizId, input());
    expect(c.status).toBe('DRAFT');
    expect((await svc.discover({ tab: 'all', page: 1, limit: 10 })).items).toHaveLength(0);
    await expect(svc.getPublic(c.id, { id: s.creators[0].userId, role: 'CREATOR' })).rejects.toMatchObject({ statusCode: 404 });

    const published = await launch(s, c.id);
    expect(published.status).toBe('ACTIVE');
    expect(published.stages[0].status).toBe('OPEN');
    const list = await svc.discover({ tab: 'open', page: 1, limit: 10 }, { id: s.creators[0].userId, role: 'CREATOR' });
    expect(list.items.map((i) => i.id)).toEqual([c.id]);
    expect(list.items[0].prizePool).toEqual({ amount: 28000, currency: 'NPR' });
    const detail = await svc.getPublic(c.slug, { id: s.creators[0].userId, role: 'CREATOR' });
    expect(detail.viewer.canJoin).toBe(true);
  });

  // ── Admin review ──────────────────────────────────────────────────────────

  it('requires admin approval before anything is public — even for verified businesses', async () => {
    await prisma.businessProfile.updateMany({ where: { userId: s.bizId }, data: { isVerified: true } });
    const c = await svc.create(s.bizId, input());
    const submitted = await svc.submitForReview(s.bizId, c.id);
    expect(submitted.status).toBe('PENDING_REVIEW');
    expect((await svc.discover({ tab: 'all', page: 1, limit: 10 })).items).toHaveLength(0);
    await expect(svc.getPublic(c.id, { id: s.creators[0].userId, role: 'CREATOR' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.join(s.creators[0].userId, c.id)).rejects.toMatchObject({ statusCode: 404 });
    expect(await waitFor(() => notifs(s.admin.id, 'competition_review_submitted'), (n) => n === 1)).toBe(1);
    expect((await svc.adminList({ review: 'pending', page: 1, limit: 25 })).items.map((i) => i.id)).toEqual([c.id]);

    await svc.approve(s.admin.id, c.id);
    expect((await svc.discover({ tab: 'open', page: 1, limit: 10 })).items).toHaveLength(1);
    expect(await waitFor(() => notifs(s.bizId, 'competition_review_approved'), (n) => n === 1)).toBe(1);
    expect((await prisma.competitionReview.findMany({ where: { competitionId: c.id }, orderBy: { createdAt: 'asc' } })).map((r) => r.action)).toEqual(['SUBMITTED', 'APPROVED']);
    // A second admin clicking approve gets a conflict, not a second decision.
    await expect(svc.approve(s.admin.id, c.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('handles requested changes, resubmission and permanent rejection', async () => {
    const c = await svc.create(s.bizId, input());
    await svc.submitForReview(s.bizId, c.id);
    await expect(svc.requestChanges(s.admin.id, c.id, 'too short')).rejects.toMatchObject({ statusCode: 400 });
    await svc.requestChanges(s.admin.id, c.id, 'Please state who pays for prize delivery.');
    const back = await svc.getForOrganizer(s.bizId, c.id);
    expect(back.status).toBe('CHANGES_REQUESTED');
    expect(back.review.feedback).toMatch(/prize delivery/);
    expect(await waitFor(() => notifs(s.bizId, 'competition_review_changes_requested'), (n) => n === 1)).toBe(1);

    await svc.update(s.bizId, c.id, { rules: 'One entry per creator. Prizes are delivered by Kolab within 30 days.' });
    expect((await svc.submitForReview(s.bizId, c.id)).status).toBe('PENDING_REVIEW');
    await svc.reject(s.admin.id, c.id, 'Prize claims could not be verified.', false);
    await expect(svc.submitForReview(s.bizId, c.id)).rejects.toMatchObject({ statusCode: 403 });
    expect((await prisma.competitionReview.findMany({ where: { competitionId: c.id }, orderBy: { createdAt: 'asc' } })).map((r) => r.action))
      .toEqual(['SUBMITTED', 'CHANGES_REQUESTED', 'RESUBMITTED', 'REJECTED']);
  });

  it('won’t approve a competition whose dates lapsed in the queue', async () => {
    const c = await svc.create(s.bizId, input());
    await svc.submitForReview(s.bizId, c.id);
    await prisma.competition.update({ where: { id: c.id }, data: { registrationDeadline: new Date(Date.now() - 1000) } });
    await expect(svc.approve(s.admin.id, c.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('keeps the approved rules live while an edit to rules/prizes awaits review', async () => {
    const c = await publishedWithJoins(s);
    const original = c.rules;
    const after = await svc.update(s.bizId, c.id, {
      rules: 'New rules: two entries allowed.',
      contactInstructions: 'Email contest@kolab.com.np',
      prizes: [{ kind: 'PLACEMENT', title: 'Winner', amount: 50000, currency: 'NPR', recipientCount: 1 }],
    });
    // Non-reviewed field applies now; reviewed ones wait.
    expect(after.contactInstructions).toBe('Email contest@kolab.com.np');
    expect(after.rules).toBe(original);
    expect(after.prizes).toHaveLength(3);
    expect(Object.keys(after.review.pendingChanges ?? {}).sort()).toEqual(['prizes', 'rules']);
    expect((await svc.getPublic(c.id)).rules).toBe(original);
    expect((await svc.adminList({ review: 'pending', page: 1, limit: 25 })).items[0].hasPendingChanges).toBe(true);

    await svc.approveChanges(s.admin.id, c.id);
    const pub = await svc.getPublic(c.id);
    expect(pub.rules).toBe('New rules: two entries allowed.');
    expect(pub.prizes.map((p) => p.amount)).toEqual([50000]);
    expect(await waitFor(() => notifs(s.creators[0].userId, 'competition_updated'), (n) => n >= 1)).toBeGreaterThanOrEqual(1);

    await svc.update(s.bizId, c.id, { eligibility: 'Nepal residents only' });
    await svc.rejectChanges(s.admin.id, c.id, 'Eligibility must be set before launch.');
    const o = await svc.getForOrganizer(s.bizId, c.id);
    expect(o.eligibility).toBeNull();
    expect(o.review.pendingChanges).toBeNull();
    expect(o.review.pendingChangesFeedback).toMatch(/before launch/);
  });

  it('sends an approved-but-scheduled competition back to review on a material edit', async () => {
    const c = await svc.create(s.bizId, input());
    await launch(s, c.id, new Date(Date.now() + 5 * H));
    expect((await svc.update(s.bizId, c.id, { contactInstructions: 'DM us' })).status).toBe('SCHEDULED');
    expect((await svc.update(s.bizId, c.id, { rules: 'Changed rules after approval, still not public.' })).status).toBe('PENDING_REVIEW');
  });

  it('rejects invalid stage schedules', async () => {
    const now = Date.now();
    await expect(svc.create(s.bizId, input({
      stages: [{ name: 'R1', opensAt: new Date(now + 10 * H), deadline: new Date(now + 5 * H), allowedMethods: ['EXTERNAL_LINK'] }],
    }))).rejects.toMatchObject({ statusCode: 400 });
  });

  it('publishes a scheduled competition only when its time comes', async () => {
    const c = await svc.create(s.bizId, input());
    const at = new Date(Date.now() + 2 * H);
    expect((await launch(s, c.id, at)).status).toBe('SCHEDULED');
    await svc.runLifecycleSweep(new Date(Date.now() + H));
    expect((await prisma.competition.findUnique({ where: { id: c.id } }))!.status).toBe('SCHEDULED');
    await svc.runLifecycleSweep(new Date(Date.now() + 3 * H));
    expect((await prisma.competition.findUnique({ where: { id: c.id } }))!.status).toBe('ACTIVE');
  });

  it('restricts management to the owning organizer', async () => {
    const c = await svc.create(s.bizId, input());
    await expect(svc.getForOrganizer(s.otherBizId, c.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.submitForReview(s.otherBizId, c.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.listParticipants(s.otherBizId, c.id, { filter: 'ALL', page: 1, limit: 25 })).rejects.toMatchObject({ statusCode: 404 });
  });

  // ── Participation ─────────────────────────────────────────────────────────

  it('lets an eligible creator join once and notifies both sides', async () => {
    const c = await svc.create(s.bizId, input());
    await launch(s, c.id);
    const me = s.creators[0];
    const progress = await svc.join(me.userId, c.id);
    expect(progress.status).toBe('SUBMISSION_REQUIRED');
    await expect(svc.join(me.userId, c.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await waitFor(() => notifs(me.userId, 'competition_joined'), (n) => n === 1)).toBe(1);
    expect(await waitFor(() => notifs(s.bizId, 'competition_new_participants'), (n) => n === 1)).toBe(1);
    // Business accounts can't join.
    await expect(svc.join(s.bizId, c.id)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('handles concurrent duplicate joins with exactly one participation', async () => {
    const c = await svc.create(s.bizId, input());
    await launch(s, c.id);
    const r = await Promise.allSettled([svc.join(s.creators[0].userId, c.id), svc.join(s.creators[0].userId, c.id)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.competitionParticipant.count({ where: { competitionId: c.id } })).toBe(1);
  });

  it('rejects registration after the deadline with a clear reason', async () => {
    const c = await svc.create(s.bizId, input());
    await launch(s, c.id);
    await prisma.competition.update({ where: { id: c.id }, data: { registrationDeadline: new Date(Date.now() - 1000) } });
    await expect(svc.join(s.creators[0].userId, c.id)).rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/closed/i) });
  });

  // ── Submissions ───────────────────────────────────────────────────────────

  it('accepts a link, keeps version history on replacement, and lists non-submitters to the organizer', async () => {
    const c = await publishedWithJoins(s);
    const r1 = c.stages[0].id;
    const me = s.creators[0];
    await svc.submitLink(me.userId, c.id, r1, { url: DRIVE(1) });
    const second = await svc.submitLink(me.userId, c.id, r1, { url: DRIVE(2), caption: 'v2' });
    expect(second.version).toBe(2);
    expect(await prisma.competitionSubmission.count({ where: { stageId: r1 } })).toBe(1);
    expect(await prisma.competitionSubmissionVersion.count()).toBe(1);

    const notSubmitted = await svc.listParticipants(s.bizId, c.id, { filter: 'NOT_SUBMITTED', page: 1, limit: 25 });
    expect(notSubmitted.pagination.total).toBe(3);
    const sub = await prisma.competitionSubmission.findFirstOrThrow({ where: { stageId: r1 } });
    const detail = await svc.getSubmission(s.bizId, c.id, r1, sub.participantId);
    expect(detail.submission!.history).toHaveLength(1);
  });

  it('rejects unsupported or unshared links', async () => {
    const c = await publishedWithJoins(s);
    const me = s.creators[0];
    await expect(svc.submitLink(me.userId, c.id, c.stages[0].id, { url: 'https://example.com/v.mp4' })).rejects.toMatchObject({ statusCode: 400 });
    access.value = 'RESTRICTED';
    await expect(svc.submitLink(me.userId, c.id, c.stages[0].id, { url: DRIVE(1) })).rejects.toMatchObject({ statusCode: 400, data: { code: 'LINK_NOT_SHARED' } });
  });

  it('blocks replacement when edits are disabled', async () => {
    const c = await publishedWithJoins(s, { allowSubmissionEdits: false });
    const me = s.creators[0];
    await svc.submitLink(me.userId, c.id, c.stages[0].id, { url: DRIVE(1) });
    await expect(svc.submitLink(me.userId, c.id, c.stages[0].id, { url: DRIVE(2) })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects late submissions until the stage is reopened', async () => {
    const c = await publishedWithJoins(s);
    const r1 = c.stages[0].id;
    const me = s.creators[0];
    await prisma.competitionStage.update({ where: { id: r1 }, data: { deadline: new Date(Date.now() - 1000) } });
    await expect(svc.submitLink(me.userId, c.id, r1, { url: DRIVE(1) })).rejects.toMatchObject({ statusCode: 409 });

    await svc.runLifecycleSweep(new Date());
    expect((await prisma.competitionStage.findUnique({ where: { id: r1 } }))!.status).toBe('UNDER_REVIEW');
    await svc.reopenStage(s.bizId, c.id, r1, new Date(Date.now() + 24 * H));
    expect((await prisma.competitionStage.findUnique({ where: { id: r1 } }))!.status).toBe('OPEN');
    await expect(svc.submitLink(me.userId, c.id, r1, { url: DRIVE(1) })).resolves.toMatchObject({ method: 'EXTERNAL_LINK' });
  });

  it('prevents creators from submitting to a stage they are not eligible for', async () => {
    const c = await publishedWithJoins(s);
    await expect(svc.submitLink(s.creators[0].userId, c.id, c.stages[1].id, { url: DRIVE(1) })).rejects.toMatchObject({ statusCode: 403 });
    const outsider = await mkCreator('Outsider');
    await expect(svc.submitLink(outsider.userId, c.id, c.stages[0].id, { url: DRIVE(1) })).rejects.toMatchObject({ statusCode: 403 });
  });

  // ── Decisions ─────────────────────────────────────────────────────────────

  async function reviewReady() {
    const c = await publishedWithJoins(s);
    const r1 = c.stages[0].id;
    for (const cr of s.creators.slice(0, 3)) await svc.submitLink(cr.userId, c.id, r1, { url: DRIVE(1) });
    await svc.closeStage(s.bizId, c.id, r1);
    const parts = await prisma.competitionParticipant.findMany({ where: { competitionId: c.id }, include: { creator: true }, orderBy: { joinedAt: 'asc' } });
    return { c, r1, parts };
  }

  it('keeps draft decisions private and publishes them explicitly', async () => {
    const { c, r1, parts } = await reviewReady();
    // Closing a stage ≠ closing the competition.
    expect((await prisma.competition.findUnique({ where: { id: c.id } }))!.status).toBe('ACTIVE');
    await svc.saveDecisions(s.bizId, c.id, r1, { decisions: [
      { participantId: parts[0].id, decision: 'ADVANCE', notes: 'Great hook' },
      { participantId: parts[1].id, decision: 'ADVANCE' },
    ] });

    // Draft: creators see nothing, nobody is notified.
    const mine = await svc.myProgress(parts[0].creator.userId, c.id);
    expect(mine.stages[0].outcome).toBeNull();
    expect(JSON.stringify(mine)).not.toContain('Great hook');
    expect(await notifs(parts[0].creator.userId, 'competition_advanced')).toBe(0);
    expect((await prisma.competitionStage.findUnique({ where: { id: r1 } }))!.status).toBe('SELECTION_PENDING');

    // Publishing must match what the organizer reviewed.
    await expect(svc.publishDecisions(s.bizId, c.id, r1, 1)).rejects.toMatchObject({ statusCode: 409 });
    await svc.publishDecisions(s.bizId, c.id, r1, 2);

    const after = await prisma.competitionParticipant.findMany({ where: { competitionId: c.id }, orderBy: { joinedAt: 'asc' } });
    expect(after.map((p) => [p.status, p.currentStageOrder])).toEqual([['ACTIVE', 2], ['ACTIVE', 2], ['NOT_SELECTED', 1], ['NOT_SELECTED', 1]]);
    expect(await waitFor(() => notifs(parts[0].creator.userId, 'competition_advanced'), (n) => n === 1)).toBe(1);
    expect(await waitFor(() => notifs(parts[2].creator.userId, 'competition_not_selected'), (n) => n === 1)).toBe(1);
    expect((await svc.myProgress(parts[0].creator.userId, c.id)).status).toBe('FINALIST');
    expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'competition.decisions_published' } })).toBe(1);
    await expect(svc.publishDecisions(s.bizId, c.id, r1, 2)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('enforces the configured advancement limit', async () => {
    const { c, r1, parts } = await reviewReady();
    await svc.saveDecisions(s.bizId, c.id, r1, { decisions: parts.slice(0, 3).map((p) => ({ participantId: p.id, decision: 'ADVANCE' as const })) });
    await expect(svc.publishDecisions(s.bizId, c.id, r1, 3)).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/at most 2/) });
  });

  it('does not corrupt progression under concurrent publishes', async () => {
    const { c, r1, parts } = await reviewReady();
    await svc.saveDecisions(s.bizId, c.id, r1, { decisions: [{ participantId: parts[0].id, decision: 'ADVANCE' }] });
    const r = await Promise.allSettled([svc.publishDecisions(s.bizId, c.id, r1, 1), svc.publishDecisions(s.bizId, c.id, r1, 1)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.competitionParticipant.count({ where: { competitionId: c.id, currentStageOrder: 2 } })).toBe(1);
    expect(await prisma.competitionStageDecision.count({ where: { stageId: r1 } })).toBe(4);
  });

  it('runs a full 3-stage progression: 4 → top 2 → top 1 → winner', async () => {
    const now = Date.now();
    const c = await publishedWithJoins(s, {
      stages: [
        { name: 'Round 1', opensAt: new Date(now - H), deadline: new Date(now + 24 * H), advanceLimit: 2, allowedMethods: ['EXTERNAL_LINK'] },
        { name: 'Top 2', opensAt: new Date(now + 48 * H), deadline: new Date(now + 72 * H), advanceLimit: 1, allowedMethods: ['EXTERNAL_LINK'] },
        { name: 'Grand Final', opensAt: new Date(now + 96 * H), deadline: new Date(now + 120 * H), allowedMethods: ['EXTERNAL_LINK'] },
      ],
      prizes: [{ kind: 'PLACEMENT', title: 'Winner', amount: 10000, recipientCount: 1 }],
    });
    const [r1, r2, fin] = c.stages;
    const parts = await prisma.competitionParticipant.findMany({ where: { competitionId: c.id }, include: { creator: true }, orderBy: { joinedAt: 'asc' } });
    const uid = (i: number) => parts[i].creator.userId;

    // Round 1: everyone submits; organizer advances two.
    for (let i = 0; i < 4; i++) await svc.submitLink(uid(i), c.id, r1.id, { url: DRIVE(i) });
    await svc.runLifecycleSweep(new Date(now + 25 * H));
    await svc.saveDecisions(s.bizId, c.id, r1.id, { decisions: [0, 1].map((i) => ({ participantId: parts[i].id, decision: 'ADVANCE' as const })) });
    await svc.publishDecisions(s.bizId, c.id, r1.id, 2);

    // Stage 2 opens on schedule only for the two who advanced; a new entry is required.
    await svc.runLifecycleSweep(new Date(now + 49 * H));
    expect((await prisma.competitionStage.findUnique({ where: { id: r2.id } }))!.status).toBe('OPEN');
    expect((await svc.myProgress(uid(0), c.id)).status).toBe('SUBMISSION_REQUIRED');
    expect((await svc.myProgress(uid(2), c.id)).status).toBe('NOT_SELECTED');
    await prisma.competitionStage.update({ where: { id: r2.id }, data: { deadline: new Date(Date.now() + H) } }); // let "now" submit
    await expect(svc.submitLink(uid(2), c.id, r2.id, { url: DRIVE(9) })).rejects.toMatchObject({ statusCode: 403 });
    await svc.submitLink(uid(0), c.id, r2.id, { url: DRIVE(10) });
    await svc.submitLink(uid(1), c.id, r2.id, { url: DRIVE(11) });
    await svc.closeStage(s.bizId, c.id, r2.id);
    await svc.saveDecisions(s.bizId, c.id, r2.id, { decisions: [{ participantId: parts[0].id, decision: 'ADVANCE' }] });
    await svc.publishDecisions(s.bizId, c.id, r2.id, 1);
    expect((await svc.myProgress(uid(0), c.id)).status).toBe('FINALIST');
    expect((await svc.myProgress(uid(1), c.id)).status).toBe('NOT_SELECTED');

    // Final: open early, submit, close → awaiting results → award → completed.
    await svc.openStage(s.bizId, c.id, fin.id);
    await svc.submitLink(uid(0), c.id, fin.id, { url: DRIVE(12) });
    await svc.closeStage(s.bizId, c.id, fin.id);
    expect((await prisma.competition.findUnique({ where: { id: c.id } }))!.status).toBe('AWAITING_RESULTS');
    // Eliminated creators can't be awarded.
    await expect(svc.saveAwards(s.bizId, c.id, { awards: [{ prizeId: c.prizes[0].id, participantId: parts[1].id }] })).rejects.toMatchObject({ statusCode: 400 });
    await svc.saveAwards(s.bizId, c.id, { awards: [{ prizeId: c.prizes[0].id, participantId: parts[0].id }] });
    await svc.publishResults(s.bizId, c.id, 1);

    const final = await prisma.competitionParticipant.findMany({ where: { competitionId: c.id }, orderBy: { joinedAt: 'asc' } });
    expect(final.map((p) => [p.status, p.currentStageOrder, p.eliminatedAtOrder])).toEqual([
      ['ACTIVE', 3, null], ['NOT_SELECTED', 2, 2], ['NOT_SELECTED', 1, 1], ['NOT_SELECTED', 1, 1],
    ]);
    expect((await svc.getPublic(c.id)).results!.map((r) => r.creator.fullName)).toEqual(['Creator 1']);
    expect((await svc.myProgress(uid(0), c.id)).awards.map((a) => a.title)).toEqual(['Winner']);
  });

  // ── Scheduling ────────────────────────────────────────────────────────────

  it('an extended deadline is not closed by a stale sweep, and sweeps are idempotent', async () => {
    const c = await publishedWithJoins(s);
    const r1 = c.stages[0];
    const original = new Date(r1.deadline);
    await svc.extendStageDeadline(s.bizId, c.id, r1.id, new Date(original.getTime() + 2 * H));

    // A sweep at a time past the ORIGINAL deadline must leave the stage open.
    await svc.runLifecycleSweep(new Date(original.getTime() + H));
    expect((await prisma.competitionStage.findUnique({ where: { id: r1.id } }))!.status).toBe('OPEN');

    const late = new Date(original.getTime() + 3 * H);
    await svc.runLifecycleSweep(late);
    await svc.runLifecycleSweep(late);
    expect((await prisma.competitionStage.findUnique({ where: { id: r1.id } }))!.status).toBe('UNDER_REVIEW');
    expect(await waitFor(() => notifs(s.bizId, 'competition_ready_for_review'), (n) => n >= 1)).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'competition.stage_closed' } })).toBe(1);
    expect(await waitFor(() => notifs(s.creators[0].userId, 'competition_deadline_changed'), (n) => n === 1)).toBe(1);
  });

  it('sends 24h reminders once per deadline', async () => {
    const c = await publishedWithJoins(s);
    const r1 = c.stages[0];
    const t = new Date(new Date(r1.deadline).getTime() - 12 * H);
    await svc.runLifecycleSweep(t);
    await svc.runLifecycleSweep(t);
    expect(await notifs(s.creators[0].userId, 'competition_deadline_reminder')).toBe(1);
  });

  it('closing the competition is separate from closing a stage', async () => {
    const c = await publishedWithJoins(s);
    const after = await svc.closeCompetition(s.bizId, c.id);
    expect(after.status).toBe('AWAITING_RESULTS');
    expect(after.stages.map((x) => x.status)).toEqual(['UNDER_REVIEW', 'CLOSED']);
  });

  // ── Final results ─────────────────────────────────────────────────────────

  it('publishes final results without any payment records, enforcing prize rules', async () => {
    const c = await publishedWithJoins(s);
    await svc.closeCompetition(s.bizId, c.id);
    const parts = await prisma.competitionParticipant.findMany({ where: { competitionId: c.id }, orderBy: { joinedAt: 'asc' } });
    const [win, ru, con] = c.prizes;

    // Conflicting ranking and one-prize-per-creator.
    await expect(svc.saveAwards(s.bizId, c.id, { awards: [{ prizeId: win.id, participantId: parts[0].id }, { prizeId: ru.id, participantId: parts[0].id }] })).rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.saveAwards(s.bizId, c.id, { awards: [{ prizeId: win.id, participantId: parts[0].id }, { prizeId: con.id, participantId: parts[0].id }] })).rejects.toMatchObject({ statusCode: 400 });

    await svc.saveAwards(s.bizId, c.id, { awards: [{ prizeId: win.id, participantId: parts[0].id }, { prizeId: ru.id, participantId: parts[1].id }, { prizeId: con.id, participantId: parts[2].id }] });
    // Draft results are invisible publicly.
    expect((await svc.getPublic(c.id)).results).toBeNull();

    const done = await svc.publishResults(s.bizId, c.id, 3);
    expect(done.status).toBe('COMPLETED');
    const pub = await svc.getPublic(c.id);
    expect(pub.results!.map((r) => r.prize.title)).toEqual(['Winner', 'First runner-up', 'Consolation']);
    expect(await waitFor(() => notifs(s.creators[3].userId, 'competition_results_published'), (n) => n === 1)).toBe(1);

    expect(await prisma.paymentTransaction.count()).toBe(0);
    expect(await prisma.walletTransaction.count()).toBe(0);

    // Reopening is explicit, reasoned and audited.
    const reopened = await svc.reopenResults(s.bizId, c.id, 'Wrong winner assigned by mistake');
    expect(reopened.status).toBe('AWAITING_RESULTS');
    expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'competition.results_reopened' } })).toBe(1);
  });

  // ── Admin oversight ───────────────────────────────────────────────────────

  it('gives admins aggregate oversight only, and gates + audits moderation', async () => {
    const { c, r1, parts } = await reviewReady();
    await svc.saveDecisions(s.bizId, c.id, r1, { decisions: [{ participantId: parts[0].id, decision: 'ADVANCE', notes: 'secret note' }] });

    const view = await svc.adminGet(c.id, s.admin.email);
    const json = JSON.stringify(view);
    expect(view.participantCount).toBe(4);
    expect(view.stages[0].submissions).toBe(3);
    expect(view.stages[0].advanced).toBe(0); // the draft isn't counted
    expect(json).not.toContain('drive.google.com');
    expect(json).not.toContain('secret note');
    expect(json).not.toContain('Creator 1');
    expect(view.viewerIsModerator).toBe(false);

    await expect(svc.moderationSubmissions(s.admin.id, s.admin.email, c.id, r1, 'Investigating report')).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.suspend(s.admin.id, s.admin.email, c.id, 'Suspected fraud')).rejects.toMatchObject({ statusCode: 403 });

    const prev = env.COMPETITION_MODERATOR_EMAILS;
    env.COMPETITION_MODERATOR_EMAILS = s.admin.email;
    try {
      const evidence = await svc.moderationSubmissions(s.admin.id, s.admin.email, c.id, r1, 'Investigating report');
      expect(evidence.items).toHaveLength(3);
      expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'competition.sensitive_access', userId: s.admin.id } })).toBe(1);

      await svc.suspend(s.admin.id, s.admin.email, c.id, 'Suspected fraud');
      expect((await svc.discover({ tab: 'all', page: 1, limit: 10 })).items).toHaveLength(0);
      await expect(svc.submitLink(parts[3].creator.userId, c.id, r1, { url: DRIVE(1) })).rejects.toMatchObject({ statusCode: 409 });
      await expect(svc.saveDecisions(s.bizId, c.id, r1, { decisions: [{ participantId: parts[1].id, decision: 'ADVANCE' }] })).rejects.toMatchObject({ statusCode: 403 });
    } finally {
      env.COMPETITION_MODERATOR_EMAILS = prev;
    }
  });
});
