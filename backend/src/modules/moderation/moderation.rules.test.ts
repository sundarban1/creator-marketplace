import { describe, it, expect } from 'vitest';
import {
  canDismiss, canRequestMoreInfo, canResolve, canStartReview, canTakeAction, canVerify,
  isContentRemovable, priorityForReason,
} from './moderation.rules';
import { suspensionActive } from './suspension';
import { ageOn } from '../legal/terms.service';
import { screenChatMessage, screenTextLocal, enforceScreen } from '../../moderation/contentScreening';

describe('report workflow rules', () => {
  it('only starts review from pending / needs-more-info', () => {
    expect(canStartReview('NEW').ok).toBe(true);
    expect(canStartReview('NEEDS_MORE_INFO').ok).toBe(true);
    expect(canStartReview('UNDER_REVIEW').ok).toBe(false);
    expect(canStartReview('RESOLVED').ok).toBe(false);
  });

  it('verifies only open reports', () => {
    expect(canVerify('NEW').ok).toBe(true);
    expect(canVerify('UNDER_REVIEW').ok).toBe(true);
    expect(canVerify('DISMISSED').ok).toBe(false);
    expect(canVerify('RESOLVED').ok).toBe(false);
    expect(canRequestMoreInfo('UNDER_REVIEW').ok).toBe(true);
    expect(canRequestMoreInfo('ACTION_TAKEN').ok).toBe(false);
  });

  it('never enforces on an unverified or invalid report', () => {
    expect(canTakeAction('NEW', 'UNVERIFIED').ok).toBe(false);
    expect(canTakeAction('UNDER_REVIEW', 'INVALID').ok).toBe(false);
    expect(canTakeAction('UNDER_REVIEW', 'NEEDS_MORE_INFORMATION').ok).toBe(false);
    expect(canTakeAction('UNDER_REVIEW', 'VALID').ok).toBe(true);
    // A second action on an already-actioned report is allowed.
    expect(canTakeAction('ACTION_TAKEN', 'VALID').ok).toBe(true);
    expect(canTakeAction('RESOLVED', 'VALID').ok).toBe(false);
  });

  it('dismisses only after an INVALID decision', () => {
    expect(canDismiss('UNDER_REVIEW', 'UNVERIFIED').ok).toBe(false);
    expect(canDismiss('UNDER_REVIEW', 'VALID').ok).toBe(false);
    expect(canDismiss('UNDER_REVIEW', 'INVALID').ok).toBe(true);
    expect(canDismiss('ACTION_TAKEN', 'INVALID').ok).toBe(false);
  });

  it('resolves only with a recorded decision AND outcome', () => {
    expect(canResolve('NEW', 'UNVERIFIED').ok).toBe(false);
    expect(canResolve('UNDER_REVIEW', 'VALID').ok).toBe(false); // decision but no action
    expect(canResolve('ACTION_TAKEN', 'VALID').ok).toBe(true);
    expect(canResolve('DISMISSED', 'INVALID').ok).toBe(true);
    expect(canResolve('RESOLVED', 'VALID').ok).toBe(false);
  });

  it('prioritises threats / exploitation / age-rating reports as urgent', () => {
    expect(priorityForReason('VIOLENCE')).toBe('URGENT');
    expect(priorityForReason('EXPLOITATION')).toBe('URGENT');
    expect(priorityForReason('AGE_INAPPROPRIATE')).toBe('URGENT');
    expect(priorityForReason('HATE_SPEECH')).toBe('HIGH');
    expect(priorityForReason('SPAM')).toBe('LOW');
    expect(priorityForReason('OTHER')).toBe('NORMAL');
  });

  it('knows which targets have removable content', () => {
    expect(isContentRemovable('PORTFOLIO_ITEM')).toBe(true);
    expect(isContentRemovable('MESSAGE')).toBe(true);
    expect(isContentRemovable('USER')).toBe(false);
  });
});

describe('suspension + age helpers', () => {
  const now = new Date('2026-11-15T12:00:00Z');
  it('temporary suspension lapses at suspendedUntil; permanent never does', () => {
    expect(suspensionActive({ suspendedAt: null }, now)).toBe(false);
    expect(suspensionActive({ suspendedAt: now, suspendedUntil: null }, now)).toBe(true);
    expect(suspensionActive({ suspendedAt: now, suspendedUntil: new Date('2026-11-20T00:00:00Z') }, now)).toBe(true);
    expect(suspensionActive({ suspendedAt: now, suspendedUntil: new Date('2026-11-14T00:00:00Z') }, now)).toBe(false);
  });
  it('computes age by birthday, not year', () => {
    expect(ageOn(new Date('2008-11-15T00:00:00Z'), now)).toBe(18);
    expect(ageOn(new Date('2008-11-16T00:00:00Z'), now)).toBe(17);
  });
});

describe('content screening (local layer)', () => {
  it('approves ordinary multilingual text', () => {
    expect(screenTextLocal({ bio: 'Food creator from Pokhara. मिठो खाना!' }, 'bio').outcome).toBe('APPROVED');
  });
  it('rejects severe terms, including obfuscated ones', () => {
    expect(screenTextLocal({ title: 'Win big', description: 'you whore' }, 'event').outcome).toBe('REJECTED');
    expect(screenTextLocal({ description: 'w.h.o.r.e' }, 'event').field).toBe('description');
  });
  it('lets ordinary swearing through in private chat but blocks sexual slurs', () => {
    expect(screenChatMessage('that shoot was fucking great').outcome).toBe('APPROVED');
    expect(screenChatMessage('you are a slut').outcome).toBe('REJECTED');
  });
  it('enforceScreen refuses ungated pending content but allows gated', () => {
    expect(() => enforceScreen({ outcome: 'REJECTED' })).toThrow();
    expect(() => enforceScreen({ outcome: 'PENDING_REVIEW', source: 'ai' })).toThrow();
    expect(() => enforceScreen({ outcome: 'PENDING_REVIEW', source: 'ai' }, { gated: true })).not.toThrow();
    expect(() => enforceScreen({ outcome: 'APPROVED' })).not.toThrow();
  });
});
