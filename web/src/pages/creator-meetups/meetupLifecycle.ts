import type { ApiMeetup } from '../../lib/api';

/**
 * The single admin-facing status, layered over the two stored fields:
 *  - Active  → registration OPEN, meetup UPCOMING/ACTIVE (shown to creators, can register)
 *  - Paused  → registration CLOSED, meetup UPCOMING/ACTIVE (hidden from creator home,
 *              registering blocked; already-registered creators still see theirs)
 *  - Closed  → meetup COMPLETED/CANCELLED (hidden from creators entirely)
 *  - Draft   → registration DRAFT (never published yet)
 */
export type MeetupLifecycle = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

export const LIFECYCLE_LABELS: Record<MeetupLifecycle, string> = {
  DRAFT:  'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
};

type StatusFields = Pick<ApiMeetup, 'registrationStatus' | 'status'>;

export function lifecycleOf(m: StatusFields): MeetupLifecycle {
  if (m.status === 'COMPLETED' || m.status === 'CANCELLED') return 'CLOSED';
  if (m.registrationStatus === 'OPEN') return 'ACTIVE';
  if (m.registrationStatus === 'CLOSED') return 'PAUSED';
  return 'DRAFT';
}

/** Stored fields for a lifecycle choice. `current` keeps UPCOMING vs ACTIVE when reopening. */
export function fieldsForLifecycle(lifecycle: MeetupLifecycle, current?: StatusFields): StatusFields {
  const liveStatus = current?.status === 'ACTIVE' ? 'ACTIVE' : 'UPCOMING';
  switch (lifecycle) {
    case 'ACTIVE': return { registrationStatus: 'OPEN', status: liveStatus };
    case 'PAUSED': return { registrationStatus: 'CLOSED', status: liveStatus };
    case 'CLOSED': return { registrationStatus: 'CLOSED', status: 'COMPLETED' };
    case 'DRAFT':  return { registrationStatus: 'DRAFT', status: liveStatus };
  }
}
