/**
 * Creator-facing meetup endpoints. Same backend contract the admin dashboard's
 * Creator Meetups pages use — do not diverge.
 */

import { apiRequest } from '../lib/apiClient';

export type MeetupCreatorType =
  | 'CONTENT_CREATOR'
  | 'UGC_CREATOR'
  | 'INFLUENCER'
  | 'YOUTUBER'
  | 'SOCIAL_MEDIA_CREATOR'
  | 'BLOGGER_WRITER'
  | 'PHOTOGRAPHER_VIDEOGRAPHER'
  | 'OTHER';

export interface Meetup {
  id: string;
  title: string;
  slug: string;
  city: string;
  district: string | null;
  province: string | null;
  country: string;
  description: string | null;
  registrationStatus: 'DRAFT' | 'OPEN' | 'CLOSED';
  registrationStartsAt: string | null;
  registrationEndsAt: string | null;
  eventDate: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  capacity: number | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface MeetupRegistration {
  id: string;
  meetupId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  creatorTypes: MeetupCreatorType[];
  otherCreatorType: string | null;
  socialMediaProfile: string | null;
  attendancePreference: 'YES' | 'NOT_SURE';
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface MyMeetupRegistration extends MeetupRegistration {
  meetup: Meetup;
}

export interface RegisterForMeetupInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  creatorTypes: MeetupCreatorType[];
  otherCreatorType?: string;
  socialMediaProfile?: string;
  attendancePreference: 'YES' | 'NOT_SURE';
  message?: string;
}

export function fetchOpenMeetups(signal?: AbortSignal): Promise<Meetup[]> {
  return apiRequest<Meetup[]>('GET', '/api/meetups', undefined, { signal }).then((r) => r.data);
}

export function fetchMeetup(idOrSlug: string, signal?: AbortSignal): Promise<Meetup> {
  return apiRequest<Meetup>('GET', `/api/meetups/${idOrSlug}`, undefined, { signal }).then((r) => r.data);
}

export function fetchMyMeetupRegistrations(signal?: AbortSignal): Promise<MyMeetupRegistration[]> {
  return apiRequest<MyMeetupRegistration[]>('GET', '/api/meetups/my-registrations', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function registerForMeetup(meetupId: string, input: RegisterForMeetupInput): Promise<MeetupRegistration> {
  return apiRequest<MeetupRegistration>('POST', `/api/meetups/${meetupId}/register`, input).then((r) => r.data);
}
