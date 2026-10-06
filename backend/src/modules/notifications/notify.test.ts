import { describe, it, expect } from 'vitest';
import { collaborationWebPath, engagementKey } from './notify';

describe('collaborationWebPath', () => {
  it('sends creators to their work page for the campaign', () => {
    expect(collaborationWebPath('CREATOR', 'deliverable_due_24h', 'c1')).toBe('/creator/work/c1');
  });
  it('sends businesses to deliverables for review-type events, else the event page', () => {
    expect(collaborationWebPath('BUSINESS', 'review_reminder', 'c1')).toBe('/business/deliverables?campaign=c1');
    expect(collaborationWebPath('BUSINESS', 'revision_submitted', 'c1')).toBe('/business/deliverables?campaign=c1');
    expect(collaborationWebPath('BUSINESS', 'payment_pending', 'c1')).toBe('/business/events/c1');
  });
});

describe('engagementKey', () => {
  it('builds a stable per-engagement key', () => {
    expect(engagementKey('a1', 'deliverable_due_3h')).toBe('app:a1:deliverable_due_3h');
    expect(engagementKey('a1', 'review_reminder', '2')).toBe('app:a1:review_reminder:2');
  });
});
