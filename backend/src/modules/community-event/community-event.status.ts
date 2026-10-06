import type { CommunityEventStatus } from '@prisma/client';
import { endOfLocalDay } from './community-event.time';

export type CommunityEventSection = 'upcoming' | 'past' | 'cancelled';

interface StatusInput {
  startDateTime: Date;
  endDateTime: Date | null;
  timezone: string;
  statusOverride: CommunityEventStatus | null;
}

/**
 * The status the public site shows. An admin override wins; otherwise it is
 * derived from the dates so an event moves Upcoming → Ongoing → Completed on
 * its own. An event with no end time ("1:00 PM onwards") stays ongoing until
 * the end of its start day in the event's timezone.
 */
export function effectiveStatus(event: StatusInput, now: Date = new Date()): CommunityEventStatus {
  if (event.statusOverride) return event.statusOverride;
  if (now < event.startDateTime) return 'UPCOMING';
  const end = event.endDateTime ?? endOfLocalDay(event.startDateTime, event.timezone);
  return now <= end ? 'ONGOING' : 'COMPLETED';
}

/** Which public list an event belongs in. Cancelled events are listed in neither. */
export function sectionFor(status: CommunityEventStatus): CommunityEventSection {
  if (status === 'CANCELLED') return 'cancelled';
  return status === 'COMPLETED' ? 'past' : 'upcoming';
}
