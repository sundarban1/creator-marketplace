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

interface FacebookPageRaw {
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

export class CreatorService {
  private repo: CreatorRepository;
  private businessRepo: BusinessRepository;

  constructor() {
    this.repo = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
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
    limit?: number;
    lang?: string;
  }) {
    const limit = Math.min(params.limit ?? 10, 20);
    const candidates = await this.repo.findRecommended(params.category);

    const ranked = candidates
      .map((c) => ({
        ...c,
        distanceKm:
          params.lat != null && params.lng != null && c.locationLat != null && c.locationLng != null
            ? haversineKm(params.lat, params.lng, c.locationLat, c.locationLng)
            : undefined,
      }))
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      })
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
    return accounts.map(toSocialAccountDto);
  }

  async addSocialAccount(userId: string, input: AddSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

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
  async connectYoutubeAccount(userId: string, accessToken: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

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

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'youtube', {
      profileUrl,
      followers,
      platformUserId: channel.id,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
    });
    return toSocialAccountDto(account);
  }

  // TikTok's OAuth requires an HTTPS redirect URI verified in the Developer Portal —
  // no custom app-scheme redirects like Google/Facebook — so the code exchange has to
  // happen here on the backend rather than on-device. The mobile app opens this URL in
  // a browser; TikTok redirects back to our /callback route (below), which then 302s
  // into the app via the custom scheme once the exchange + save is done.
  getTiktokAuthorizeUrl(userId: string): string {
    if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_REDIRECT_URI) {
      throw new AppError('TikTok login is not configured', 500);
    }
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const state = signOAuthState({ userId, codeVerifier });

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
    let statePayload: { userId: string; codeVerifier: string };
    try {
      statePayload = verifyOAuthState(state);
    } catch {
      throw new AppError('TikTok authorization expired — please try again', 400);
    }
    const { userId, codeVerifier } = statePayload;

    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

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

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'tiktok', {
      profileUrl,
      followers: 0,
      platformUserId: tiktokUser.open_id ?? profile.id,
      avatarUrl: tiktokUser.avatar_url,
    });
    return toSocialAccountDto(account);
  }

  // Facebook only exposes follower/fan counts for Pages, never personal profiles, and
  // an Instagram Business/Creator account's stats are only reachable by first finding
  // the Facebook Page it's linked to — so both "Connect Facebook" and "Connect
  // Instagram" share this one Graph API call (fetched fresh each time rather than
  // trusting client-supplied numbers) and just read different fields off the result.
  private async fetchFacebookPages(accessToken: string): Promise<FacebookPageRaw[]> {
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

    const pages = await this.fetchFacebookPages(accessToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError('Facebook Page not found — please reconnect and try again', 404);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'facebook', {
      profileUrl: page.link ?? `https://www.facebook.com/${page.id}`,
      followers: page.fan_count ?? 0,
      platformUserId: page.id,
      avatarUrl: page.picture?.data?.url,
    });
    return toSocialAccountDto(account);
  }

  async connectInstagramAccount(userId: string, accessToken: string, pageId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const pages = await this.fetchFacebookPages(accessToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError('Facebook Page not found — please reconnect and try again', 404);

    const ig = page.instagram_business_account;
    if (!ig) throw new AppError('This Facebook Page has no linked Instagram Business account', 404);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'instagram', {
      profileUrl: ig.username ? `https://www.instagram.com/${ig.username}` : 'https://www.instagram.com/',
      followers: ig.followers_count ?? 0,
      platformUserId: ig.id,
      avatarUrl: ig.profile_picture_url,
    });
    return toSocialAccountDto(account);
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
    return toCreatorProfileDto(await this.repo.updateCampaignPrefs(userId, input));
  }

  // ── Earnings Summary ───────────────────────────────────────────────────────

  async getEarningsSummary(userId: string) {
    return this.repo.getEarningsSummary(userId);
  }
}
