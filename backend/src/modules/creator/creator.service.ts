import { randomUUID, randomBytes, createHash } from 'crypto';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { signOAuthState, verifyOAuthState } from '../../utils/jwt';
import { toCreatorProfileDto, toPublicCreatorDto, toPrivateCreatorDto, toCreatorListItemDto, toSocialAccountDto } from './creator.dto';
import { translateFields, translateMany } from '../../utils/translation';
import { haversineKm } from '../../utils/geo';
import { getCachedSettings } from '../../utils/settingsCache';
import { cached, invalidatePrefix } from '../../utils/cache';

const CREATOR_FIELDS = ['bio', 'location', 'categories'] as const;

// Public creator-profile responses are read far more often than the profile
// changes, and each one runs 5 parallel aggregate queries plus a live external
// translate call (utils/translation.ts) for any non-English text. Cache the
// fully-built public response briefly, keyed by id + language. Best-effort: a
// Redis miss / outage just rebuilds it exactly as before. TTL is short and the
// write paths call invalidatePublicCreatorProfile(), so staleness is bounded to
// a few seconds even for the write paths that don't invalidate.
const PUBLIC_PROFILE_CACHE_TTL_SEC = 60;
const publicProfileCacheKey = (creatorId: string, lang: string) => `creator-profile:${creatorId}:${lang}`;

/** Drop every cached language variant of one creator's public profile. */
export function invalidatePublicCreatorProfile(creatorId: string): Promise<void> {
  return invalidatePrefix(`creator-profile:${creatorId}:`);
}
import { CreatorRepository } from './creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { PlatformRepository } from '../platform/platform.repository';
import { PaymentMethodRepository } from '../payment-method/payment-method.repository';
import { ServiceRepository } from '../service/service.repository';
import { PortfolioRepository } from '../portfolio/portfolio.repository';
import { ProviderMemberRepository } from '../provider-member/provider-member.repository';
import { InvitationStatus } from '@prisma/client';
import { analyticsService } from '../analytics/analytics.service';
import { logActivity } from '../logging/activity.service';
import { ActivityAction } from '../logging/logging.constants';
import { notificationService } from '../notifications/notification.service';
import { HttpStatus } from '../../constants/httpStatus';
import type {
  UpdateCreatorProfileInput,
  AddPortfolioLinkInput,
  UpdateSocialLinksInput,
  AddSocialAccountInput,
  UpdateSocialAccountInput,
  UpdatePaymentMethodsInput,
  UpdateCampaignPrefsInput,
  UpdateAvailabilityStatusInput,
  UpdateAvailabilityScheduleInput,
  RespondToInvitationInput,
} from './creator.schema';

interface YoutubeChannelResponse {
  items?: Array<{
    id: string;
    snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
}

interface TiktokTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  error?: string;
  error_description?: string;
}

interface TiktokUserInfoResponse {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  error?: { code?: string; message?: string };
}

export interface FacebookPageRaw {
  id: string;
  name: string;
  access_token: string;
  fan_count?: number;
  link?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: {
    id: string;
    username?: string;
    followers_count?: number;
    profile_picture_url?: string;
  };
}

interface FacebookPagesResponse {
  data?: FacebookPageRaw[];
  error?: { message?: string; code?: number };
}

export interface FacebookPageOption {
  id: string;
  name: string;
  fanCount: number;
  picture?: string;
  hasInstagram: boolean;
  instagramUsername?: string;
}

interface InstagramTokenResponse {
  access_token?: string;
  user_id?: string;
  error_type?: string;
  error_message?: string;
}

interface InstagramLongLivedTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

interface InstagramMeResponse {
  id?: string;
  username?: string;
  account_type?: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  followers_count?: number;
  profile_picture_url?: string;
  error?: { message?: string; type?: string; code?: number };
}

// ── Automatic follower/subscriber refresh ────────────────────────────────────
// Shared by the scheduled job (jobs/refreshSocialFollowers.ts, every 6h) and the
// silent per-creator top-up that fires whenever a stale account's data is about to
// be shown (see refreshStaleSocialAccountsForCreator) — there's no manual "sync"
// action anywhere in the app; both paths call the same per-platform functions below.

export type RawSocialAccountRow = {
  id: string;
  platform: string;
  platformUserId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  oauthConnectionType: string | null;
};

type RefreshResult = {
  followers: number;
  // Only set when the token actually changed during this refresh — the repository
  // layer leaves a field untouched when its value here is undefined.
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
};

// True once a stored token has already expired, or is within 10 minutes of
// expiring — refreshed a bit early rather than waiting for an actual 401, since a
// background batch job silently losing an account mid-run is worse than one extra
// refresh call. A null expiry (token type has no known lifetime, e.g. a Facebook
// Page token) is treated as "still fine".
function isTokenStaleOrExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() < 10 * 60 * 1000;
}

// Encodes which Google OAuth client minted the token, since refreshing it later has
// to reuse that exact client ID (see resolveGoogleRefreshCredentials below) — Google
// rejects a refresh_token grant made under a different client ID than the one that
// issued it. Shared by both creator and business YouTube connect.
export function googleOauthConnectionType(clientPlatform?: 'ios' | 'android' | 'web'): string {
  return clientPlatform ? `google_${clientPlatform}` : 'google';
}

// Android/iOS are public clients (no secret, verified via package name/bundle ID +
// key hash instead) — sending a secret for them would just be ignored, but sending
// the WRONG client_id is what actually breaks the refresh with invalid_client. Rows
// connected before clientPlatform was tracked (oauthConnectionType === 'google') fall
// back to the Web client/secret — that's only correct for the (refresh-token-less)
// web flow, so those legacy rows may need a one-time reconnect to self-heal.
function resolveGoogleRefreshCredentials(oauthConnectionType: string | null): { clientId: string; clientSecret?: string } {
  if (oauthConnectionType === 'google_android') return { clientId: env.GOOGLE_ANDROID_CLIENT_ID ?? '' };
  if (oauthConnectionType === 'google_ios') return { clientId: env.GOOGLE_IOS_CLIENT_ID ?? '' };
  return { clientId: env.GOOGLE_WEB_CLIENT_ID ?? '', clientSecret: env.GOOGLE_CLIENT_SECRET ?? '' };
}

async function fetchYoutubeSubscriberCount(accessToken: string): Promise<number> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new AppError(`Could not refresh YouTube subscriber count (${res.status})`, HttpStatus.BAD_GATEWAY);
  const data = (await res.json()) as YoutubeChannelResponse;
  const stats = data.items?.[0]?.statistics;
  return stats?.hiddenSubscriberCount ? 0 : parseInt(stats?.subscriberCount ?? '0', 10);
}

// Shared by both creator and business YouTube connect — fetches the caller's own
// channel (snippet + statistics) and shapes it into the fields a SocialAccount row
// needs. Kept owner-agnostic on purpose so it isn't duplicated per profile type.
export async function fetchYoutubeChannel(accessToken: string): Promise<{
  channelId: string; profileUrl: string; followers: number; avatarUrl?: string;
}> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error({ status: res.status, body }, 'YouTube Data API request failed');
    const reason = (() => { try { return JSON.parse(body)?.error?.errors?.[0]?.reason; } catch { return undefined; } })();

    if (res.status === 401) throw new AppError(getDict().creator.googleSessionExpired, HttpStatus.UNAUTHORIZED);
    if (reason === 'accessNotConfigured') {
      throw new AppError(getDict().creator.youtubeApiNotEnabled, HttpStatus.BAD_GATEWAY);
    }
    if (res.status === 403) {
      throw new AppError(getDict().creator.googleAccessDenied, HttpStatus.FORBIDDEN);
    }
    throw new AppError(getDict().creator.couldNotReachYoutube(res.status), HttpStatus.BAD_GATEWAY);
  }
  const data = (await res.json()) as YoutubeChannelResponse;
  const channel = data.items?.[0];
  if (!channel) throw new AppError(getDict().creator.noYoutubeChannelFound, HttpStatus.NOT_FOUND);

  const profileUrl = channel.snippet?.customUrl
    ? `https://www.youtube.com/${channel.snippet.customUrl}`
    : `https://www.youtube.com/channel/${channel.id}`;
  const followers = channel.statistics?.hiddenSubscriberCount
    ? 0
    : parseInt(channel.statistics?.subscriberCount ?? '0', 10);

  return { channelId: channel.id, profileUrl, followers, avatarUrl: channel.snippet?.thumbnails?.default?.url };
}

// Facebook Page access tokens derived from a long-lived (60-day) user token are
// themselves effectively long-lived, which is what makes it possible to keep
// refreshing a Page's (or its linked Instagram account's) follower count for
// months without the creator ever reconnecting. A short-lived client token alone
// would go stale within ~2 hours.
export async function exchangeForLongLivedFacebookToken(shortLivedToken: string): Promise<string> {
  const url =
    'https://graph.facebook.com/oauth/access_token' +
    '?grant_type=fb_exchange_token' +
    `&client_id=${encodeURIComponent(env.FACEBOOK_APP_ID ?? '')}` +
    `&client_secret=${encodeURIComponent(env.FACEBOOK_APP_SECRET ?? '')}` +
    `&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !data.access_token) {
    logger.error({ status: res.status, error: data.error }, 'Facebook long-lived token exchange failed');
    // Not fatal for the connect itself — fall back to the short-lived token so
    // the account still connects even if this exchange fails; it just won't keep
    // auto-refreshing for as long in that case.
    return shortLivedToken;
  }
  return data.access_token;
}

// ── Recommended-creators scoring ─────────────────────────────────────────────
// Candidates are already category-gated (findRecommended only returns creators
// with the campaign's category), so category isn't a weighted factor here — this
// only ranks WITHIN that already-matched pool. Every sub-score is normalized to
// [0, 1]; missing data (no reviews yet, no coordinates, no stated budget) falls
// back to a neutral 0.5 rather than 0, so a new/unrated creator isn't penalized
// as harshly as one with an actually-bad track record. Same neutral treatment
// for platformScore when the caller doesn't pass a platforms filter — adding an
// equal constant to every candidate doesn't change relative ranking, so it's a
// safe no-op for callers that don't care about platform overlap.
const RECOMMEND_WEIGHTS = { followers: 0.2, completion: 0.2, rating: 0.15, proximity: 0.15, rate: 0.1, verified: 0.1, platform: 0.1 };

function scoreCandidate(
  c: {
    topFollowers: number; completionRate?: number; averageRating?: number; distanceKm?: number;
    prefBudgetMin: number; prefBudgetMax: number; isVerified: boolean; socialAccounts: { platform: string }[];
  },
  params: { budgetMin?: number; budgetMax?: number; platforms?: string[] },
): number {
  const followerScore = Math.min(c.topFollowers / 100_000, 1);
  const completionScore = c.completionRate ?? 0.5;
  const ratingScore = c.averageRating != null ? c.averageRating / 5 : 0.5;
  const proximityScore = c.distanceKm != null ? Math.max(0, 1 - c.distanceKm / 50) : 0.5;
  const rateScore = params.budgetMin != null && params.budgetMax != null
    ? (c.prefBudgetMax >= params.budgetMin && c.prefBudgetMin <= params.budgetMax ? 1 : 0.3)
    : 0.5;
  const verifiedScore = c.isVerified ? 1 : 0;
  const platformScore = params.platforms?.length
    ? params.platforms.filter((p) => c.socialAccounts.some((a) => a.platform === p)).length / params.platforms.length
    : 0.5;

  return (
    followerScore   * RECOMMEND_WEIGHTS.followers +
    completionScore * RECOMMEND_WEIGHTS.completion +
    ratingScore      * RECOMMEND_WEIGHTS.rating +
    proximityScore   * RECOMMEND_WEIGHTS.proximity +
    rateScore        * RECOMMEND_WEIGHTS.rate +
    verifiedScore    * RECOMMEND_WEIGHTS.verified +
    platformScore    * RECOMMEND_WEIGHTS.platform
  );
}

// §79 — ranks candidates against the admin-configured launch-priority city
// (marketplace.launchPriorityCity) ahead of the score-based ranking above,
// so the marketplace can favor its current launch market without any of
// this logic ever hardcoding "Itahari" — an admin changing the setting is
// the only thing that needs to happen to shift focus to a new city.
// 0 = same city as the priority city, 1 = has some known location (ranked by
// the existing distance/score system), 2 = no location on file at all.
function cityTier(candidateCity: string | null | undefined, priorityCity: string): number {
  if (priorityCity && candidateCity && candidateCity.trim().toLowerCase() === priorityCity.trim().toLowerCase()) return 0;
  return candidateCity ? 1 : 2;
}

export class CreatorService {
  private repo: CreatorRepository;
  private businessRepo: BusinessRepository;
  private platformRepo: PlatformRepository;
  private paymentMethodRepo: PaymentMethodRepository;
  private serviceRepo: ServiceRepository;
  private portfolioRepo: PortfolioRepository;
  private providerMemberRepo: ProviderMemberRepository;

  constructor() {
    this.repo = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
    this.platformRepo = new PlatformRepository();
    this.paymentMethodRepo = new PaymentMethodRepository();
    this.serviceRepo = new ServiceRepository();
    this.portfolioRepo = new PortfolioRepository();
    this.providerMemberRepo = new ProviderMemberRepository();
  }

  async listCreators(params: {
    page: number;
    limit: number;
    search?: string;
    categories?: string[];
    location?: string;
    platforms?: string[];
    priceMin?: number;
    priceMax?: number;
    excludeId?: string;
    sort?: 'newest' | 'oldest' | 'followers';
    lang?: string;
  }) {
    const { page, limit, search, categories, location, platforms, priceMin, priceMax, excludeId, sort, lang = 'en' } = params;
    const { creators: raw, total } = await this.repo.findMany({
      page, limit: Math.min(limit, 20),
      search, categories, location, platforms, priceMin, priceMax, excludeId, sort,
    });
    const dtos = raw.map(toCreatorListItemDto);
    const creators = await translateMany(dtos, [...CREATOR_FIELDS], lang);
    return { creators, total, page, limit };
  }

  /**
   * Up to `limit` creators matching the campaign's category, for the "recommend
   * creators to invite" prompt shown right after publishing. When the campaign
   * has coordinates, nearby matches are ranked first (distance computed in JS —
   * the ~50-row category-matched candidate pool is small enough that this is
   * simpler than a DB-side Haversine query, unlike the campaign nearby-search
   * which has to scale to much larger result sets).
   */
  async getRecommendedForCampaign(params: {
    category: string;
    lat?: number;
    lng?: number;
    budgetMin?: number;
    budgetMax?: number;
    platforms?: string[];
    minFollowers?: number;
    limit?: number;
    lang?: string;
  }) {
    const limit = Math.min(params.limit ?? 10, 20);
    const [candidates, settings] = await Promise.all([
      this.repo.findRecommended(params.category),
      getCachedSettings(),
    ]);
    const priorityCity = (settings['marketplace.launchPriorityCity'] as string | undefined) ?? '';
    const analyticsByUserId = new Map(
      (await this.repo.findAnalyticsByUserIds(candidates.map((c) => c.userId))).map((a) => [a.userId, a]),
    );

    const ranked = candidates
      .map((c) => {
        const distanceKm =
          params.lat != null && params.lng != null && c.locationLat != null && c.locationLng != null
            ? haversineKm(params.lat, params.lng, c.locationLat, c.locationLng)
            : undefined;
        const analytics = analyticsByUserId.get(c.userId);
        const completionRate = analytics && analytics.applicationsAccepted > 0
          ? analytics.completedCampaigns / analytics.applicationsAccepted
          : undefined;
        const averageRating = analytics && analytics.reviewCount > 0 ? analytics.averageRating : undefined;
        const completedEvents = analytics?.completedCampaigns ?? 0;
        const topFollowers = c.socialAccounts.reduce((max, a) => Math.max(max, a.followers), 0);

        return { ...c, distanceKm, completionRate, averageRating, completedEvents, topFollowers };
      })
      // Unlike the soft-ranked factors below, minFollowers is a stated
      // campaign requirement, not a preference — creators who don't meet it
      // are excluded outright rather than merely ranked lower.
      .filter((c) => c.topFollowers >= (params.minFollowers ?? 0))
      // §79 — city tier is the primary sort key (same-city candidates always
      // rank ahead of everyone else), the existing weighted score breaks ties
      // within each tier.
      .sort((a, b) => {
        const tierDiff = cityTier(a.city, priorityCity) - cityTier(b.city, priorityCity);
        if (tierDiff !== 0) return tierDiff;
        return scoreCandidate(b, params) - scoreCandidate(a, params);
      })
      .slice(0, limit);

    const dtos = ranked.map(toCreatorListItemDto);
    return translateMany(dtos, [...CREATOR_FIELDS], params.lang ?? 'en');
  }

  async getCreatorPublicProfile(creatorId: string, lang = 'en', viewerUserId?: string) {
    const profile = await this.repo.findByIdPublic(creatorId);
    if (!profile) throw new AppError(getDict().creator.creatorNotFound, HttpStatus.NOT_FOUND);
    // showPublicProfile only hides the profile from other viewers — a creator
    // who reaches their own id here (e.g. via search) should still see it in full.
    const isOwnProfile = viewerUserId != null && profile.userId === viewerUserId;
    if (!profile.showPublicProfile && !isOwnProfile) return toPrivateCreatorDto(profile);

    // Fire-and-forget — only authenticated brands reach this route at all
    // (business.routes.ts gates the whole file on authorize('BUSINESS')), so
    // the "ignore own profile"/"authenticated brands only" PRD rules are
    // already satisfied by the route itself.
    if (viewerUserId) {
      this.businessRepo.findByUserId(viewerUserId).then((business) => {
        if (business) analyticsService.recordProfileView(profile.id, business.id, profile.userId);
      }).catch(() => {});
    }

    // The owner viewing their own profile always gets a fresh build (never the
    // shared cache) so an edit they just made is reflected immediately.
    if (isOwnProfile) return this.buildPublicCreatorProfile(profile, lang);

    return cached(
      publicProfileCacheKey(creatorId, lang),
      PUBLIC_PROFILE_CACHE_TTL_SEC,
      () => this.buildPublicCreatorProfile(profile, lang),
    );
  }

  // Builds the full public-profile response. Split out of getCreatorPublicProfile
  // so the cached and uncached (own-profile) paths share one implementation.
  private async buildPublicCreatorProfile(
    profile: NonNullable<Awaited<ReturnType<CreatorRepository['findByIdPublic']>>>,
    lang: string,
  ) {
    const dto = toPublicCreatorDto(profile);
    const translated = await translateFields(dto, [...CREATOR_FIELDS], lang);
    // portfolioItems are the richer, media-backed entries (PortfolioItem table)
    // — distinct from the legacy portfolioLinks label+url list already carried
    // by toPublicCreatorDto. Both are returned so viewers see the full body of work.
    const [stats, reviews, services, portfolioItems, members] = await Promise.all([
      analyticsService.getCreatorPublicStats(profile.userId).catch(() => null),
      analyticsService.getReviewsReceived(profile.userId).catch(() => []),
      this.serviceRepo.findActiveByCreatorProfileId(profile.id).catch(() => []),
      this.portfolioRepo.findByCreatorProfileId(profile.id).catch(() => []),
      profile.providerType === 'TEAM' || profile.providerType === 'AGENCY'
        ? this.providerMemberRepo.findByProviderId(profile.id).catch(() => [])
        : Promise.resolve([]),
    ]);
    // Public roster: only accepted members, and only the fields already public
    // on the member's own profile — no jobRole/accessRole/invite metadata.
    const teamMembers = members
      .filter((m) => m.status === InvitationStatus.ACCEPTED)
      .map((m) => ({
        id: m.member.id,
        fullName: m.member.fullName,
        username: m.member.username,
        avatarUrl: m.member.avatarUrl,
        categories: m.member.categories,
        isVerified: m.member.isVerified,
      }));
    return { ...translated, stats, reviews, services, portfolioItems, teamMembers };
  }

  async getFilterOptions() {
    return this.repo.getFilterOptions();
  }

  async isUsernameAvailable(username: string) {
    const taken = await this.repo.findByUsername(username);
    return { available: !taken };
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    // Every review this creator has received — shown as a section at the bottom
    // of their own profile screen (limit null = no cap).
    const reviews = await analyticsService.getReviewsReceived(profile.userId, null).catch(() => []);
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;
    return { ...toCreatorProfileDto(profile), reviews, reviewSummary: { averageRating, reviewCount } };
  }

  // Thin resolver used to self-exclude the viewer from the peer-creators
  // browse list — returns null rather than throwing if no profile exists yet.
  async findByUserId(userId: string) {
    return this.repo.findByUserId(userId);
  }

  async updateProfile(userId: string, input: UpdateCreatorProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    // Enforce username uniqueness (only if changing)
    if (input.username && input.username !== profile.username) {
      const taken = await this.repo.findByUsername(input.username);
      if (taken) throw new AppError(getDict().creator.usernameAlreadyTaken, HttpStatus.CONFLICT);
    }

    const { email, ...rest } = input;

    // teamSize only means anything for a TEAM. Switching to any other provider
    // type clears it, and a teamSize sent by a non-TEAM provider is dropped
    // rather than stored — same shape as business.service.ts clearing its
    // ORGANIZATION-only fields when representingType flips to INDIVIDUAL.
    const effectiveProviderType = rest.providerType ?? profile.providerType;
    if (effectiveProviderType !== 'TEAM') {
      if (rest.providerType && profile.teamSize != null) rest.teamSize = null;
      else delete rest.teamSize;
    }
    // §6 industries are the AGENCY equivalent — same rule.
    if (effectiveProviderType !== 'AGENCY') {
      if (rest.providerType && profile.industries.length > 0) rest.industries = [];
      else delete rest.industries;
    }
    // §5 legal identifiers: only an AGENCY can set them, but an existing value
    // survives a provider-type change — see the schema comment for why these
    // are treated differently from the two presentation fields above.
    if (effectiveProviderType !== 'AGENCY') {
      delete rest.panNo;
      delete rest.vatNo;
      delete rest.companyRegNo;
    }
    if (email) {
      const account = await this.repo.getUserEmailStatus(userId);
      if (account?.isEmailVerified) throw new AppError(getDict().creator.emailAlreadyVerified, HttpStatus.CONFLICT);
      const existing = await this.repo.findUserByEmail(email);
      if (existing && existing.id !== userId) throw new AppError(getDict().creator.emailAlreadyInUseByAnother, HttpStatus.CONFLICT);
      await this.repo.setAccountEmail(userId, email);
    }

    const updated = await this.repo.update(userId, rest);

    // Avatar uploads and every other profile edit funnel through here, so this
    // one call keeps the public-profile cache fresh for the common write paths.
    void invalidatePublicCreatorProfile(profile.id);

    logActivity({ userId, action: ActivityAction.CREATOR_PROFILE_UPDATED, metadata: { changedFields: Object.keys(rest) } });

    return toCreatorProfileDto(updated);
  }

  async uploadCitizenship(userId: string, docUrl: string) {
    return toCreatorProfileDto(await this.repo.updateCitizenship(userId, docUrl));
  }

  // Checked by the controller BEFORE the file reaches Cloudinary, so a wrong
  // caller can't leave an orphaned upload behind — same guard order as
  // business.service.ts's identity-document endpoint.
  async assertCanUploadCompanyRegDoc(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    if (profile.providerType !== 'AGENCY') {
      throw new AppError(getDict().creator.onlyAgencyUploadsCompanyRegDoc, HttpStatus.BAD_REQUEST);
    }
  }

  async uploadCompanyRegDoc(userId: string, docUrl: string) {
    return toCreatorProfileDto(await this.repo.updateCompanyRegDoc(userId, docUrl));
  }

  async uploadPan(userId: string, docUrl: string) {
    return toCreatorProfileDto(await this.repo.updatePan(userId, docUrl));
  }

  async addPortfolioLink(userId: string, input: AddPortfolioLinkInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    const newLink = { id: randomUUID(), label: input.label, url: input.url };
    return toCreatorProfileDto(await this.repo.addPortfolioLink(userId, newLink, currentLinks));
  }

  async removePortfolioLink(userId: string, linkId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    if (!currentLinks.some((l) => l.id === linkId)) throw new AppError(getDict().creator.portfolioLinkNotFound, HttpStatus.NOT_FOUND);
    return toCreatorProfileDto(await this.repo.removePortfolioLink(userId, linkId, currentLinks));
  }

  async updateSocialLinks(userId: string, input: UpdateSocialLinksInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const currentLinks = (profile.socialLinks as Record<string, string>) || {};
    return toCreatorProfileDto(await this.repo.updateSocialLinks(userId, { ...currentLinks, ...input }));
  }

  // ── Social Accounts ────────────────────────────────────────────────────────

  async getSocialAccounts(userId: string) {
    const accounts = await this.repo.findSocialAccountsByUserId(userId);

    // Fire-and-forget: top up any stale accounts in the background so the NEXT
    // load reflects current numbers, without making this request wait on however
    // many third-party API calls that would take. Combined with the scheduled job
    // (jobs/refreshSocialFollowers.ts), this is the entire "keeps updating"
    // mechanism — there's no manual sync action anywhere in the app.
    const profile = accounts[0] ? { id: accounts[0].creatorProfileId! } : await this.repo.findByUserId(userId);
    if (profile) {
      this.refreshStaleSocialAccountsForCreator(profile.id).catch((err) =>
        logger.error({ err, userId }, 'Background social account refresh failed to start'));
    }

    return accounts.map(toSocialAccountDto);
  }

  async addSocialAccount(userId: string, input: AddSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const platforms = await this.platformRepo.findManyPublic();
    if (!platforms.some((p) => p.key === input.platform)) throw new AppError(getDict().creator.invalidPlatform, HttpStatus.BAD_REQUEST);

    const existing = await this.repo.findSocialAccountByPlatform(profile.id, input.platform);
    if (existing) throw new AppError(getDict().creator.socialAccountAlreadyAdded(input.platform), HttpStatus.CONFLICT);

    return toSocialAccountDto(await this.repo.addSocialAccount(profile.id, input));
  }

  async updateSocialAccount(userId: string, accountId: string, input: UpdateSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError(getDict().creator.socialAccountNotFound, HttpStatus.NOT_FOUND);

    return toSocialAccountDto(await this.repo.updateSocialAccount(accountId, input));
  }

  async deleteSocialAccount(userId: string, accountId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError(getDict().creator.socialAccountNotFound, HttpStatus.NOT_FOUND);

    await this.repo.deleteSocialAccount(accountId);
  }

  // Exchanges a Google access token (obtained client-side with the youtube.readonly
  // scope) for the creator's own channel data, and saves it — no manual URL/follower
  // entry needed. Safe to call again later to refresh the subscriber count.
  // refreshToken/expiresIn are only present when Google actually issued a refresh
  // token (first-time consent with access_type=offline) — when present, they're
  // persisted so refreshYoutubeFollowers can keep the subscriber count current on
  // its own long after this access token expires, with no reconnect needed.
  async connectYoutubeAccount(
    userId: string, accessToken: string, refreshToken?: string, expiresIn?: number,
    clientPlatform?: 'ios' | 'android' | 'web',
  ) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const channel = await fetchYoutubeChannel(accessToken);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'youtube', {
      profileUrl: channel.profileUrl,
      followers: channel.followers,
      platformUserId: channel.channelId,
      avatarUrl: channel.avatarUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      oauthConnectionType: googleOauthConnectionType(clientPlatform),
    });
    return toSocialAccountDto(account);
  }

  // TikTok's OAuth requires an HTTPS redirect URI verified in the Developer Portal —
  // no custom app-scheme redirects like Google/Facebook — so the code exchange has to
  // happen here on the backend rather than on-device. The mobile app opens this URL in
  // a browser; TikTok redirects back to our /callback route (below), which then 302s
  // into the app via the custom scheme once the exchange + save is done.
  async getTiktokAuthorizeUrl(userId: string, role: 'CREATOR' | 'BUSINESS' = 'CREATOR'): Promise<string> {
    if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_REDIRECT_URI) {
      throw new AppError(getDict().creator.tiktokLoginNotConfigured, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    // redirect_uri below always points at this same backend route regardless of
    // role — TikTok's Developer Portal only has one registered redirect URI, so the
    // business flow reuses it and the callback below tells the two apart via `role`.
    const state = await signOAuthState({ userId, codeVerifier, role });

    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.set('client_key', env.TIKTOK_CLIENT_KEY);
    // Only the scope actually enabled on the TikTok app right now — requesting an
    // unconfigured scope makes TikTok reject the whole authorize request.
    url.searchParams.set('scope', 'user.info.basic');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', env.TIKTOK_REDIRECT_URI);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    // Without this, TikTok silently reuses whatever account is already logged into the
    // in-app browser session, so a creator who disconnected and wants to link a
    // different TikTok account never sees the login/account-switch screen at all.
    url.searchParams.set('disable_auto_auth', '1');
    return url.toString();
  }

  async handleTiktokCallback(code: string, state: string) {
    let statePayload: Awaited<ReturnType<typeof verifyOAuthState>>;
    try {
      statePayload = await verifyOAuthState(state);
    } catch (err) {
      logger.warn({ err }, 'TikTok OAuth state verification failed');
      throw new AppError(getDict().creator.tiktokAuthorizationExpired, HttpStatus.BAD_REQUEST);
    }
    const { userId, codeVerifier, role } = statePayload;
    if (!codeVerifier) throw new AppError(getDict().creator.tiktokAuthorizationExpired, HttpStatus.BAD_REQUEST);

    const isBusiness = role === 'BUSINESS';
    const profile = isBusiness ? await this.businessRepo.findByUserId(userId) : await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.profileNotFoundForRole(isBusiness), HttpStatus.NOT_FOUND);

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY!,
        client_secret: env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: env.TIKTOK_REDIRECT_URI!,
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = (await tokenRes.json()) as TiktokTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error({ status: tokenRes.status, tokenData }, 'TikTok token exchange failed');
      throw new AppError(tokenData.error_description ?? getDict().creator.couldNotConnectTiktokAccount, HttpStatus.BAD_GATEWAY);
    }

    const infoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const infoData = (await infoRes.json()) as TiktokUserInfoResponse;
    const tiktokUser = infoData.data?.user;
    if (!infoRes.ok || !tiktokUser) {
      logger.error({ status: infoRes.status, infoData }, 'TikTok user info request failed');
      throw new AppError(getDict().creator.couldNotReadTiktokProfile, HttpStatus.BAD_GATEWAY);
    }

    // TikTok only returns the real @handle / profile_deep_link under the
    // user.info.profile scope, which isn't enabled on this app yet — fall back to a
    // best-effort link from display_name until that scope is added and approved.
    const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(tiktokUser.display_name ?? tiktokUser.open_id ?? '')}`;
    const tiktokData = {
      profileUrl,
      followers: 0,
      platformUserId: tiktokUser.open_id ?? profile.id,
      avatarUrl: tiktokUser.avatar_url,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      oauthConnectionType: 'tiktok',
    };
    const account = isBusiness
      ? await this.businessRepo.upsertOAuthSocialAccount(profile.id, 'tiktok', tiktokData)
      : await this.repo.upsertOAuthSocialAccount(profile.id, 'tiktok', tiktokData);
    return toSocialAccountDto(account);
  }

  // Facebook only exposes follower/fan counts for Pages, never personal profiles, and
  // an Instagram Business/Creator account's stats are only reachable by first finding
  // the Facebook Page it's linked to — so both "Connect Facebook" and "Connect
  // Instagram" share this one Graph API call (fetched fresh each time rather than
  // trusting client-supplied numbers) and just read different fields off the result.
  // Not private: reused as-is by BusinessService's Facebook/Instagram connect
  // methods (this call has no creator-specific data, it just needs any valid token).
  async fetchFacebookPages(accessToken: string): Promise<FacebookPageRaw[]> {
    const url =
      'https://graph.facebook.com/me/accounts' +
      '?fields=id,name,fan_count,link,access_token,picture{url},instagram_business_account{id,username,followers_count,profile_picture_url}' +
      `&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    const data = (await res.json()) as FacebookPagesResponse;
    if (!res.ok || data.error) {
      logger.error({ status: res.status, error: data.error }, 'Facebook Pages request failed');
      if (res.status === 401 || data.error?.code === 190) {
        throw new AppError(getDict().creator.facebookSessionExpired, HttpStatus.UNAUTHORIZED);
      }
      throw new AppError(data.error?.message ?? getDict().creator.couldNotReachFacebook, HttpStatus.BAD_GATEWAY);
    }
    return data.data ?? [];
  }

  // Lists the Pages the creator manages so the app can prompt them to pick one when
  // there's more than one (auto-selected on the client when there's exactly one).
  async listFacebookPages(accessToken: string): Promise<FacebookPageOption[]> {
    const pages = await this.fetchFacebookPages(accessToken);
    return pages.map((p) => ({
      id: p.id,
      name: p.name,
      fanCount: p.fan_count ?? 0,
      picture: p.picture?.data?.url,
      hasInstagram: !!p.instagram_business_account,
      instagramUsername: p.instagram_business_account?.username,
    }));
  }

  async connectFacebookPage(userId: string, accessToken: string, pageId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    // Exchange the client's short-lived (~2h) token for a long-lived one first —
    // the Page token that comes back from fetchFacebookPages() below inherits that
    // long lifetime, which is what lets the follower count keep auto-refreshing
    // for months instead of going stale within a couple of hours.
    const longLivedToken = await exchangeForLongLivedFacebookToken(accessToken);
    const pages = await this.fetchFacebookPages(longLivedToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError(getDict().creator.facebookPageNotFound, HttpStatus.NOT_FOUND);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'facebook', {
      profileUrl: page.link ?? `https://www.facebook.com/${page.id}`,
      followers: page.fan_count ?? 0,
      platformUserId: page.id,
      avatarUrl: page.picture?.data?.url,
      accessToken: page.access_token,
      oauthConnectionType: 'facebook_page',
    });
    return toSocialAccountDto(account);
  }

  async connectInstagramAccount(userId: string, accessToken: string, pageId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const longLivedToken = await exchangeForLongLivedFacebookToken(accessToken);
    const pages = await this.fetchFacebookPages(longLivedToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError(getDict().creator.facebookPageNotFound, HttpStatus.NOT_FOUND);

    const ig = page.instagram_business_account;
    if (!ig) throw new AppError(getDict().creator.instagramNoLinkedBusinessAccount, HttpStatus.NOT_FOUND);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'instagram', {
      profileUrl: ig.username ? `https://www.instagram.com/${ig.username}` : 'https://www.instagram.com/',
      followers: ig.followers_count ?? 0,
      platformUserId: ig.id,
      avatarUrl: ig.profile_picture_url,
      // The linked Page's own (long-lived) token also has access to its Instagram
      // Business Account's fields — reused here so refreshing later doesn't need
      // to re-list all of the creator's Pages, just query this one IG node directly.
      accessToken: page.access_token,
      oauthConnectionType: 'facebook_page',
    });
    return toSocialAccountDto(account);
  }

  // ── Instagram API with Instagram Login — connects directly against instagram.com,
  // no Facebook account or Page required, for creators who only have Instagram. Like
  // TikTok, Instagram's token endpoint requires our app's client secret (no PKCE
  // alternative for public clients), so the code exchange happens here rather than
  // on-device — the mobile app opens the authorize URL in a browser and Instagram's
  // redirect lands on our API, which then 302s back into the app via the kolab://
  // scheme once the exchange + save is done. See fetchFacebookPages/connectInstagramAccount
  // above for the OTHER Instagram path (via a linked Facebook Page).
  async getInstagramLoginAuthorizeUrl(userId: string, role: 'CREATOR' | 'BUSINESS' = 'CREATOR'): Promise<string> {
    if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_REDIRECT_URI) {
      throw new AppError(getDict().creator.instagramLoginNotConfigured, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    // Same single-registered-redirect-URI reasoning as getTiktokAuthorizeUrl above.
    const state = await signOAuthState({ userId, role });

    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.searchParams.set('client_id', env.INSTAGRAM_APP_ID);
    // instagram_business_basic is the minimum scope needed to read account_type,
    // username and followers_count — requesting more makes Instagram reject an
    // otherwise-unconfigured scope on the app.
    url.searchParams.set('scope', 'instagram_business_basic');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', env.INSTAGRAM_REDIRECT_URI);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async handleInstagramLoginCallback(code: string, state: string) {
    let statePayload: Awaited<ReturnType<typeof verifyOAuthState>>;
    try {
      statePayload = await verifyOAuthState(state);
    } catch (err) {
      logger.warn({ err }, 'Instagram OAuth state verification failed');
      throw new AppError(getDict().creator.instagramAuthorizationExpired, HttpStatus.BAD_REQUEST);
    }
    const { userId, role } = statePayload;

    const isBusiness = role === 'BUSINESS';
    const profile = isBusiness ? await this.businessRepo.findByUserId(userId) : await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.profileNotFoundForRole(isBusiness), HttpStatus.NOT_FOUND);

    // Step 1: exchange the authorization code for a short-lived access token.
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.INSTAGRAM_APP_ID!,
        client_secret: env.INSTAGRAM_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: env.INSTAGRAM_REDIRECT_URI!,
        code,
      }),
    });
    const tokenData = (await tokenRes.json()) as InstagramTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error({ status: tokenRes.status, tokenData }, 'Instagram token exchange failed');
      throw new AppError(tokenData.error_message ?? getDict().creator.couldNotConnectInstagramAccount, HttpStatus.BAD_GATEWAY);
    }

    // Step 2: exchange for a long-lived token (60 days) so the connection doesn't
    // silently expire after the short-lived token's 1 hour.
    const longLivedUrl =
      'https://graph.instagram.com/access_token' +
      '?grant_type=ig_exchange_token' +
      `&client_secret=${encodeURIComponent(env.INSTAGRAM_APP_SECRET!)}` +
      `&access_token=${encodeURIComponent(tokenData.access_token)}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = (await longLivedRes.json()) as InstagramLongLivedTokenResponse;
    const accessToken = longLivedRes.ok && longLivedData.access_token ? longLivedData.access_token : tokenData.access_token;

    // Step 3: read the profile — account_type is what tells us whether this is a
    // Business/Creator account (the only kind Instagram exposes followers_count for)
    // or a Personal account (which must be rejected with a clear next step).
    const meUrl =
      'https://graph.instagram.com/me' +
      '?fields=id,username,account_type,followers_count,profile_picture_url' +
      `&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    const me = (await meRes.json()) as InstagramMeResponse;
    if (!meRes.ok || me.error) {
      logger.error({ status: meRes.status, error: me.error }, 'Instagram profile request failed');
      throw new AppError(me.error?.message ?? getDict().creator.couldNotReadInstagramProfile, HttpStatus.BAD_GATEWAY);
    }
    if (me.account_type === 'PERSONAL' || !me.account_type) {
      throw new AppError(
        getDict().creator.instagramMustBeBusinessAccount,
        HttpStatus.BAD_REQUEST,
      );
    }

    const instagramData = {
      profileUrl: me.username ? `https://www.instagram.com/${me.username}` : 'https://www.instagram.com/',
      followers: me.followers_count ?? 0,
      platformUserId: me.id ?? profile.id,
      avatarUrl: me.profile_picture_url,
      accessToken,
      tokenExpiresAt: longLivedRes.ok && longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000)
        : undefined,
      oauthConnectionType: 'instagram_direct',
    };
    const account = isBusiness
      ? await this.businessRepo.upsertOAuthSocialAccount(profile.id, 'instagram', instagramData)
      : await this.repo.upsertOAuthSocialAccount(profile.id, 'instagram', instagramData);
    return toSocialAccountDto(account);
  }

  // ── Automatic refresh: per-platform implementations ─────────────────────────
  // Each takes the account's stored token (refreshing it first if it's stale) and
  // returns just the new follower count + whatever token fields changed. Called
  // only from refreshOneAccountFollowers below — never directly.

  private async refreshYoutubeFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    let accessToken = account.accessToken!;
    if (isTokenStaleOrExpired(account.tokenExpiresAt) && account.refreshToken) {
      const { clientId, clientSecret } = resolveGoogleRefreshCredentials(account.oauthConnectionType);
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = (await refreshRes.json()) as { access_token?: string; expires_in?: number };
      if (!refreshRes.ok || !refreshData.access_token) {
        throw new AppError('Google refresh token is no longer valid — please reconnect', HttpStatus.UNAUTHORIZED);
      }
      accessToken = refreshData.access_token;
      return {
        followers: await fetchYoutubeSubscriberCount(accessToken),
        accessToken,
        tokenExpiresAt: refreshData.expires_in ? new Date(Date.now() + refreshData.expires_in * 1000) : undefined,
      };
    }
    return { followers: await fetchYoutubeSubscriberCount(accessToken) };
  }

  // Facebook Page tokens derived from a long-lived user token don't have a simple
  // refresh call the way YouTube/TikTok do — they stay valid (per Meta's docs)
  // until the underlying user token itself lapses or access is revoked, so this
  // just re-queries the Page directly rather than re-listing all of the creator's
  // Pages again.
  private async refreshFacebookFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    const url = `https://graph.facebook.com/${account.platformUserId}?fields=fan_count&access_token=${encodeURIComponent(account.accessToken!)}`;
    const res = await fetch(url);
    const data = (await res.json()) as { fan_count?: number; error?: { message?: string; code?: number } };
    if (!res.ok || data.error) {
      if (res.status === 401 || data.error?.code === 190) throw new AppError('Facebook session expired — please reconnect', HttpStatus.UNAUTHORIZED);
      throw new AppError(data.error?.message ?? 'Could not refresh Facebook follower count', HttpStatus.BAD_GATEWAY);
    }
    return { followers: data.fan_count ?? 0 };
  }

  // Same reasoning as refreshFacebookFollowers — queries the Instagram Business
  // Account node directly using its linked Page's (long-lived) token.
  private async refreshInstagramViaPageFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    const url = `https://graph.facebook.com/${account.platformUserId}?fields=followers_count&access_token=${encodeURIComponent(account.accessToken!)}`;
    const res = await fetch(url);
    const data = (await res.json()) as { followers_count?: number; error?: { message?: string; code?: number } };
    if (!res.ok || data.error) {
      if (res.status === 401 || data.error?.code === 190) throw new AppError('Facebook session expired — please reconnect', HttpStatus.UNAUTHORIZED);
      throw new AppError(data.error?.message ?? 'Could not refresh Instagram follower count', HttpStatus.BAD_GATEWAY);
    }
    return { followers: data.followers_count ?? 0 };
  }

  private async refreshInstagramDirectFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    let accessToken = account.accessToken!;
    let refreshedExpiry: Date | undefined;
    // Instagram's long-lived token has to be refreshed before it expires (it must
    // already be at least 24h old) — done a little early here since this only runs
    // every few hours anyway.
    if (isTokenStaleOrExpired(account.tokenExpiresAt)) {
      const refreshUrl =
        'https://graph.instagram.com/refresh_access_token' +
        '?grant_type=ig_refresh_token' +
        `&access_token=${encodeURIComponent(accessToken)}`;
      const refreshRes = await fetch(refreshUrl);
      const refreshData = (await refreshRes.json()) as { access_token?: string; expires_in?: number };
      if (refreshRes.ok && refreshData.access_token) {
        accessToken = refreshData.access_token;
        refreshedExpiry = refreshData.expires_in ? new Date(Date.now() + refreshData.expires_in * 1000) : undefined;
      }
      // If the refresh call itself fails, fall through and try the existing token
      // anyway — it may still have a little life left, and bailing out here would
      // drop the account out of rotation for no reason.
    }

    const meUrl = `https://graph.instagram.com/me?fields=followers_count&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    const me = (await meRes.json()) as InstagramMeResponse;
    if (!meRes.ok || me.error) {
      throw new AppError(me.error?.message ?? 'Could not refresh Instagram follower count', HttpStatus.BAD_GATEWAY);
    }
    return {
      followers: me.followers_count ?? 0,
      accessToken: accessToken !== account.accessToken ? accessToken : undefined,
      tokenExpiresAt: refreshedExpiry,
    };
  }

  // Follower count stays 0 until the app's user.info.stats scope passes TikTok's
  // review (see CONNECTABLE_SOCIAL_PLATFORMS comment on the mobile side) — still
  // worth running so the access/refresh token pair gets exercised regularly and is
  // ready to go the moment that scope is approved.
  private async refreshTiktokFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    let accessToken = account.accessToken!;
    let newRefreshToken: string | undefined;
    let newExpiry: Date | undefined;
    if (isTokenStaleOrExpired(account.tokenExpiresAt) && account.refreshToken) {
      const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
        body: new URLSearchParams({
          client_key: env.TIKTOK_CLIENT_KEY ?? '',
          client_secret: env.TIKTOK_CLIENT_SECRET ?? '',
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
        }),
      });
      const refreshData = (await refreshRes.json()) as TiktokTokenResponse;
      if (!refreshRes.ok || !refreshData.access_token) {
        throw new AppError('TikTok refresh token is no longer valid — please reconnect', HttpStatus.UNAUTHORIZED);
      }
      accessToken = refreshData.access_token;
      newRefreshToken = refreshData.refresh_token;
      newExpiry = refreshData.expires_in ? new Date(Date.now() + refreshData.expires_in * 1000) : undefined;
    }
    const infoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const infoData = (await infoRes.json()) as TiktokUserInfoResponse;
    if (!infoRes.ok || !infoData.data?.user) {
      throw new AppError('Could not refresh TikTok profile', HttpStatus.BAD_GATEWAY);
    }
    return {
      followers: 0,
      accessToken: newRefreshToken ? accessToken : undefined,
      refreshToken: newRefreshToken,
      tokenExpiresAt: newExpiry,
    };
  }

  private async refreshOneAccountFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    if (!account.accessToken) throw new AppError('No stored token for this account', HttpStatus.BAD_REQUEST);
    switch (account.platform) {
      case 'youtube':   return this.refreshYoutubeFollowers(account);
      case 'facebook':  return this.refreshFacebookFollowers(account);
      case 'instagram':
        return account.oauthConnectionType === 'instagram_direct'
          ? this.refreshInstagramDirectFollowers(account)
          : this.refreshInstagramViaPageFollowers(account);
      case 'tiktok':    return this.refreshTiktokFollowers(account);
      default: throw new AppError(`No refresh handler for platform ${account.platform}`, HttpStatus.BAD_REQUEST);
    }
  }

  private async applyRefreshResult(accountId: string, result: RefreshResult) {
    await this.repo.updateFollowerSync(accountId, {
      followers: result.followers,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenExpiresAt: result.tokenExpiresAt,
    });
  }

  // Runs across every OAuth-connected account, for every creator — this is the
  // scheduled job's entry point (jobs/refreshSocialFollowers.ts). One account
  // failing (expired token, platform outage, etc.) never stops the batch; it's
  // just logged and skipped so it can be picked up again next run.
  async refreshAllSocialAccountFollowers(): Promise<{ refreshed: number; failed: number }> {
    const accounts = await this.repo.findAllRefreshableSocialAccounts();
    let refreshed = 0;
    let failed = 0;
    for (const account of accounts) {
      try {
        const result = await this.refreshOneAccountFollowers(account);
        await this.applyRefreshResult(account.id, result);
        refreshed++;
      } catch (err) {
        logger.error({ err, accountId: account.id, platform: account.platform }, 'Social account follower refresh failed');
        failed++;
      }
    }
    return { refreshed, failed };
  }

  // Silently tops up any of THIS creator's connected accounts that haven't synced
  // in a while — fired (never awaited by the caller) whenever their Social Accounts
  // screen loads, so the numbers stay current between scheduled runs without the
  // creator ever needing to tap anything. Fire-and-forget by design: failures here
  // are logged, not surfaced, since the creator didn't take any action to trigger it.
  async refreshStaleSocialAccountsForCreator(creatorProfileId: string): Promise<void> {
    const staleBefore = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const stale = await this.repo.findStaleSocialAccounts(creatorProfileId, staleBefore);
    await this.refreshStaleAccountsBatch(stale);
  }

  // Same silent top-up, generalized to any list of rows regardless of which profile
  // owns them — reused by BusinessService for a business's own stale accounts, since
  // the per-platform refresh logic above needs nothing creator-specific to run.
  async refreshStaleAccountsBatch(accounts: RawSocialAccountRow[]): Promise<void> {
    for (const account of accounts) {
      try {
        const result = await this.refreshOneAccountFollowers(account);
        await this.applyRefreshResult(account.id, result);
      } catch (err) {
        logger.error({ err, accountId: account.id, platform: account.platform }, 'Silent social account refresh failed');
      }
    }
  }

  // ── Payment Methods ────────────────────────────────────────────────────────

  async updatePaymentMethods(userId: string, input: UpdatePaymentMethodsInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    if (input.methods.length) {
      const methods = await this.paymentMethodRepo.findManyPublic();
      const validKeys = new Set(methods.map((m) => m.key));
      const invalid = input.methods.filter((m) => !validKeys.has(m));
      if (invalid.length) throw new AppError(getDict().creator.invalidPaymentMethods(invalid.join(', ')), HttpStatus.BAD_REQUEST);
    }

    return toCreatorProfileDto(await this.repo.updatePaymentMethods(userId, input.methods));
  }

  // ── Campaign Preferences ────────────────────────────────────────────────────

  async updateCampaignPrefs(userId: string, input: UpdateCampaignPrefsInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    if (input.prefPlatforms?.length) {
      const platforms = await this.platformRepo.findManyPublic();
      const validNames = new Set(platforms.map((p) => p.name));
      const invalid = input.prefPlatforms.filter((p) => !validNames.has(p));
      if (invalid.length) throw new AppError(getDict().creator.invalidPlatforms(invalid.join(', ')), HttpStatus.BAD_REQUEST);
    }

    return toCreatorProfileDto(await this.repo.updateCampaignPrefs(userId, input));
  }

  // ── Earnings Summary ───────────────────────────────────────────────────────

  async getEarningsSummary(userId: string) {
    return this.repo.getEarningsSummary(userId);
  }

  // ── Availability (§16) ──────────────────────────────────────────────────────

  async updateAvailabilityStatus(userId: string, input: UpdateAvailabilityStatusInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return toCreatorProfileDto(await this.repo.updateAvailabilityStatus(userId, input.status));
  }

  async getAvailabilitySchedule(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.getAvailabilitySchedule(profile.id);
  }

  async updateAvailabilitySchedule(userId: string, input: UpdateAvailabilityScheduleInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    await this.repo.replaceAvailabilitySchedule(profile.id, input.days);
    return this.repo.getAvailabilitySchedule(profile.id);
  }

  // ── Invitations (§50) ────────────────────────────────────────────────────────
  // NOTE: responding ACCEPTED only flips CampaignInvitation.status today — it
  // does not create an Application. Deliberately left this way: wiring
  // accept -> Application would require deciding what proposedRate/timeline
  // to default to for a deal that skipped the normal proposal step, and that's
  // a product decision, not a schema/plumbing one. Until that's decided, an
  // accepted invitation surfaces as "accepted" but the business must still
  // separately select the creator on the campaign to start a real collaboration.

  async listInvitations(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.findInvitations(profile.id);
  }

  async respondToInvitation(userId: string, invitationId: string, input: RespondToInvitationInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().creator.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const invitation = await this.repo.findInvitationById(invitationId);
    if (!invitation) throw new AppError(getDict().creator.invitationNotFound, HttpStatus.NOT_FOUND);
    if (invitation.creatorId !== profile.id) throw new AppError(getDict().creator.notAuthorizedToRespondToInvitation, HttpStatus.FORBIDDEN);
    if (invitation.status !== 'PENDING') throw new AppError(getDict().creator.invitationAlreadyResponded, HttpStatus.CONFLICT);

    const updated = await this.repo.respondToInvitation(invitationId, input.status);

    notificationService.create({
      userId: invitation.business.userId,
      type: 'invitation_response',
      title: input.status === 'ACCEPTED'
        ? `${profile.fullName ?? 'A creator'} accepted your invitation`
        : `${profile.fullName ?? 'A creator'} declined your invitation`,
      body: invitation.campaign.title,
      refId: invitation.campaignId,
      refType: 'campaign',
    }).catch(() => {});

    return updated;
  }
}
