import { describe, it, expect } from 'vitest';
import { toApplicationDto } from './campaign.dto';

// Minimal RawApplication-shaped fixture; toApplicationDto is a pure mapper.
function raw(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    campaignId: 'c1',
    coverLetter: '',
    proposedRate: 2000,
    timeline: '',
    socialHandles: {},
    portfolioUrl: null,
    status: 'ACCEPTED',
    workStatus: 'NONE',
    workNote: null,
    revisionRequestedAt: null,
    submittedAt: null,
    deliverableUrls: null,
    paymentStatus: 'UNPAID',
    createdAt: new Date('2026-09-04T00:00:00Z'),
    ...over,
  } as Parameters<typeof toApplicationDto>[0];
}

describe('toApplicationDto — escrow fields', () => {
  it('passes through a selected escrowStatus and derives the engagement state', () => {
    const dto = toApplicationDto(raw({ escrowStatus: 'HELD', workStatus: 'SUBMITTED', campaign: { title: 'X', campaignType: 'PAID_CAMPAIGN' } }));
    expect(dto.escrowStatus).toBe('HELD');
    expect(dto.engagementState).toBe('BUSINESS_REVIEW');
  });

  it('falls back to a paymentStatus-derived escrowStatus when the column is absent', () => {
    expect(toApplicationDto(raw({ paymentStatus: 'PAID' })).escrowStatus).toBe('HELD');
    expect(toApplicationDto(raw({ paymentStatus: 'PAID', workStatus: 'DISPUTED' })).escrowStatus).toBe('FROZEN');
    expect(toApplicationDto(raw({ paymentStatus: 'RELEASED' })).escrowStatus).toBe('RELEASED');
    expect(toApplicationDto(raw({ paymentStatus: 'REFUNDED' })).escrowStatus).toBe('REFUNDED');
    expect(toApplicationDto(raw()).escrowStatus).toBe('NOT_FUNDED');
  });

  it('serialises the stage deadlines to ISO or null', () => {
    const due = new Date('2026-09-05T10:00:00Z');
    const dto = toApplicationDto(raw({ paymentDueAt: due, contentDeadline: null, submittedLate: true }));
    expect(dto.paymentDueAt).toBe('2026-09-05T10:00:00.000Z');
    expect(dto.contentDeadline).toBeNull();
    expect(dto.submittedLate).toBe(true);
  });

  it('includes the dispute block only when present', () => {
    expect(toApplicationDto(raw()).dispute).toBeUndefined();
    const dto = toApplicationDto(raw({
      dispute: { status: 'OPEN', reason: 'bad', raisedByRole: 'CREATOR', resolution: null, resolutionNote: null, createdAt: new Date('2026-09-04T00:00:00Z'), resolvedAt: null },
    }));
    expect(dto.dispute).toMatchObject({ status: 'OPEN', raisedByRole: 'CREATOR' });
  });

  it('maps submission versions immutably', () => {
    const dto = toApplicationDto(raw({
      submissionVersions: [
        { version: 1, note: 'v1', urls: null, videos: [], files: [], late: false, reviewOutcome: 'REVISION_REQUESTED', reviewNote: 'fix', reviewedAt: new Date('2026-09-04T01:00:00Z'), createdAt: new Date('2026-09-04T00:30:00Z') },
        { version: 2, note: 'v2', urls: 'http://x', videos: [], files: [], late: true, reviewOutcome: null, reviewNote: null, reviewedAt: null, createdAt: new Date('2026-09-04T02:00:00Z') },
      ],
    }));
    expect(dto.submissionVersions).toHaveLength(2);
    expect(dto.submissionVersions![0]).toMatchObject({ version: 1, reviewOutcome: 'REVISION_REQUESTED' });
    expect(dto.submissionVersions![1]).toMatchObject({ version: 2, late: true, reviewOutcome: null });
  });
});
