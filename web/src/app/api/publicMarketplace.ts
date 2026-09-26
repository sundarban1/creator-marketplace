/**
 * Typed client for the public (unauthenticated) marketplace endpoints
 * (`GET /api/public/creators*`, `GET /api/public/events*`). Shapes mirror the
 * backend DTOs — keep them in sync.
 */

import { apiRequest, type ApiPagination } from '../lib/apiClient';
import type { PublicCreatorLite, PublicBusinessLite } from '../../lib/api';

// ── Creators ─────────────────────────────────────────────────────────────────

export interface SocialAccountLite {
  platform: string;
  followers: number;
}

export interface SocialAccountFull extends SocialAccountLite {
  id: string;
  profileUrl: string | null;
  connectedViaOAuth: boolean;
}

export interface CreatorCard {
  id: string;
  username: string | null;
  fullName: string | null;
  providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  teamSize: number | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  socialAccounts: SocialAccountLite[];
}

export interface CreatorProfile extends Omit<CreatorCard, 'socialAccounts'> {
  /** true when the creator has turned off their public profile — only id/name/avatar are present. */
  isPrivate?: boolean;
  userId: string;
  socialAccounts: SocialAccountFull[];
  industries: string[];
  website: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  prefPlatforms: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  portfolioItems: Array<{
    id: string;
    title: string | null;
    description: string | null;
    mediaUrl?: string | null;
    mediaType?: 'IMAGE' | 'VIDEO' | null;
    externalUrl?: string | null;
  }>;
  services: Array<{ id: string; name: string; description: string | null }>;
  teamMembers: Array<{
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    categories: string[];
    isVerified: boolean;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer?: { name: string | null; avatarUrl: string | null } | null;
  }>;
  stats: {
    profileCompletion: number;
    averageRating: number;
    reviewCount: number;
    responseTimeAvgMins: number;
    completionRate: number;
  } | null;
}

export interface CreatorFilterOptions {
  categories: string[];
  platforms: string[];
}

export type CreatorSort = 'newest' | 'oldest' | 'followers';

export interface CreatorQuery {
  search?: string;
  categories?: string[];
  platforms?: string[];
  location?: string;
  sort?: CreatorSort;
  page?: number;
  limit?: number;
}

export interface Paged<T> {
  items: T[];
  pagination?: ApiPagination;
}

export async function fetchPublicCreators(
  q: CreatorQuery,
  signal?: AbortSignal,
): Promise<{ creators: CreatorCard[]; total: number; page: number; limit: number }> {
  const res = await apiRequest<{
    creators: CreatorCard[];
    total: number;
    page: number;
    limit: number;
  }>('GET', '/api/public/creators', undefined, {
    anonymous: true,
    signal,
    params: {
      search: q.search,
      categories: q.categories?.join(','),
      platforms: q.platforms?.join(','),
      location: q.location,
      sort: q.sort,
      page: q.page,
      limit: q.limit,
    },
  });
  return res.data;
}

export async function fetchCreatorFilterOptions(signal?: AbortSignal): Promise<CreatorFilterOptions> {
  const res = await apiRequest<CreatorFilterOptions>(
    'GET',
    '/api/public/creators/filter-options',
    undefined,
    { anonymous: true, signal },
  );
  return res.data;
}

// ── Natural-language creator search (landing hero → /creators/search) ───────

export type SearchPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

/** What the backend understood from the visitor's free-text query. */
export interface CreatorSearchInterpretation {
  query: string;
  topic: string | null;
  location: string | null;
  platforms: string[];
  creatorCount: number | null;
  /** Follower range — on the named platform(s), else total across accounts. */
  minFollowers: number | null;
  maxFollowers: number | null;
  /** Ranked by audience size ("top", "most followers"). */
  sortByFollowers: boolean;
}

/** A relaxed version of the search that has real matches — `count` creators. */
export interface BroaderCreatorSearch {
  topic: string | null;
  location: string | null;
  platform: string | null;
  minFollowers: number | null;
  maxFollowers: number | null;
  count: number;
}

export interface CreatorSearchResult {
  interpretation: CreatorSearchInterpretation;
  creators: CreatorCard[];
  total: number;
  page: number;
  limit: number;
  broaderSearches: BroaderCreatorSearch[];
}

export async function searchPublicCreators(
  q: {
    q: string;
    page?: number;
    limit?: number;
    location?: string;
    platform?: string;
    category?: string;
    /** '0' clears a minimum the query itself named. */
    minFollowers?: string;
    sort?: 'relevance' | 'followers' | '';
  },
  signal?: AbortSignal,
): Promise<CreatorSearchResult> {
  const res = await apiRequest<CreatorSearchResult>('GET', '/api/public/creators/search', undefined, {
    anonymous: true,
    signal,
    params: {
      q: q.q,
      page: q.page,
      limit: q.limit,
      location: q.location || undefined,
      platform: q.platform || undefined,
      category: q.category || undefined,
      minFollowers: q.minFollowers || undefined,
      sort: q.sort || undefined,
    },
  });
  return res.data;
}

export async function fetchPopularCreatorSearches(signal?: AbortSignal): Promise<string[]> {
  const res = await apiRequest<{ searches: string[] }>(
    'GET',
    '/api/public/creators/popular-searches',
    undefined,
    { anonymous: true, signal },
  );
  return res.data.searches;
}

export async function fetchCreatorByHandle(
  handle: string,
  signal?: AbortSignal,
): Promise<CreatorProfile> {
  const res = await apiRequest<CreatorProfile>(
    'GET',
    `/api/public/creators/${encodeURIComponent(handle)}`,
    undefined,
    { signal },
  );
  return res.data;
}

// ── Businesses ───────────────────────────────────────────────────────────────

export interface BusinessCard {
  id: string;
  slug: string | null;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  city: string | null;
  district: string | null;
  _count: { campaigns: number };
}

export interface BusinessProfile {
  /** true when the business turned off its public profile — only id/name/logo are present. */
  isPrivate?: boolean;
  id: string;
  slug: string | null;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  socialLinks: Record<string, string>;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  allowDirectMessages: boolean;
  createdAt: string;
  campaigns: Array<{
    id: string;
    slug: string | null;
    title: string;
    platforms: string[];
    category: string;
    budgetMin: number;
    budgetMax: number;
    deadline: string;
    contentType: string;
    isFeatured: boolean;
    location: string | null;
    featureImageUrl: string | null;
    campaignType: string;
    _count: { applications: number };
  }>;
  _count: { campaigns: number };
  favoritedByCount: number;
  savedCreatorsCount: number;
  stats?: Record<string, number> | null;
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    from?: { name: string | null; avatarUrl: string | null } | null;
  }>;
}

export interface BusinessQuery {
  search?: string;
  category?: string;
  platform?: string;
  locations?: string[];
  page?: number;
  limit?: number;
}

export async function fetchPublicBusinesses(
  q: BusinessQuery,
  signal?: AbortSignal,
): Promise<{ businesses: BusinessCard[]; total: number }> {
  const res = await apiRequest<{ businesses: BusinessCard[]; total: number }>(
    'GET',
    '/api/public/businesses',
    undefined,
    {
      anonymous: true,
      signal,
      params: {
        search: q.search,
        category: q.category,
        platform: q.platform,
        locations: q.locations?.join(','),
        page: q.page,
        limit: q.limit,
      },
    },
  );
  return res.data;
}

export async function fetchPublicBusiness(id: string, signal?: AbortSignal): Promise<BusinessProfile> {
  const res = await apiRequest<BusinessProfile>(
    'GET',
    `/api/public/businesses/${encodeURIComponent(id)}`,
    undefined,
    { signal },
  );
  return res.data;
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface EventCard {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  featureImageUrl?: string | null;
  category: string;
  goals?: string[];
  platforms: string[];
  contentType?: string;
  deliverables: string;
  deadline: string;
  eventDate?: string | null;
  location?: string | null;
  locationType?: 'ONSITE' | 'REMOTE' | null;
  budgetMin: number;
  budgetMax: number;
  budgetInputType?: 'PER_CREATOR' | 'TOTAL' | null;
  totalBudget?: number | null;
  creatorsNeeded?: number;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  /** For OPEN_EVENT (free events) — what the business offers creators in kind. */
  benefits?: string[];
  status: string;
  isFeatured: boolean;
  minFollowers: number;
  targetAudience?: string[];
  hashtags?: string[];
  createdAt: string;
  business: { id?: string; slug?: string | null; businessName: string; logoUrl: string | null; website?: string | null; description?: string | null };
  _count: { applications: number };
  requirements?: Array<{
    id: string;
    category: { id: string; name: string; key: string; icon: string; color: string };
    quantity: number;
    budgetType: 'FIXED' | 'RANGE' | 'NEGOTIABLE';
    budgetFixed: number | null;
    budgetMin: number | null;
    budgetMax: number | null;
    deliverables: string | null;
    acceptedCount: number;
  }>;
}

export type EventSort = 'newest' | 'oldest' | 'budget_high';

export interface EventQuery {
  search?: string;
  category?: string[];
  platform?: string[];
  minBudget?: number;
  maxBudget?: number;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  sort?: EventSort;
  page?: number;
  limit?: number;
}

export async function fetchPublicEvents(
  q: EventQuery,
  signal?: AbortSignal,
): Promise<{ items: EventCard[]; pagination?: ApiPagination }> {
  const res = await apiRequest<EventCard[]>('GET', '/api/public/events', undefined, {
    anonymous: true,
    signal,
    params: {
      search: q.search,
      category: q.category?.join(','),
      platform: q.platform?.join(','),
      minBudget: q.minBudget,
      maxBudget: q.maxBudget,
      campaignType: q.campaignType,
      sort: q.sort,
      page: q.page,
      limit: q.limit,
    },
  });
  return { items: res.data, pagination: res.pagination };
}

// ── Landing showcase (consolidated) ─────────────────────────────────────────
// Single round trip for the landing page's three preview rows — events (3
// paid + 1 open), creators, and businesses (4 each) — so a slow/failing
// section can't blank out the others, and the client never over-fetches past
// the 4 cards each section actually renders.

export interface LandingShowcase {
  events: EventCard[];
  creators: PublicCreatorLite[];
  businesses: PublicBusinessLite[];
}

export async function fetchLandingShowcase(signal?: AbortSignal): Promise<LandingShowcase> {
  const res = await apiRequest<LandingShowcase>(
    'GET',
    '/api/public/showcase',
    undefined,
    { anonymous: true, signal },
  );
  return res.data;
}

export async function fetchPublicEvent(id: string, signal?: AbortSignal): Promise<EventCard> {
  const res = await apiRequest<EventCard>(
    'GET',
    `/api/public/events/${encodeURIComponent(id)}`,
    undefined,
    { anonymous: true, signal },
  );
  return res.data;
}
