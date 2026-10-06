import { describe, it, expect } from 'vitest';
import { effectiveStatus, sectionFor } from './community-event.status';
import { zonedToUtc, utcToZoned, endOfLocalDay } from './community-event.time';

const TZ = 'Asia/Kathmandu';

describe('community event time helpers', () => {
  it('converts Kathmandu wall-clock (+05:45) to UTC and back', () => {
    const start = zonedToUtc('2026-10-04', '13:00', TZ);
    expect(start.toISOString()).toBe('2026-10-04T07:15:00.000Z');
    expect(utcToZoned(start, TZ)).toEqual({ date: '2026-10-04', time: '13:00' });
  });

  it('end of local day is 23:59:59.999 local', () => {
    const start = zonedToUtc('2026-10-04', '13:00', TZ);
    expect(endOfLocalDay(start, TZ).toISOString()).toBe('2026-10-04T18:14:59.999Z');
  });

  it('handles a DST zone', () => {
    const t = zonedToUtc('2026-07-01', '09:00', 'America/New_York');
    expect(t.toISOString()).toBe('2026-07-01T13:00:00.000Z');
  });
});

describe('effectiveStatus', () => {
  const event = {
    startDateTime: zonedToUtc('2026-10-04', '13:00', TZ),
    endDateTime: null,
    timezone: TZ,
    statusOverride: null,
  };

  it('is UPCOMING before start, ONGOING during the start day, COMPLETED after', () => {
    expect(effectiveStatus(event, new Date('2026-10-03T00:00:00Z'))).toBe('UPCOMING');
    expect(effectiveStatus(event, new Date('2026-10-04T10:00:00Z'))).toBe('ONGOING');
    expect(effectiveStatus(event, new Date('2026-10-05T00:00:00Z'))).toBe('COMPLETED');
  });

  it('uses an explicit end time when present', () => {
    const withEnd = { ...event, endDateTime: zonedToUtc('2026-10-04', '17:00', TZ) };
    expect(effectiveStatus(withEnd, new Date('2026-10-04T11:30:00Z'))).toBe('COMPLETED');
  });

  it('an override wins over the dates', () => {
    expect(effectiveStatus({ ...event, statusOverride: 'CANCELLED' }, new Date('2026-10-01T00:00:00Z'))).toBe('CANCELLED');
    expect(sectionFor('CANCELLED')).toBe('cancelled');
    expect(sectionFor('ONGOING')).toBe('upcoming');
    expect(sectionFor('COMPLETED')).toBe('past');
  });
});
