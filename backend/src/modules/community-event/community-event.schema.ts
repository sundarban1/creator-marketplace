import { z } from 'zod';
import { isValidTimeZone } from './community-event.time';

// Admin forms send '' for a cleared field — normalise to null so "optional"
// means the same thing whether the key is missing, null or blank.
const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : typeof v === 'string' ? v.trim() : v);
const optText = (max: number) => z.preprocess(blankToNull, z.string().max(max).nullable().optional());
const optUrl = z.preprocess(blankToNull, z.string().url('Must be a valid URL').max(2048).nullable().optional());
const optNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), z.number().min(min).max(max).nullable().optional());
const reqText = (label: string, max: number) =>
  z.preprocess(blankToNull, z.string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` }).min(1, `${label} is required`).max(max));

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

export const COMMUNITY_EVENT_TYPES = ['MEETUP', 'WORKSHOP', 'TRAINING', 'NETWORKING', 'COMMUNITY_EVENT', 'OTHER'] as const;
export const COMMUNITY_EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;

const imageSchema = z.object({ url: z.string().url(), caption: optText(200) });
const speakerSchema = z.object({
  name: reqText('Speaker name', 120),
  imageUrl: optUrl,
  role: optText(160),
  organization: optText(160),
  bio: optText(600),
  profileUrl: optUrl,
});
const highlightSchema = z.object({
  title: reqText('Highlight title', 120),
  description: optText(400),
  imageUrl: optUrl,
});
const agendaSchema = z.object({
  time: optText(40),
  title: reqText('Agenda title', 160),
  description: optText(400),
});
const partnerSchema = z.object({
  name: reqText('Partner name', 120),
  logoUrl: optUrl,
  websiteUrl: optUrl,
});

export const communityEventInputSchema = z
  .object({
    title: reqText('Title', 160),
    slug: z.preprocess(
      blankToNull,
      z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens').nullable().optional(),
    ),
    shortDescription: reqText('Short description', 280),
    description: optText(20_000),
    eventType: z.enum(COMMUNITY_EVENT_TYPES).default('MEETUP'),
    statusOverride: z.preprocess(blankToNull, z.enum(COMMUNITY_EVENT_STATUSES).nullable().optional()),
    coverImageUrl: optUrl,

    startDate: DATE,
    startTime: TIME,
    endDate: z.preprocess(blankToNull, DATE.nullable().optional()),
    endTime: z.preprocess(blankToNull, TIME.nullable().optional()),
    timezone: z
      .string()
      .default('Asia/Kathmandu')
      .refine(isValidTimeZone, 'Unknown timezone'),

    venueName: optText(160),
    address: optText(240),
    city: optText(120),
    country: optText(120),
    latitude: optNumber(-90, 90),
    longitude: optNumber(-180, 180),
    mapsUrl: optUrl,
    videoUrl: optUrl,

    registrationEnabled: z.boolean().default(false),
    registrationUrl: optUrl,
    registrationDeadline: z.preprocess(blankToNull, DATE.nullable().optional()),
    maxAttendees: z.preprocess((v) => (v === '' ? null : v), z.number().int().positive().nullable().optional()),

    metaTitle: optText(120),
    metaDescription: optText(300),
    ogImageUrl: optUrl,

    featured: z.boolean().default(false),
    published: z.boolean().default(false),

    images: z.array(imageSchema).max(100).default([]),
    speakers: z.array(speakerSchema).max(30).default([]),
    highlights: z.array(highlightSchema).max(30).default([]),
    agenda: z.array(agendaSchema).max(50).default([]),
    partners: z.array(partnerSchema).max(40).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && !v.endTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Add an end time, or clear the end date' });
    }
    if (v.registrationEnabled && !v.registrationUrl) {
      ctx.addIssue({ code: 'custom', path: ['registrationUrl'], message: 'Registration URL is required when registration is enabled' });
    }
    if (v.published && !v.coverImageUrl) {
      ctx.addIssue({ code: 'custom', path: ['coverImageUrl'], message: 'A cover image is required to publish' });
    }
  });

export const publishSchema = z.object({ published: z.boolean() });

export const uploadKindSchema = z.object({
  kind: z.enum(['cover', 'gallery', 'speaker', 'partner', 'highlight']).default('gallery'),
});

export type CommunityEventInput = z.infer<typeof communityEventInputSchema>;
