import { notify, CompetitionNotificationEvent as E, type CompetitionNotificationType } from '../notifications/notify';
import { env, frontendBaseUrl } from '../../config/env';
import { logger } from '../../config/logger';
import { sendActionEmail, type ActionEmail } from '../../utils/email/collaborationReminder';
import { DEFAULT_SUPPORT_EMAIL } from '../../utils/email/core';
import { notificationService } from '../notifications/notification.service';

// Who gets told what, in plain words. Every call goes through the shared
// notify() dispatcher (bell + socket + push, email where noted, dedupe ledger).
// Nothing here is ever called with an UNPUBLISHED decision — the service only
// notifies after the publishing transaction commits.

const ktm = (d: Date) =>
  d.toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' (Nepal time)';

export const creatorCompetitionUrl = (id: string) => `${frontendBaseUrl}/creator/competitions/${encodeURIComponent(id)}`;
export const organizerCompetitionUrl = (id: string) => `${frontendBaseUrl}/business/competitions/${encodeURIComponent(id)}`;
export const adminCompetitionUrl = (id: string) => `${frontendBaseUrl}/admin/competitions/${encodeURIComponent(id)}`;

function adminEmails(): string[] {
  return (env.ADMIN_EMAIL ?? DEFAULT_SUPPORT_EMAIL).split(',').map((e) => e.trim()).filter(Boolean);
}

interface Send {
  userId: string;
  type: CompetitionNotificationType;
  title: string;
  body: string;
  competitionId: string;
  dedupeKey?: string;
  pushThrottleKey?: string;
  email?: ActionEmail;
}

function send(s: Send) {
  return notify({
    userId: s.userId, type: s.type, title: s.title, body: s.body,
    refId: s.competitionId, refType: 'competition',
    dedupeKey: s.dedupeKey, pushThrottleKey: s.pushThrottleKey, email: s.email,
  });
}

/** Sends to many recipients in small batches so a 1,000-creator stage doesn't open 1,000 connections at once. */
async function fanOut<T>(items: T[], fn: (item: T) => Promise<unknown>, batch = 20): Promise<void> {
  for (let i = 0; i < items.length; i += batch) {
    await Promise.all(items.slice(i, i + batch).map(fn));
  }
}

const HOUR = 3_600_000;
const window = (now: Date) => Math.floor(now.getTime() / HOUR);

export const competitionNotifications = {
  joined(userId: string, c: { id: string; title: string }) {
    return send({
      userId, type: E.JOINED, competitionId: c.id,
      title: 'You’re in!', body: `You joined ${c.title}. We’ll let you know when submissions open.`,
      dedupeKey: `comp:${c.id}:joined:${userId}`,
    });
  },

  /** Grouped: at most one bell row per competition per hour, however many creators join. */
  newParticipant(organizerUserId: string, c: { id: string; title: string }, now = new Date()) {
    return send({
      userId: organizerUserId, type: E.NEW_PARTICIPANTS, competitionId: c.id,
      title: 'New participants', body: `Creators are joining ${c.title}.`,
      dedupeKey: `comp:${c.id}:new_participants:${window(now)}`,
    });
  },

  submissionReceived(userId: string, c: { id: string; title: string }, stage: { id: string; name: string }, version: number) {
    return send({
      userId, type: E.SUBMISSION_RECEIVED, competitionId: c.id,
      title: version > 1 ? 'Submission updated' : 'Submission received',
      body: `Your ${stage.name} entry for ${c.title} was ${version > 1 ? 'updated' : 'received'}.`,
      dedupeKey: `comp-stage:${stage.id}:received:${userId}:v${version}`,
    });
  },

  newSubmission(organizerUserId: string, c: { id: string; title: string }, stage: { id: string; name: string }, now = new Date()) {
    return send({
      userId: organizerUserId, type: E.NEW_SUBMISSIONS, competitionId: c.id,
      title: 'New submissions', body: `New ${stage.name} entries are arriving for ${c.title}.`,
      dedupeKey: `comp-stage:${stage.id}:new_submissions:${window(now)}`,
    });
  },

  async stageOpened(userIds: string[], c: { id: string; title: string }, stage: { id: string; name: string; deadline: Date }) {
    await fanOut(userIds, (userId) => send({
      userId, type: E.STAGE_OPENED, competitionId: c.id,
      title: `${stage.name} is open`, body: `Submit your entry for ${c.title} by ${ktm(stage.deadline)}.`,
      dedupeKey: `comp-stage:${stage.id}:opened:${userId}:${stage.deadline.toISOString()}`,
    }));
  },

  async deadlineChanged(userIds: string[], c: { id: string; title: string }, label: string, deadline: Date, key: string) {
    await fanOut(userIds, (userId) => send({
      userId, type: E.DEADLINE_CHANGED, competitionId: c.id,
      title: 'Deadline changed', body: `${c.title}: ${label} is now ${ktm(deadline)}.`,
      dedupeKey: `comp:${c.id}:deadline:${key}:${deadline.toISOString()}:${userId}`,
    }));
  },

  async deadlineReminder(userIds: string[], c: { id: string; title: string }, stage: { id: string; name: string; deadline: Date }) {
    await fanOut(userIds, (userId) => send({
      userId, type: E.DEADLINE_REMINDER, competitionId: c.id,
      title: 'Deadline in 24 hours', body: `You haven’t submitted your ${stage.name} entry for ${c.title}. Deadline: ${ktm(stage.deadline)}.`,
      dedupeKey: `comp-stage:${stage.id}:due24h:${userId}:${stage.deadline.toISOString()}`,
    }));
  },

  organizerDeadline(organizerUserId: string, c: { id: string; title: string }, stage: { id: string; name: string; deadline: Date }, submitted: number) {
    return send({
      userId: organizerUserId, type: E.ORGANIZER_DEADLINE, competitionId: c.id,
      title: `${stage.name} closes soon`, body: `${submitted} submission${submitted === 1 ? '' : 's'} so far for ${c.title}. Submissions close ${ktm(stage.deadline)}.`,
      dedupeKey: `comp-stage:${stage.id}:org_due24h:${stage.deadline.toISOString()}`,
    });
  },

  readyForReview(organizerUserId: string, c: { id: string; title: string }, stage: { id: string; name: string; deadline: Date }) {
    return send({
      userId: organizerUserId, type: E.READY_FOR_REVIEW, competitionId: c.id,
      title: `${stage.name} is ready for review`, body: `Submissions for ${c.title} have closed. Review entries and publish who advances.`,
      dedupeKey: `comp-stage:${stage.id}:review:${stage.deadline.toISOString()}`,
      email: {
        subject: `${stage.name} is ready for review — ${c.title}`,
        heading: `${stage.name} submissions have closed`,
        paragraphs: [`Submissions for ${c.title} have closed. Review the entries and publish your selection when you're ready — creators aren't told anything until you publish.`],
        cta: { label: 'Review submissions', url: organizerCompetitionUrl(c.id) },
      },
    });
  },

  needsAttention(organizerUserId: string, c: { id: string; title: string }, stage: { id: string; name: string; deadline: Date }) {
    return send({
      userId: organizerUserId, type: E.NEEDS_ATTENTION, competitionId: c.id,
      title: `${stage.name} needs a new deadline`, body: `${stage.name} of ${c.title} is due to open but its deadline has already passed. Extend the deadline to open it.`,
      dedupeKey: `comp-stage:${stage.id}:needs_attention:${stage.deadline.toISOString()}`,
    });
  },

  async stageResults(advanced: string[], notSelected: string[], c: { id: string; title: string }, stage: { id: string; name: string }, isNextFinal: boolean) {
    // Both groups in parallel — the advanced group also gets an email, which
    // must not delay the not-selected creators' notice.
    const advancedSends = fanOut(advanced, (userId) => send({
      userId, type: E.ADVANCED, competitionId: c.id,
      title: isNextFinal ? 'You’re a finalist!' : 'You advanced!',
      body: `Congratulations — you made it through ${stage.name} of ${c.title}.`,
      dedupeKey: `comp-stage:${stage.id}:result:${userId}`,
      email: {
        subject: `You advanced in ${c.title}`,
        heading: isNextFinal ? 'You’re a finalist!' : 'You advanced to the next stage',
        paragraphs: [`Congratulations — you made it through ${stage.name} of ${c.title}. Check the next stage's brief and deadline.`],
        cta: { label: 'View my progress', url: creatorCompetitionUrl(c.id) },
      },
    }));
    const notSelectedSends = fanOut(notSelected, (userId) => send({
      userId, type: E.NOT_SELECTED, competitionId: c.id,
      title: 'Stage results are out', body: `You weren’t selected to advance past ${stage.name} of ${c.title}. Thank you for taking part.`,
      dedupeKey: `comp-stage:${stage.id}:result:${userId}`,
    }));
    await Promise.all([advancedSends, notSelectedSends]);
  },

  async resultsPublished(userIds: string[], c: { id: string; title: string }, publishedAt: Date) {
    await fanOut(userIds, (userId) => send({
      userId, type: E.RESULTS_PUBLISHED, competitionId: c.id,
      title: 'Final results are out', body: `The winners of ${c.title} have been announced.`,
      dedupeKey: `comp:${c.id}:final:${publishedAt.toISOString()}:${userId}`,
    }));
  },

  async resultsReopened(userIds: string[], c: { id: string; title: string }, at: Date) {
    await fanOut(userIds, (userId) => send({
      userId, type: E.RESULTS_REOPENED, competitionId: c.id,
      title: 'Results under revision', body: `The organizer of ${c.title} is revising the final results.`,
      dedupeKey: `comp:${c.id}:reopened:${at.toISOString()}:${userId}`,
    }));
  },

  async statusChanged(userIds: string[], c: { id: string; title: string }, kind: 'PAUSED' | 'RESUMED' | 'CANCELLED', at: Date, reason?: string | null) {
    const copy = {
      PAUSED:    { type: E.PAUSED,    title: 'Competition paused',    body: `${c.title} is paused — joining and submissions are temporarily unavailable.` },
      RESUMED:   { type: E.RESUMED,   title: 'Competition resumed',   body: `${c.title} is running again.` },
      CANCELLED: { type: E.CANCELLED, title: 'Competition cancelled', body: `${c.title} was cancelled by the organizer.${reason ? ` Reason: ${reason}` : ''}` },
    }[kind];
    await fanOut(userIds, (userId) => send({
      userId, competitionId: c.id, ...copy,
      dedupeKey: `comp:${c.id}:${kind.toLowerCase()}:${at.toISOString()}:${userId}`,
    }));
  },

  async updated(userIds: string[], c: { id: string; title: string }, what: string, at: Date) {
    await fanOut(userIds, (userId) => send({
      userId, type: E.UPDATED, competitionId: c.id,
      title: 'Competition updated', body: `The organizer updated ${what} for ${c.title}.`,
      // One per minute per creator — rapid successive saves collapse.
      dedupeKey: `comp:${c.id}:updated:${Math.floor(at.getTime() / 60_000)}:${userId}`,
    }));
  },

  /** Admin bell (every admin) + email to ADMIN_EMAIL when something enters the review queue. */
  async adminReviewRequested(c: { id: string; title: string }, kind: 'launch' | 'edit') {
    const title = kind === 'launch' ? 'Competition awaiting review' : 'Competition changes awaiting review';
    const body = kind === 'launch'
      ? `“${c.title}” was submitted for review.`
      : `The organizer of “${c.title}” changed its rules, eligibility or prizes.`;
    await notificationService.createForAdmins({ type: 'competition_review_submitted', title, body, refId: c.id, refType: 'competition' });
    await Promise.all(adminEmails().map((to) => sendActionEmail(to, {
      subject: `${title}: ${c.title}`,
      heading: title,
      paragraphs: [body, 'Review it before it goes live to creators.'],
      cta: { label: 'Open review', url: adminCompetitionUrl(c.id) },
    }).catch((err) => logger.warn({ err }, 'competition: admin review email failed'))));
  },

  /** Organizer: the admin's decision on a launch review or a proposed edit. */
  reviewDecision(
    organizerUserId: string,
    c: { id: string; title: string },
    kind: 'APPROVED' | 'APPROVED_SCHEDULED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'EDIT_APPROVED' | 'EDIT_REJECTED',
    feedback: string | null,
    publishAt?: Date | null,
    allowResubmission = true,
  ) {
    const copy = {
      APPROVED:           { type: E.REVIEW_APPROVED, title: 'Competition approved', body: `“${c.title}” is approved and now live for creators.` },
      APPROVED_SCHEDULED: { type: E.REVIEW_APPROVED, title: 'Competition approved', body: `“${c.title}” is approved and will go live ${publishAt ? ktm(publishAt) : 'as scheduled'}.` },
      CHANGES_REQUESTED:  { type: E.REVIEW_CHANGES, title: 'Changes requested', body: `Kolab asked for changes to “${c.title}” before it can go live.` },
      REJECTED:           { type: E.REVIEW_REJECTED, title: 'Competition not approved', body: `“${c.title}” wasn’t approved.${allowResubmission ? ' You can update it and resubmit.' : ''}` },
      EDIT_APPROVED:      { type: E.EDIT_APPROVED, title: 'Changes approved', body: `Your changes to “${c.title}” are approved and now live. Participants have been told.` },
      EDIT_REJECTED:      { type: E.EDIT_REJECTED, title: 'Changes not approved', body: `Your changes to “${c.title}” weren’t approved. The previous version stays live.` },
    }[kind];
    return send({
      userId: organizerUserId, competitionId: c.id, ...copy,
      email: {
        subject: `${copy.title}: ${c.title}`,
        heading: copy.title,
        paragraphs: [copy.body],
        details: feedback ? [{ label: 'Feedback from Kolab', value: feedback }] : undefined,
        cta: { label: 'Open competition', url: organizerCompetitionUrl(c.id) },
      },
    });
  },

  suspended(organizerUserId: string, c: { id: string; title: string }, at: Date) {
    return send({
      userId: organizerUserId, type: E.SUSPENDED, competitionId: c.id,
      title: 'Competition suspended', body: `${c.title} was suspended by Kolab while a report is reviewed. Contact Kolab support for details.`,
      dedupeKey: `comp:${c.id}:suspended:${at.toISOString()}`,
    });
  },
};
