import { describe, it, expect } from 'vitest';
import {
  canDecide, canResubmit, isCreatorVisible, materialChanges, normalizeFeedback, DECISION_TARGET,
} from './campaign-review.rules';
import { eventChangesRequestedEmail, eventRejectedEmail, eventApprovedEmail, eventSubmittedAdminEmail } from '../../utils/email/eventReview';

describe('event review transitions', () => {
  it('only PENDING_APPROVAL can be decided', () => {
    expect(canDecide('PENDING_APPROVAL')).toBe(true);
    for (const s of ['DRAFT', 'ACTIVE', 'CHANGES_REQUESTED', 'REJECTED', 'PAUSED', 'CLOSED']) expect(canDecide(s)).toBe(false);
  });

  it('maps decisions to statuses', () => {
    expect(DECISION_TARGET).toEqual({ APPROVE: 'ACTIVE', REQUEST_CHANGES: 'CHANGES_REQUESTED', REJECT: 'REJECTED' });
  });

  it('resubmit: changes-requested always, rejected only when allowed', () => {
    expect(canResubmit('CHANGES_REQUESTED', false)).toBe(true);
    expect(canResubmit('REJECTED', true)).toBe(true);
    expect(canResubmit('REJECTED', false)).toBe(false);
    expect(canResubmit('PENDING_APPROVAL', true)).toBe(false);
    expect(canResubmit('ACTIVE', true)).toBe(false);
  });

  it('creators only ever see approved lifecycle statuses', () => {
    expect(['ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].every(isCreatorVisible)).toBe(true);
    expect(['DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'REJECTED', 'CANCELLED'].some(isCreatorVisible)).toBe(false);
  });
});

describe('normalizeFeedback', () => {
  it('rejects empty, whitespace-only and too-short text', () => {
    expect(normalizeFeedback(undefined)).toBeNull();
    expect(normalizeFeedback('')).toBeNull();
    expect(normalizeFeedback('    \n\t  ')).toBeNull();
    expect(normalizeFeedback('too short')).toBeNull();
    expect(normalizeFeedback(42)).toBeNull();
  });
  it('trims and keeps line breaks', () => {
    expect(normalizeFeedback('  Please clarify deliverables.\r\nAlso drinks?  ')).toBe('Please clarify deliverables.\nAlso drinks?');
  });
});

describe('materialChanges', () => {
  const before = {
    title: 'Cafe launch', description: 'Come shoot our new menu', budgetMin: 2000, budgetMax: 2000,
    deadline: new Date('2026-11-01T00:00:00.000Z'), platforms: ['Instagram'], hashtags: ['a'],
    locations: [{ name: 'Itahari', lat: 26.6 }], isFeatured: false,
  };

  it('ignores fields the client resent unchanged (full-form saves)', () => {
    expect(materialChanges(before, {
      title: 'Cafe launch', budgetMin: 2000, deadline: '2026-11-01T00:00:00.000Z', platforms: ['Instagram'],
      locations: [{ lat: 26.6, name: 'Itahari' }],
    })).toEqual([]);
  });

  it('flags compensation, deliverable, date and eligibility changes', () => {
    expect(materialChanges(before, { budgetMax: 5000, deadline: '2026-12-01T00:00:00.000Z', minFollowers: 1000 }))
      .toEqual(['budgetMax', 'minFollowers', 'deadline']);
  });

  it('treats pause/feature/hashtag edits as harmless', () => {
    expect(materialChanges(before, { isFeatured: true, hashtags: ['b'], status: 'PAUSED', eventStatus: 'FULL' })).toEqual([]);
  });
});

describe('event review emails', () => {
  it('includes the admin feedback verbatim but escaped', () => {
    const e = eventChangesRequestedEmail({
      businessName: 'Cafe <Co>', eventTitle: 'Launch', feedback: 'Clarify deliverables.\n<script>x</script>', dashboardUrl: 'https://x/business/events/1',
    });
    expect(e.subject).toBe('Action Required: Please Update Your Kolab Event');
    expect(e.html).toContain('Clarify deliverables.<br>&lt;script&gt;x&lt;/script&gt;');
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('Cafe &lt;Co&gt;');
  });

  it('rejection email carries the reason and the right next step', () => {
    const allowed = eventRejectedEmail({ businessName: 'B', eventTitle: 'T', reason: 'Prohibited product promotion', resubmissionAllowed: true, dashboardUrl: 'u' });
    const final = eventRejectedEmail({ businessName: 'B', eventTitle: 'T', reason: 'Prohibited product promotion', resubmissionAllowed: false, dashboardUrl: 'u' });
    expect(allowed.subject).toBe('Update Regarding Your Kolab Event');
    expect(allowed.html).toContain('Prohibited product promotion');
    expect(allowed.html).toContain('edit and resubmit');
    expect(final.html).toContain('Resubmission is not available');
  });

  it('approval and admin-submission subjects', () => {
    expect(eventApprovedEmail({ businessName: 'B', eventTitle: 'T', dashboardUrl: 'u' }).subject).toBe('Your Kolab Event Has Been Approved');
    expect(eventSubmittedAdminEmail({ eventTitle: 'Launch', businessName: 'B', eventType: 'Paid Event', resubmission: false, reviewUrl: 'u' }).subject)
      .toBe('New Event Awaiting Review — Launch');
  });
});
