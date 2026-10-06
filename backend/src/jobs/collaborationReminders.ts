import cron from 'node-cron';
import { sendExpoPush } from '../modules/notifications/notification.service';
import prisma from '../prisma';
import { logger } from '../config/logger';
import { reportError, LogEvent } from '../config/observability';
import { getEscrowTimings } from '../modules/campaign/escrow-config';
import { getReminderTimings } from '../modules/notifications/reminder-config';
import {
  notify, engagementKey, collaborationWebUrl, NotificationEvent, type NotifyResult,
  applicationPushWindow, applicationPushKey,
} from '../modules/notifications/notify';

// ───────────────────────────────────────────────────────────────────────────────
// Collaboration reminders (reminder spec Phase 1). Each sweep looks for paid
// engagements whose outstanding action is STILL outstanding and whose escrow
// deadline is within the reminder's lead time. Nothing is pre-scheduled, so a
// completed action can never trigger a stale reminder: once the creator
// confirms / submits or the business funds, the row stops matching. notify()'s
// dedupe key (which includes the deadline, so a revision's fresh deadline
// re-arms the due reminders) keeps each reminder to one send.
// ───────────────────────────────────────────────────────────────────────────────

const H = 3_600_000;

const INCLUDE = {
  creator:  { select: { userId: true, fullName: true } },
  campaign: { select: { title: true, business: { select: { userId: true, businessName: true } } } },
} as const;

type Row = {
  id: string;
  campaignId: string;
  proposedRate: number;
  paidAt: Date | null;
  paymentDueAt: Date | null;
  creatorConfirmationDueAt: Date | null;
  creatorConfirmedAt: Date | null;
  revisionRequestedAt: Date | null;
  contentDeadline: Date | null;
  creator: { userId: string; fullName: string | null };
  campaign: { title: string; business: { userId: string; businessName: string | null } };
};

/** "in 5 hours" / "tomorrow" — rounded up so a reminder never understates the time left. */
export function dueIn(deadline: Date, now: Date): string {
  const hours = Math.ceil((deadline.getTime() - now.getTime()) / H);
  if (hours <= 1) return 'within the hour';
  if (hours < 20) return `in ${hours} hours`;
  return 'tomorrow';
}

function ktm(d: Date): string {
  return d.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' });
}

const names = (r: Row) => ({
  biz:     r.campaign.business.businessName ?? 'the business',
  creator: r.creator.fullName ?? 'Your creator',
  title:   r.campaign.title,
});

/** Stage started long enough ago that a reminder won't pile onto the update that started it. */
function oldEnough(stageStart: Date | null, now: Date, minAgeHours: number): boolean {
  return !!stageStart && now.getTime() - stageStart.getTime() >= minAgeHours * H;
}

const count = (results: NotifyResult[]) => results.filter((r) => r === 'sent').length;

// ── B9: business hasn't funded escrow yet ─────────────────────────────────────
export async function remindPaymentPending(now: Date): Promise<number> {
  const [t, escrow] = await Promise.all([getReminderTimings(), getEscrowTimings()]);
  const rows = await prisma.application.findMany({
    where: {
      status:       'ACCEPTED',
      escrowStatus: 'NOT_FUNDED',
      campaign:     { campaignType: 'PAID_CAMPAIGN' },
      paymentDueAt: { gt: now, lte: new Date(now.getTime() + t.paymentLeadHours * H) },
    },
    include: INCLUDE,
  }) as Row[];

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    // Selection time isn't stored; the window it was opened with is the best proxy.
    const selectedAt = new Date(r.paymentDueAt!.getTime() - escrow.paymentWindowHours * H);
    if (!oldEnough(selectedAt, now, t.minStageAgeHours)) continue;
    const { creator, title } = names(r);
    const when = dueIn(r.paymentDueAt!, now);
    sent.push(await notify({
      userId: r.campaign.business.userId,
      type: NotificationEvent.PAYMENT_PENDING,
      title: 'Payment pending',
      body: `Fund your collaboration with ${creator} for "${title}" ${when} to lock it in.`,
      refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId,
      dedupeKey: engagementKey(r.id, NotificationEvent.PAYMENT_PENDING, String(r.paymentDueAt!.getTime())),
      email: {
        subject: `Payment pending for your "${title}" collaboration`,
        heading: 'Complete your payment',
        paragraphs: [
          `You selected ${creator} for "${title}". Fund the collaboration ${when} so they can start creating.`,
          'Your payment is held safely by Kolab and only released when you approve the work.',
        ],
        details: [
          { label: 'Campaign', value: title },
          { label: 'Amount', value: `NPR ${r.proposedRate.toLocaleString()}` },
          { label: 'Pay by', value: ktm(r.paymentDueAt!) },
        ],
        cta: { label: 'Complete Payment', url: collaborationWebUrl('BUSINESS', NotificationEvent.PAYMENT_PENDING, r.campaignId) },
      },
    }));
  }
  return count(sent);
}

// ── C2 + B3: funded, creator hasn't confirmed ("Let's Start Work") ───────────
export async function remindConfirmationPending(now: Date): Promise<number> {
  const t = await getReminderTimings();
  const rows = await prisma.application.findMany({
    where: {
      status:                   'ACCEPTED',
      escrowStatus:             'HELD',
      workStatus:               'NONE',
      creatorConfirmationDueAt: { gt: now, lte: new Date(now.getTime() + t.confirmationLeadHours * H) },
    },
    include: INCLUDE,
  }) as Row[];

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    if (!oldEnough(r.paidAt, now, t.minStageAgeHours)) continue;
    const { biz, creator, title } = names(r);
    const when = dueIn(r.creatorConfirmationDueAt!, now);
    const type = NotificationEvent.COLLABORATION_CONFIRMATION_PENDING;
    const common = { type, refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId } as const;

    sent.push(await notify({
      ...common,
      userId: r.creator.userId,
      title: 'Collaboration waiting for you',
      body: `${biz} is waiting for you to confirm "${title}". Confirm ${when} to keep your spot.`,
      dedupeKey: engagementKey(r.id, type, 'creator'),
      email: {
        subject: `${biz} is waiting for your confirmation`,
        heading: 'Confirm your collaboration',
        paragraphs: [
          `${biz} has funded "${title}" and is waiting for you to confirm.`,
          `Tap "Let's Start Work" ${when}. If the window closes, the collaboration is released and the business is refunded.`,
        ],
        details: [
          { label: 'Campaign', value: title },
          { label: 'Earnings', value: `NPR ${r.proposedRate.toLocaleString()}` },
          { label: 'Confirm by', value: ktm(r.creatorConfirmationDueAt!) },
        ],
        cta: { label: 'Review Collaboration', url: collaborationWebUrl('CREATOR', type, r.campaignId) },
      },
    }));
    sent.push(await notify({
      ...common,
      userId: r.campaign.business.userId,
      title: 'Waiting on creator confirmation',
      body: `${creator} hasn't confirmed "${title}" yet. If they don't ${when}, you'll be refunded in full.`,
      dedupeKey: engagementKey(r.id, type, 'business'),
    }));
  }
  return count(sent);
}

// Content stage started at confirmation, or at the latest revision request.
function contentStageStart(r: Row): Date | null {
  const times = [r.creatorConfirmedAt, r.revisionRequestedAt].filter((d): d is Date => !!d);
  return times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;
}

const CONTENT_WHERE = (now: Date, leadHours: number) => ({
  status:          'ACCEPTED' as const,
  escrowStatus:    'HELD' as const,
  workStatus:      { in: ['IN_PROGRESS', 'REVISION'] as ('IN_PROGRESS' | 'REVISION')[] },
  contentDeadline: { gt: now, lte: new Date(now.getTime() + leadHours * H) },
});

// ── C4 + B5: deliverable due within ~24h ─────────────────────────────────────
export async function remindDeliverableDue(now: Date): Promise<number> {
  const t = await getReminderTimings();
  const rows = await prisma.application.findMany({
    where: CONTENT_WHERE(now, t.deliverableDueLeadHours),
    include: INCLUDE,
  }) as Row[];

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    const deadline = r.contentDeadline!;
    // Inside the "due soon" window the 3h reminder speaks instead.
    if (deadline.getTime() - now.getTime() <= t.deliverableDueSoonLeadHours * H) continue;
    if (!oldEnough(contentStageStart(r), now, t.minStageAgeHours)) continue;
    const { biz, creator, title } = names(r);
    const when = dueIn(deadline, now);
    const type = NotificationEvent.DELIVERABLE_DUE_24H;
    const common = { type, refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId } as const;
    const stamp = String(deadline.getTime());

    sent.push(await notify({
      ...common,
      userId: r.creator.userId,
      title: `Deliverable due ${when}`,
      body: `Your "${title}" deliverable for ${biz} is due ${when}.`,
      dedupeKey: engagementKey(r.id, type, `creator:${stamp}`),
      email: {
        subject: `Your "${title}" deliverable is due ${when}`,
        heading: `Deliverable due ${when}`,
        paragraphs: [
          `Your deliverable for ${biz} is due ${when}.`,
          'Submit your work before the deadline to keep the collaboration on track.',
        ],
        details: [
          { label: 'Campaign', value: title },
          { label: 'Due', value: ktm(deadline) },
        ],
        cta: { label: 'Submit Deliverable', url: collaborationWebUrl('CREATOR', type, r.campaignId) },
      },
    }));
    sent.push(await notify({
      ...common,
      userId: r.campaign.business.userId,
      title: `Deliverable due ${when}`,
      body: `${creator}'s deliverable for "${title}" is due ${when}.`,
      dedupeKey: engagementKey(r.id, type, `business:${stamp}`),
    }));
  }
  return count(sent);
}

// ── C5: deliverable due within ~3h, still not submitted ──────────────────────
export async function remindDeliverableDueSoon(now: Date): Promise<number> {
  const t = await getReminderTimings();
  const rows = await prisma.application.findMany({
    where: CONTENT_WHERE(now, t.deliverableDueSoonLeadHours),
    include: INCLUDE,
  }) as Row[];

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    if (!oldEnough(contentStageStart(r), now, t.minStageAgeHours)) continue;
    const { biz, title } = names(r);
    const when = dueIn(r.contentDeadline!, now);
    sent.push(await notify({
      userId: r.creator.userId,
      type: NotificationEvent.DELIVERABLE_DUE_3H,
      title: 'Deliverable due soon',
      body: `Your "${title}" deliverable for ${biz} is due ${when} and hasn't been submitted yet.`,
      refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId,
      dedupeKey: engagementKey(r.id, NotificationEvent.DELIVERABLE_DUE_3H, String(r.contentDeadline!.getTime())),
    }));
  }
  return count(sent);
}

// ── S1: active collaboration with no update and no chat message for N days ────
// Only the open-ended middle of the job (IN_PROGRESS / REVISION) — every other
// stage already has a deadline reminder or timeout, and the last stretch before
// the content deadline belongs to the due reminders. "Activity" = any change to
// the engagement row (uploads, transitions, deadlines) or a chat message
// between the pair. The dedupe key carries the last-activity time, so each
// quiet spell is flagged once; new activity followed by more silence re-arms it.
export async function remindInactive(now: Date): Promise<number> {
  const t = await getReminderTimings();
  if (t.inactivityDays <= 0) return 0;
  const quietSince = new Date(now.getTime() - t.inactivityDays * 24 * H);
  const rows = await prisma.application.findMany({
    where: {
      status:       'ACCEPTED',
      escrowStatus: 'HELD',
      workStatus:   { in: ['IN_PROGRESS', 'REVISION'] },
      updatedAt:    { lt: quietSince },
      OR: [
        { contentDeadline: null },
        { contentDeadline: { gt: new Date(now.getTime() + t.deliverableDueLeadHours * H) } },
      ],
    },
    include: { ...INCLUDE, campaign: { select: { title: true, businessId: true, business: { select: { userId: true, businessName: true } } } } },
  }) as (Row & { creatorId: string; updatedAt: Date; campaign: Row['campaign'] & { businessId: string } })[];
  if (rows.length === 0) return 0;

  const convos = await prisma.conversation.findMany({
    where: { OR: rows.map((r) => ({ creatorId: r.creatorId, businessId: r.campaign.businessId })) },
    select: { creatorId: true, businessId: true, lastMessageAt: true },
  });
  const lastMessage = new Map(convos.map((c) => [`${c.creatorId}:${c.businessId}`, c.lastMessageAt]));

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    const msgAt = lastMessage.get(`${r.creatorId}:${r.campaign.businessId}`);
    const lastActivity = msgAt && msgAt > r.updatedAt ? msgAt : r.updatedAt;
    if (lastActivity >= quietSince) continue;

    const { biz, creator, title } = names(r);
    const days = Math.floor((now.getTime() - lastActivity.getTime()) / (24 * H));
    const type = NotificationEvent.COLLABORATION_INACTIVE;
    const stamp = String(lastActivity.getTime());
    const common = { type, refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId } as const;
    const deadline = r.contentDeadline ? [{ label: 'Deliverable due', value: ktm(r.contentDeadline) }] : [];

    sent.push(await notify({
      ...common,
      userId: r.creator.userId,
      title: 'Collaboration needs attention',
      body: `Your "${title}" collaboration with ${biz} hasn't had an update in ${days} days.`,
      dedupeKey: engagementKey(r.id, type, `creator:${stamp}`),
      email: {
        subject: `Your "${title}" collaboration needs attention`,
        heading: 'Collaboration needs attention',
        paragraphs: [
          `Your collaboration with ${biz} on "${title}" hasn't had an update in ${days} days.`,
          'Share progress, ask a question, or submit your work to keep things moving.',
        ],
        details: [{ label: 'Campaign', value: title }, ...deadline],
        cta: { label: 'Continue Collaboration', url: collaborationWebUrl('CREATOR', type, r.campaignId) },
      },
    }));
    sent.push(await notify({
      ...common,
      userId: r.campaign.business.userId,
      title: 'Collaboration needs attention',
      body: `Your "${title}" collaboration with ${creator} hasn't had an update in ${days} days.`,
      dedupeKey: engagementKey(r.id, type, `business:${stamp}`),
      email: {
        subject: `Your "${title}" collaboration needs attention`,
        heading: 'Collaboration needs attention',
        paragraphs: [
          `Your collaboration with ${creator} on "${title}" hasn't had an update in ${days} days.`,
          'Check in with your creator to keep the campaign on track.',
        ],
        details: [{ label: 'Campaign', value: title }, ...deadline],
        cta: { label: 'Continue Collaboration', url: collaborationWebUrl('BUSINESS', type, r.campaignId) },
      },
    }));
  }
  return count(sent);
}

// ── S5: completed, this party hasn't rated the other yet ──────────────────────
// Two nudges per party (after reviewFirstHours, then at reviewSecondDays, at
// least 2 days after the first), then silence. Leaving a review removes the
// party from the match, so nothing further is sent. reviewMaxAgeDays keeps a
// deploy from nudging every historical unrated collaboration.
export async function remindReviewPending(now: Date): Promise<number> {
  const t = await getReminderTimings();
  const oldest = new Date(now.getTime() - t.reviewMaxAgeDays * 24 * H);
  const youngest = new Date(now.getTime() - t.reviewFirstHours * H);
  const rows = await prisma.application.findMany({
    where: {
      workStatus: 'COMPLETED',
      // Paid engagements stamp releasedAt; free events only have updatedAt.
      OR: [
        { releasedAt: { gte: oldest, lte: youngest } },
        { releasedAt: null, updatedAt: { gte: oldest, lte: youngest } },
      ],
    },
    include: { ...INCLUDE, reviews: { select: { fromUserId: true } } },
  }) as (Row & { releasedAt: Date | null; updatedAt: Date; reviews: { fromUserId: string }[] })[];

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    const completedAt = r.releasedAt ?? r.updatedAt;
    const ageMs = now.getTime() - completedAt.getTime();
    const reviewed = new Set(r.reviews.map((rv) => rv.fromUserId));
    const { biz, creator, title } = names(r);
    const type = NotificationEvent.REVIEW_PENDING;

    const parties = [
      { userId: r.creator.userId, role: 'creator', other: biz },
      { userId: r.campaign.business.userId, role: 'business', other: creator },
    ];
    for (const p of parties) {
      if (reviewed.has(p.userId)) continue;
      const firstKey = engagementKey(r.id, type, `${p.role}:1`);
      const first = await prisma.notificationDelivery.findUnique({ where: { dedupeKey: firstKey }, select: { createdAt: true } });
      let dedupeKey = firstKey;
      if (first) {
        const secondDue = ageMs >= t.reviewSecondDays * 24 * H
          && now.getTime() - first.createdAt.getTime() >= 2 * 24 * H;
        if (!secondDue) continue;
        dedupeKey = engagementKey(r.id, type, `${p.role}:2`);
      }
      sent.push(await notify({
        userId: p.userId,
        type,
        title: 'How was your collaboration?',
        body: `Share your experience working with ${p.other} on "${title}".`,
        refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId,
        dedupeKey,
      }));
    }
  }
  return count(sent);
}

// ── S2: last chat message in an active collaboration went unanswered ─────────
// Creator↔business chats only, and only while the pair has a live engagement
// (chat about a finished or never-started job isn't a collaboration action).
// The last message's sender is the one waiting; the other party is nudged
// once per unanswered message — any reply, or a system message, moves the
// thread on. Threads quiet longer than responseMaxAgeDays are ignored.
export async function remindResponsePending(now: Date): Promise<number> {
  const t = await getReminderTimings();
  if (t.responseHours <= 0) return 0;
  const convos = await prisma.conversation.findMany({
    where: {
      status:        'ACCEPTED',
      businessId:    { not: null },
      creatorId2:    null,
      lastMessageAt: {
        gte: new Date(now.getTime() - t.responseMaxAgeDays * 24 * H),
        lte: new Date(now.getTime() - t.responseHours * H),
      },
    },
    select: {
      id: true, creatorId: true, businessId: true, hiddenForCreator: true, hiddenForBusiness: true,
      creator:  { select: { userId: true, fullName: true } },
      business: { select: { userId: true, businessName: true } },
    },
  });

  const sent: NotifyResult[] = [];
  for (const c of convos) {
    if (!c.business) continue;
    const last = await prisma.message.findFirst({
      where:   { conversationId: c.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, senderId: true, type: true, createdAt: true },
    });
    if (!last || last.type === 'SYSTEM') continue;
    if (now.getTime() - last.createdAt.getTime() < t.responseHours * H) continue;

    const fromCreator = last.senderId === c.creator.userId;
    if (!fromCreator && last.senderId !== c.business.userId) continue;
    const recipientId = fromCreator ? c.business.userId : c.creator.userId;
    if (fromCreator ? c.hiddenForBusiness : c.hiddenForCreator) continue;

    const app = await prisma.application.findFirst({
      where: {
        creatorId: c.creatorId,
        status:    'ACCEPTED',
        workStatus: { notIn: ['COMPLETED', 'CANCELLED', 'CREATOR_FAILED'] },
        campaign:  { businessId: c.businessId! },
      },
      orderBy: { updatedAt: 'desc' },
      select:  { id: true, campaignId: true, campaign: { select: { title: true } } },
    });
    if (!app) continue;

    const senderName = fromCreator ? (c.creator.fullName ?? 'Your creator') : (c.business.businessName ?? 'The business');
    sent.push(await notify({
      userId: recipientId,
      type:   NotificationEvent.RESPONSE_PENDING,
      title:  `${senderName} is waiting for your response`,
      body:   `${senderName} messaged you about "${app.campaign.title}" and is waiting for your reply.`,
      refId:  app.campaignId, refType: 'campaign', applicationId: app.id, campaignId: app.campaignId,
      dedupeKey: `conv:${c.id}:${NotificationEvent.RESPONSE_PENDING}:${last.id}`,
    }));
  }
  return count(sent);
}

// ── S3: campaign deadline is close but the work can't start yet ──────────────
// Once the creator confirms, the content deadline (and the due reminders) take
// over, so the real risk is earlier: the business hasn't funded, or the creator
// hasn't confirmed. Only whoever is blocking hears about it, and not if their
// own stage reminder (payment/confirmation pending) landed in the last 6h —
// the two would otherwise arrive back-to-back saying the same thing.
const RECENT_STAGE_REMINDER_MS = 6 * H;

export async function remindDeadlineRisk(now: Date): Promise<number> {
  const t = await getReminderTimings();
  const rows = await prisma.application.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { escrowStatus: 'NOT_FUNDED' },
        { escrowStatus: 'HELD', workStatus: 'NONE' },
      ],
      campaign: {
        campaignType: 'PAID_CAMPAIGN',
        deadline: { gt: now, lte: new Date(now.getTime() + t.deadlineRiskLeadHours * H) },
      },
    },
    include: { ...INCLUDE, campaign: { select: { title: true, deadline: true, business: { select: { userId: true, businessName: true } } } } },
  }) as (Row & { escrowStatus: string; campaign: Row['campaign'] & { deadline: Date } })[];

  const sent: NotifyResult[] = [];
  for (const r of rows) {
    const unfunded = r.escrowStatus === 'NOT_FUNDED';
    const userId = unfunded ? r.campaign.business.userId : r.creator.userId;
    const stageType = unfunded ? NotificationEvent.PAYMENT_PENDING : NotificationEvent.COLLABORATION_CONFIRMATION_PENDING;
    const recent = await prisma.notificationDelivery.findFirst({
      where:  { applicationId: r.id, userId, type: stageType, createdAt: { gte: new Date(now.getTime() - RECENT_STAGE_REMINDER_MS) } },
      select: { id: true },
    });
    if (recent) continue;

    const { biz, creator, title } = names(r);
    const when = dueIn(r.campaign.deadline, now);
    sent.push(await notify({
      userId,
      type:  NotificationEvent.DEADLINE_RISK,
      title: 'Campaign deadline approaching',
      body:  unfunded
        ? `"${title}" is due ${when}, but ${creator} can't start until you fund the collaboration.`
        : `"${title}" for ${biz} is due ${when}, but you haven't confirmed yet. Tap "Let's Start Work" to begin.`,
      refId: r.campaignId, refType: 'campaign', applicationId: r.id, campaignId: r.campaignId,
      dedupeKey: engagementKey(r.id, NotificationEvent.DEADLINE_RISK, `${unfunded ? 'business' : 'creator'}:${r.campaign.deadline.getTime()}`),
    }));
  }
  return count(sent);
}

// ── B2: grouped "N creators applied" push ────────────────────────────────────
// The apply flow pushes only the first application per campaign per window
// (applicationPushKey). Once a window has closed, any campaign that collected
// more than one application in it gets a single summary push — no extra bell
// row, since each application already has its own. Looks back over the last
// hour of closed windows so a slow or skipped sweep still catches up.
export async function sendGroupedApplicationPushes(now: Date): Promise<number> {
  const { applicationPushWindowMinutes: minutes } = await getReminderTimings();
  if (minutes <= 0) return 0;
  const current = applicationPushWindow(now, minutes);
  const lookbackStart = new Date(current.start.getTime() - 60 * 60_000);

  const groups = await prisma.notification.groupBy({
    by:    ['userId', 'refId', 'refType'],
    where: { type: NotificationEvent.NEW_APPLICATION, refId: { not: null }, createdAt: { gte: lookbackStart, lt: current.start } },
    _count: { _all: true },
  });
  if (groups.length === 0) return 0;

  let sent = 0;
  for (const g of groups) {
    if (g._count._all < 2 || !g.refId) continue;
    // Re-count per closed window — the groupBy spans several.
    const rows = await prisma.notification.findMany({
      where:  { type: NotificationEvent.NEW_APPLICATION, userId: g.userId, refId: g.refId, createdAt: { gte: lookbackStart, lt: current.start } },
      select: { createdAt: true },
    });
    const perWindow = new Map<number, number>();
    for (const r of rows) {
      const idx = applicationPushWindow(r.createdAt, minutes).index;
      perWindow.set(idx, (perWindow.get(idx) ?? 0) + 1);
    }
    for (const [idx, n] of perWindow) {
      if (n < 2) continue;
      const claimed = await prisma.notificationDelivery
        .create({ data: { dedupeKey: `${applicationPushKey(g.refId, idx)}:summary`, userId: g.userId, type: NotificationEvent.APPLICATIONS_PENDING_REVIEW, campaignId: g.refId, pushSentAt: now } })
        .then(() => true)
        .catch(() => false);
      if (!claimed) continue;
      const campaign = await prisma.campaign.findUnique({ where: { id: g.refId }, select: { title: true } });
      const isEvent = g.refType === 'event';
      await sendExpoPush(
        g.userId,
        isEvent ? `${n} creators want to join` : `${n} creators applied`,
        isEvent
          ? `${n} creators requested to join "${campaign?.title ?? 'your event'}". Review their requests.`
          : `${n} creators applied to "${campaign?.title ?? 'your campaign'}". Review applications and select your creators.`,
        0,
        // Routed like a single application tap (business → that campaign's proposals).
        { type: NotificationEvent.NEW_APPLICATION, refId: g.refId, ...(g.refType ? { refType: g.refType } : {}) },
      );
      sent += 1;
    }
  }
  return sent;
}

let running = false;

export async function runCollaborationReminders(now = new Date()): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  if (!(await getReminderTimings()).enabled) return results;
  const step = async (name: string, fn: (now: Date) => Promise<number>) => {
    try {
      results[name] = await fn(now);
    } catch (err) {
      reportError(err, { event: LogEvent.REMINDER_SWEEP_STEP_FAILED, sweep: `reminders.${name}` });
    }
  };
  await step('paymentPending',      remindPaymentPending);
  await step('confirmationPending', remindConfirmationPending);
  await step('deliverableDue',      remindDeliverableDue);
  await step('deliverableDueSoon',  remindDeliverableDueSoon);
  await step('inactive',            remindInactive);
  await step('reviewPending',       remindReviewPending);
  await step('responsePending',     remindResponsePending);
  await step('deadlineRisk',        remindDeadlineRisk);
  await step('groupedApplications', sendGroupedApplicationPushes);
  if (Object.values(results).some((n) => n > 0)) logger.info({ results }, 'Collaboration reminders sent');
  return results;
}

export function startCollaborationRemindersJob(): void {
  // Every 5 minutes, offset from the escrow sweep (*/5) so they don't contend.
  cron.schedule('2-59/5 * * * *', () => {
    if (running) return;
    running = true;
    runCollaborationReminders()
      .catch((err) => reportError(err, { event: LogEvent.REMINDER_SWEEP_STEP_FAILED, sweep: 'reminders.top_level' }))
      .finally(() => { running = false; });
  });
}
