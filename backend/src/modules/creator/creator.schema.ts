import { z } from 'zod';

export const updateCreatorProfileSchema = z.object({
  username:    z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed').optional(),
  fullName:    z.string().min(2).optional(),
  // Lets a phone-signup account set its real email during onboarding, ahead of
  // the separate request-email-otp/verify-email-otp flow that actually verifies
  // it later (e.g. from Settings). Not accepted once the account already has a
  // verified email — see creator.service.ts.
  email:       z.string().trim().toLowerCase().email('Invalid email').optional(),
  bio:         z.string().max(500).optional(),
  // Nullable (not just optional) so the client can explicitly clear a
  // previously-set location — an absent key means "leave unchanged", while
  // `null` means "clear it". Without this, clearing the address text but
  // omitting lat/lng left stale coordinates behind (the update just skips
  // untouched keys), pairing an empty location with an old, wrong pin.
  location:    z.string().nullable().optional(),
  locationLat: z.number().nullable().optional(),
  locationLng: z.number().nullable().optional(),
  avatarUrl:   z.string().url('Invalid avatar URL').optional(),
  coverImageUrl: z.string().url('Invalid cover image URL').optional(),
  categories:  z.array(z.string()).optional(),
  nearbyRadiusKm:        z.number().int().min(1).max(200).optional(),
  nearbyUseHomeLocation: z.boolean().optional(),
  // "How do you provide your services?" — first step of provider onboarding.
  providerType: z.enum(['INDIVIDUAL', 'TEAM', 'AGENCY']).optional(),
  // §4 — how many people are in the team. Nullable so a provider can clear it;
  // ignored outright unless the provider is a TEAM (see creator.service.ts).
  // Minimum 2 — a "team" of one is an INDIVIDUAL, and the onboarding field
  // enforces the same floor.
  teamSize: z.number().int().min(2).max(500).nullable().optional(),
  // §6 — industries an AGENCY serves. Same cap as business onboarding's
  // industry step, which edits the equivalent field on BusinessProfile.
  industries: z.array(z.string()).max(5).optional(),
  // §5 step 2 — AGENCY legal identifiers. Nullable so they can be cleared;
  // dropped server-side for any other provider type (see creator.service.ts).
  // §5 step 1 — accepted from every provider type, not just agencies: a
  // freelance photographer's portfolio site is just as relevant.
  website:      z.string().trim().url('Invalid website URL').nullable().optional(),
  // §3 step 4 — where the provider delivers. Nullable so it can be unset.
  serviceMode:  z.enum(['CLIENT_LOCATION', 'MY_LOCATION', 'ONLINE', 'HYBRID']).nullable().optional(),
  panNo:        z.string().trim().max(20).nullable().optional(),
  vatNo:        z.string().trim().max(20).nullable().optional(),
  companyRegNo: z.string().trim().max(40).nullable().optional(),
  // §61 — Privacy settings.
  showPublicProfile:  z.boolean().optional(),
  hideContactDetails: z.boolean().optional(),
  hideSocialLinks:    z.boolean().optional(),
  locationVisibility: z.enum(['EXACT', 'CITY', 'DISTRICT']).optional(),
});

export const addPortfolioLinkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url:   z.string().url('Invalid URL'),
});

export const updateSocialLinksSchema = z.object({
  instagram: z.string().url('Invalid Instagram URL').optional().nullable(),
  tiktok:    z.string().url('Invalid TikTok URL').optional().nullable(),
  youtube:   z.string().url('Invalid YouTube URL').optional().nullable(),
  facebook:  z.string().url('Invalid Facebook URL').optional().nullable(),
});

export const addSocialAccountSchema = z.object({
  // Platform key is validated dynamically against the admin-managed Platform catalog
  // in CreatorService, not a fixed enum — see connectYoutubeAccount-style comment there.
  platform:   z.string().min(1, 'Platform is required'),
  profileUrl: z.string().url('Invalid profile URL'),
  followers:  z.number().int('Must be a whole number').min(0, 'Cannot be negative'),
});

export const updateSocialAccountSchema = z.object({
  profileUrl: z.string().url('Invalid profile URL').optional(),
  followers:  z.number().int('Must be a whole number').min(0, 'Cannot be negative').optional(),
});

export const connectYoutubeAccountSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  // Present only when Google actually issued one (first-time consent with
  // access_type=offline) — lets the follower count keep refreshing itself long
  // after this short-lived access token expires. See creator.service.ts
  // refreshYoutubeFollowers.
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  // Which OAuth client actually minted the token — refreshing later must reuse this
  // exact client ID (see creator.service.ts refreshYoutubeFollowers). Absent only for
  // pre-existing rows connected before this field was added.
  clientPlatform: z.enum(['ios', 'android', 'web']).optional(),
});

export const listFacebookPagesSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
});

export const connectFacebookPageSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  pageId:      z.string().min(1, 'Page id is required'),
});

export const connectInstagramAccountSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  pageId:      z.string().min(1, 'Page id is required'),
});

const VALID_PAYMENT_METHODS = ['esewa', 'khalti', 'fonepay'] as const;

export const updatePaymentMethodsSchema = z.object({
  methods: z.array(z.enum(VALID_PAYMENT_METHODS)).min(0),
});

const VALID_LOCATIONS = ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Butwal', 'Biratnagar', 'Remote'] as const;

export const updateCampaignPrefsSchema = z.object({
  categories:   z.array(z.string()).max(5, 'Max 5 categories').optional(),
  // Validated dynamically against the admin-managed Platform catalog in CreatorService.
  prefPlatforms: z.array(z.string()).optional(),
  prefLocations: z.array(z.enum(VALID_LOCATIONS)).max(3, 'Max 3 locations').optional(),
  prefBudgetMin: z.number().min(0).optional(),
  prefBudgetMax: z.number().min(0).optional(),
});

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateAvailabilityStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE']),
});

export const updateAvailabilityScheduleSchema = z.object({
  days: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0, 'dayOfWeek must be 0-6').max(6, 'dayOfWeek must be 0-6'),
      availableFrom: z.string().regex(TIME_RE, 'Must be HH:mm'),
      availableUntil: z.string().regex(TIME_RE, 'Must be HH:mm'),
    }).refine((d) => d.availableFrom < d.availableUntil, {
      message: 'availableFrom must be before availableUntil',
      path: ['availableUntil'],
    })
  ).max(7, 'At most 7 days').refine(
    (days) => new Set(days.map((d) => d.dayOfWeek)).size === days.length,
    { message: 'Each day may only appear once' }
  ),
});

export const respondToInvitationSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export type UpdateAvailabilityStatusInput   = z.infer<typeof updateAvailabilityStatusSchema>;
export type UpdateAvailabilityScheduleInput = z.infer<typeof updateAvailabilityScheduleSchema>;
export type RespondToInvitationInput        = z.infer<typeof respondToInvitationSchema>;

export type UpdateCreatorProfileInput  = z.infer<typeof updateCreatorProfileSchema>;
export type AddPortfolioLinkInput      = z.infer<typeof addPortfolioLinkSchema>;
export type UpdateSocialLinksInput     = z.infer<typeof updateSocialLinksSchema>;
export type AddSocialAccountInput      = z.infer<typeof addSocialAccountSchema>;
export type UpdateSocialAccountInput   = z.infer<typeof updateSocialAccountSchema>;
export type ConnectYoutubeAccountInput   = z.infer<typeof connectYoutubeAccountSchema>;
export type ListFacebookPagesInput       = z.infer<typeof listFacebookPagesSchema>;
export type ConnectFacebookPageInput     = z.infer<typeof connectFacebookPageSchema>;
export type ConnectInstagramAccountInput = z.infer<typeof connectInstagramAccountSchema>;
export type UpdatePaymentMethodsInput  = z.infer<typeof updatePaymentMethodsSchema>;
export type UpdateCampaignPrefsInput   = z.infer<typeof updateCampaignPrefsSchema>;
