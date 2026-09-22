import { z } from 'zod';

const registrationPhase = z.enum(['DRAFT', 'OPEN', 'CLOSED']);
const meetupStatus = z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
const creatorType = z.enum([
  'CONTENT_CREATOR',
  'UGC_CREATOR',
  'INFLUENCER',
  'YOUTUBER',
  'SOCIAL_MEDIA_CREATOR',
  'BLOGGER_WRITER',
  'PHOTOGRAPHER_VIDEOGRAPHER',
  'OTHER',
]);
const attendancePreference = z.enum(['YES', 'NOT_SURE']);

export const createMeetupSchema = z.object({
  title:                z.string().trim().min(3).max(150),
  city:                 z.string().trim().min(1).max(100),
  district:             z.string().trim().max(100).optional(),
  province:             z.string().trim().max(100).optional(),
  country:              z.string().trim().max(100).default('Nepal'),
  description:          z.string().trim().max(2000).optional(),
  registrationStatus:   registrationPhase.default('DRAFT'),
  registrationStartsAt: z.coerce.date().optional(),
  registrationEndsAt:   z.coerce.date().optional(),
  eventDate:            z.coerce.date().optional(),
  eventStartTime:       z.string().trim().max(20).optional(),
  eventEndTime:         z.string().trim().max(20).optional(),
  venueName:            z.string().trim().max(200).optional(),
  venueAddress:         z.string().trim().max(300).optional(),
  capacity:             z.number().int().positive().optional(),
  status:               meetupStatus.default('UPCOMING'),
}).refine(
  (data) => !data.registrationStartsAt || !data.registrationEndsAt || data.registrationEndsAt > data.registrationStartsAt,
  { message: 'Registration end must be after registration start', path: ['registrationEndsAt'] },
);

export const updateMeetupSchema = z.object({
  title:                z.string().trim().min(3).max(150).optional(),
  city:                 z.string().trim().min(1).max(100).optional(),
  district:             z.string().trim().max(100).optional(),
  province:             z.string().trim().max(100).optional(),
  country:              z.string().trim().max(100).optional(),
  description:          z.string().trim().max(2000).optional(),
  registrationStatus:   registrationPhase.optional(),
  registrationStartsAt: z.coerce.date().optional(),
  registrationEndsAt:   z.coerce.date().optional(),
  eventDate:            z.coerce.date().nullable().optional(),
  eventStartTime:       z.string().trim().max(20).nullable().optional(),
  eventEndTime:         z.string().trim().max(20).nullable().optional(),
  venueName:            z.string().trim().max(200).nullable().optional(),
  venueAddress:         z.string().trim().max(300).nullable().optional(),
  capacity:             z.number().int().positive().nullable().optional(),
  status:               meetupStatus.optional(),
});

export const registerForMeetupSchema = z.object({
  fullName:             z.string().trim().min(1).max(150),
  phoneNumber:          z.string().trim().min(5).max(30),
  email:                z.string().trim().email().optional(),
  creatorTypes:         z.array(creatorType).min(1, 'Select at least one').max(2, 'Select up to 2'),
  otherCreatorType:     z.string().trim().max(100).optional(),
  socialMediaProfile:   z.string().trim().max(300).optional(),
  attendancePreference,
  message:              z.string().trim().max(1000).optional(),
}).refine(
  (data) => !data.creatorTypes.includes('OTHER') || !!data.otherCreatorType,
  { message: 'Please describe your "Other" creator type', path: ['otherCreatorType'] },
);

export const listRegistrationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
  search: z.string().trim().max(150).optional(),
});

export type CreateMeetupInput = z.infer<typeof createMeetupSchema>;
export type UpdateMeetupInput = z.infer<typeof updateMeetupSchema>;
export type RegisterForMeetupInput = z.infer<typeof registerForMeetupSchema>;
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;
