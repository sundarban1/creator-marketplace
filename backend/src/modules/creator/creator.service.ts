import { randomUUID, randomBytes, createHash } from 'crypto';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { signOAuthState, verifyOAuthState } from '../../utils/jwt';
import { toCreatorProfileDto, toPublicCreatorDto, toCreatorListItemDto, toSocialAccountDto } from './creator.dto';
import { translateFields, translateMany } from '../../utils/translation';
import { haversineKm } from '../../utils/geo';

const CREATOR_FIELDS = ['bio', 'location', 'categories'] as const;
import { CreatorRepository } from './creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { PlatformRepository } from '../platform/platform.repository';
import { analyticsService } from '../analytics/analytics.service';
import type {
  UpdateCreatorProfileInput,
  AddPortfolioLinkInput,
  UpdateSocialLinksInput,
  AddSocialAccountInput,
  UpdateSocialAccountInput,
  UpdatePaymentMethodsInput,
  UpdateCampaignPrefsInput,
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

async function fetchYoutubeSubscriberCount(accessToken: string): Promise<number> {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new AppError(`Could not refresh YouTube subscriber count (${res.status})`, 502);
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

    if (res.status === 401) throw new AppError('Google session expired — please reconnect', 401);
    if (reason === 'accessNotConfigured') {
      throw new AppError('YouTube Data API v3 is not enabled for this app yet — enable it in Google Cloud Console and try again', 502);
    }
    if (res.status === 403) {
      throw new AppError('Google denied access to YouTube data — check the youtube.readonly scope is added to the OAuth consent screen', 403);
    }
    throw new AppError(`Could not reach YouTube (${res.status})`, 502);
  }
  const data = (await res.json()) as YoutubeChannelResponse;
  const channel = data.items?.[0];
  if (!channel) throw new AppError('No YouTube channel found for this Google account', 404);

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
// as harshly as one with an actually-bad track record.
const RECOMMEND_WEIGHTS = { followers: 0.25, completion: 0.3, rating: 0.2, proximity: 0.15, rate: 0.1 };

function scoreCandidate(
  c: { topFollowers: number; completionRate?: number; averageRating?: number; distanceKm?: number; prefBudgetMin: number; prefBudgetMax: number },
  params: { budgetMin?: number; budgetMax?: number },
): number {
  const followerScore = Math.min(c.topFollowers / 100_000, 1);
  const completionScore = c.completionRate ?? 0.5;
  const ratingScore = c.averageRating != null ? c.averageRating / 5 : 0.5;
  const proximityScore = c.distanceKm != null ? Math.max(0, 1 - c.distanceKm / 50) : 0.5;
  const rateScore = params.budgetMin != null && params.budgetMax != null
    ? (c.prefBudgetMax >= params.budgetMin && c.prefBudgetMin <= params.budgetMax ? 1 : 0.3)
    : 0.5;

  return (
    followerScore   * RECOMMEND_WEIGHTS.followers +
    completionScore * RECOMMEND_WEIGHTS.completion +
    ratingScore      * RECOMMEND_WEIGHTS.rating +
    proximityScore   * RECOMMEND_WEIGHTS.proximity +
    rateScore        * RECOMMEND_WEIGHTS.rate
  );
}

export class CreatorService {
  private repo: CreatorRepository;
  private businessRepo: BusinessRepository;
  private platformRepo: PlatformRepository;

  constructor() {
    this.repo = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
    this.platformRepo = new PlatformRepository();
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
    lang?: string;
  }) {
    const { page, limit, search, categories, location, platforms, priceMin, priceMax, lang = 'en' } = params;
    const { creators: raw, total } = await this.repo.findMany({
      page, limit: Math.min(limit, 20),
      search, categories, location, platforms, priceMin, priceMax,
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
    limit?: number;
    lang?: string;
  }) {
    const limit = Math.min(params.limit ?? 10, 20);
    const candidates = await this.repo.findRecommended(params.category);
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
        const topFollowers = c.socialAccounts.reduce((max, a) => Math.max(max, a.followers), 0);

        return { ...c, distanceKm, completionRate, averageRating, topFollowers };
      })
      .sort((a, b) => scoreCandidate(b, params) - scoreCandidate(a, params))
      .slice(0, limit);

    const dtos = ranked.map(toCreatorListItemDto);
    return translateMany(dtos, [...CREATOR_FIELDS], params.lang ?? 'en');
  }

  async getCreatorPublicProfile(creatorId: string, lang = 'en', viewerUserId?: string) {
    const profile = await this.repo.findByIdPublic(creatorId);
    if (!profile) throw new AppError('Creator not found', 404);

    // Fire-and-forget — only authenticated brands reach this route at all
    // (business.routes.ts gates the whole file on authorize('BUSINESS')), so
    // the "ignore own profile"/"authenticated brands only" PRD rules are
    // already satisfied by the route itself.
    if (viewerUserId) {
      this.businessRepo.findByUserId(viewerUserId).then((business) => {
        if (business) analyticsService.recordProfileView(profile.id, business.id, profile.userId);
      }).catch(() => {});
    }

    const dto = toPublicCreatorDto(profile);
    const translated = await translateFields(dto, [...CREATOR_FIELDS], lang);
    const stats = await analyticsService.getCreatorPublicStats(profile.userId).catch(() => null);
    return { ...translated, stats };
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
    if (!profile) throw new AppError('Creator profile not found', 404);
    return toCreatorProfileDto(profile);
  }

  async updateProfile(userId: string, input: UpdateCreatorProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    // Enforce username uniqueness (only if changing)
    if (input.username && input.username !== profile.username) {
      const taken = await this.repo.findByUsername(input.username);
      if (taken) throw new AppError('This username is already taken', 409);
    }

    return toCreatorProfileDto(await this.repo.update(userId, input));
  }

  async uploadCitizenship(userId: string, docUrl: string) {
    return toCreatorProfileDto(await this.repo.updateCitizenship(userId, docUrl));
  }

  async addPortfolioLink(userId: string, input: AddPortfolioLinkInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    const newLink = { id: randomUUID(), label: input.label, url: input.url };
    return toCreatorProfileDto(await this.repo.addPortfolioLink(userId, newLink, currentLinks));
  }

  async removePortfolioLink(userId: string, linkId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    if (!currentLinks.some((l) => l.id === linkId)) throw new AppError('Portfolio link not found', 404);
    return toCreatorProfileDto(await this.repo.removePortfolioLink(userId, linkId, currentLinks));
  }

  async updateSocialLinks(userId: string, input: UpdateSocialLinksInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

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
    if (!profile) throw new AppError('Creator profile not found', 404);

    const platforms = await this.platformRepo.findManyPublic();
    if (!platforms.some((p) => p.key === input.platform)) throw new AppError('Invalid platform', 400);

    const existing = await this.repo.findSocialAccountByPlatform(profile.id, input.platform);
    if (existing) throw new AppError(`${input.platform} account is already added`, 409);

    return toSocialAccountDto(await this.repo.addSocialAccount(profile.id, input));
  }

  async updateSocialAccount(userId: string, accountId: string, input: UpdateSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError('Social account not found', 404);

    return toSocialAccountDto(await this.repo.updateSocialAccount(accountId, input));
  }

  async deleteSocialAccount(userId: string, accountId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError('Social account not found', 404);

    await this.repo.deleteSocialAccount(accountId);
  }

  // Exchanges a Google access token (obtained client-side with the youtube.readonly
  // scope) for the creator's own channel data, and saves it — no manual URL/follower
  // entry needed. Safe to call again later to refresh the subscriber count.
  // refreshToken/expiresIn are only present when Google actually issued a refresh
  // token (first-time consent with access_type=offline) — when present, they're
  // persisted so refreshYoutubeFollowers can keep the subscriber count current on
  // its own long after this access token expires, with no reconnect needed.
  async connectYoutubeAccount(userId: string, accessToken: string, refreshToken?: string, expiresIn?: number) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const channel = await fetchYoutubeChannel(accessToken);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'youtube', {
      profileUrl: channel.profileUrl,
      followers: channel.followers,
      platformUserId: channel.channelId,
      avatarUrl: channel.avatarUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      oauthConnectionType: 'google',
    });
    return toSocialAccountDto(account);
  }

  // TikTok's OAuth requires an HTTPS redirect URI verified in the Developer Portal —
  // no custom app-scheme redirects like Google/Facebook — so the code exchange has to
  // happen here on the backend rather than on-device. The mobile app opens this URL in
  // a browser; TikTok redirects back to our /callback route (below), which then 302s
  // into the app via the custom scheme once the exchange + save is done.
  getTiktokAuthorizeUrl(userId: string, role: 'CREATOR' | 'BUSINESS' = 'CREATOR'): string {
    if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_REDIRECT_URI) {
      throw new AppError('TikTok login is not configured', 500);
    }
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    // redirect_uri below always points at this same backend route regardless of
    // role — TikTok's Developer Portal only has one registered redirect URI, so the
    // business flow reuses it and the callback below tells the two apart via `role`.
    const state = signOAuthState({ userId, codeVerifier, role });

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
    let statePayload: ReturnType<typeof verifyOAuthState>;
    try {
      statePayload = verifyOAuthState(state);
    } catch {
      throw new AppError('TikTok authorization expired — please try again', 400);
    }
    const { userId, codeVerifier, role } = statePayload;
    if (!codeVerifier) throw new AppError('TikTok authorization expired — please try again', 400);

    const isBusiness = role === 'BUSINESS';
    const profile = isBusiness ? await this.businessRepo.findByUserId(userId) : await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(`${isBusiness ? 'Business' : 'Creator'} profile not found`, 404);

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
      throw new AppError(tokenData.error_description ?? 'Could not connect TikTok account', 502);
    }

    const infoRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const infoData = (await infoRes.json()) as TiktokUserInfoResponse;
    const tiktokUser = infoData.data?.user;
    if (!infoRes.ok || !tiktokUser) {
      logger.error({ status: infoRes.status, infoData }, 'TikTok user info request failed');
      throw new AppError('Could not read TikTok profile', 502);
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
        throw new AppError('Facebook session expired — please reconnect', 401);
      }
      throw new AppError(data.error?.message ?? 'Could not reach Facebook', 502);
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
    if (!profile) throw new AppError('Creator profile not found', 404);

    // Exchange the client's short-lived (~2h) token for a long-lived one first —
    // the Page token that comes back from fetchFacebookPages() below inherits that
    // long lifetime, which is what lets the follower count keep auto-refreshing
    // for months instead of going stale within a couple of hours.
    const longLivedToken = await exchangeForLongLivedFacebookToken(accessToken);
    const pages = await this.fetchFacebookPages(longLivedToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError('Facebook Page not found — please reconnect and try again', 404);

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
    if (!profile) throw new AppError('Creator profile not found', 404);

    const longLivedToken = await exchangeForLongLivedFacebookToken(accessToken);
    const pages = await this.fetchFacebookPages(longLivedToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError('Facebook Page not found — please reconnect and try again', 404);

    const ig = page.instagram_business_account;
    if (!ig) throw new AppError('This Facebook Page has no linked Instagram Business account', 404);

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
  getInstagramLoginAuthorizeUrl(userId: string, role: 'CREATOR' | 'BUSINESS' = 'CREATOR'): string {
    if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_REDIRECT_URI) {
      throw new AppError('Instagram direct login is not configured', 500);
    }
    // Same single-registered-redirect-URI reasoning as getTiktokAuthorizeUrl above.
    const state = signOAuthState({ userId, role });

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
    let statePayload: ReturnType<typeof verifyOAuthState>;
    try {
      statePayload = verifyOAuthState(state);
    } catch {
      throw new AppError('Instagram authorization expired — please try again', 400);
    }
    const { userId, role } = statePayload;

    const isBusiness = role === 'BUSINESS';
    const profile = isBusiness ? await this.businessRepo.findByUserId(userId) : await this.repo.findByUserId(userId);
    if (!profile) throw new AppError(`${isBusiness ? 'Business' : 'Creator'} profile not found`, 404);

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
      throw new AppError(tokenData.error_message ?? 'Could not connect Instagram account', 502);
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
      throw new AppError(me.error?.message ?? 'Could not read Instagram profile', 502);
    }
    if (me.account_type === 'PERSONAL' || !me.account_type) {
      throw new AppError(
        'Your Instagram account must be a Business or Creator account to connect. Open Instagram, go to Settings > Account type and tools > Switch account type, choose Business or Creator, then try again.',
        400,
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
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.GOOGLE_WEB_CLIENT_ID ?? '',
          client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const refreshData = (await refreshRes.json()) as { access_token?: string; expires_in?: number };
      if (!refreshRes.ok || !refreshData.access_token) {
        throw new AppError('Google refresh token is no longer valid — please reconnect', 401);
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
      if (res.status === 401 || data.error?.code === 190) throw new AppError('Facebook session expired — please reconnect', 401);
      throw new AppError(data.error?.message ?? 'Could not refresh Facebook follower count', 502);
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
      if (res.status === 401 || data.error?.code === 190) throw new AppError('Facebook session expired — please reconnect', 401);
      throw new AppError(data.error?.message ?? 'Could not refresh Instagram follower count', 502);
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
      throw new AppError(me.error?.message ?? 'Could not refresh Instagram follower count', 502);
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
        throw new AppError('TikTok refresh token is no longer valid — please reconnect', 401);
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
      throw new AppError('Could not refresh TikTok profile', 502);
    }
    return {
      followers: 0,
      accessToken: newRefreshToken ? accessToken : undefined,
      refreshToken: newRefreshToken,
      tokenExpiresAt: newExpiry,
    };
  }

  private async refreshOneAccountFollowers(account: RawSocialAccountRow): Promise<RefreshResult> {
    if (!account.accessToken) throw new AppError('No stored token for this account', 400);
    switch (account.platform) {
      case 'youtube':   return this.refreshYoutubeFollowers(account);
      case 'facebook':  return this.refreshFacebookFollowers(account);
      case 'instagram':
        return account.oauthConnectionType === 'instagram_direct'
          ? this.refreshInstagramDirectFollowers(account)
          : this.refreshInstagramViaPageFollowers(account);
      case 'tiktok':    return this.refreshTiktokFollowers(account);
      default: throw new AppError(`No refresh handler for platform ${account.platform}`, 400);
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
    if (!profile) throw new AppError('Creator profile not found', 404);
    return toCreatorProfileDto(await this.repo.updatePaymentMethods(userId, input.methods));
  }

  // ── Campaign Preferences ────────────────────────────────────────────────────

  async updateCampaignPrefs(userId: string, input: UpdateCampaignPrefsInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    if (input.prefPlatforms?.length) {
      const platforms = await this.platformRepo.findManyPublic();
      const validNames = new Set(platforms.map((p) => p.name));
      const invalid = input.prefPlatforms.filter((p) => !validNames.has(p));
      if (invalid.length) throw new AppError(`Invalid platform(s): ${invalid.join(', ')}`, 400);
    }

    return toCreatorProfileDto(await this.repo.updateCampaignPrefs(userId, input));
  }

  // ── Earnings Summary ───────────────────────────────────────────────────────

  async getEarningsSummary(userId: string) {
    return this.repo.getEarningsSummary(userId);
  }
}
