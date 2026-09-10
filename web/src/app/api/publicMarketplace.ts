/**
 * Typed client for the public (unauthenticated) marketplace endpoints
 * (`GET /api/public/creators*`, `GET /api/public/events*`). Shapes mirror the
 * backend DTOs — keep them in sync.
 */

import { apiRequest, type ApiPagination } from '../lib/apiClient';

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
    thumbnailUrl?: string | null;
    linkUrl?: string | null;
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

export async function fetchCreatorByHandle(
  handle: string,
  signal?: AbortSignal,
): Promise<CreatorProfile> {
  const res = await apiRequest<CreatorProfile>(
    'GET',
    `/api/public/creators/${encodeURIComponent(handle)}`,
    undefined,
    { anonymous: true, signal },
  );
  return res.data;
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface EventCard {
  id: string;
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
  status: string;
  isFeatured: boolean;
  minFollowers: number;
  targetAudience?: string[];
  hashtags?: string[];
  createdAt: string;
  business: { businessName: string; logoUrl: string | null; website?: string | null; description?: string | null };
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

export interface EventQuery {
  search?: string;
  category?: string[];
  platform?: string[];
  minBudget?: number;
  maxBudget?: number;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
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
      page: q.page,
      limit: q.limit,
    },
  });
  return { items: res.data, pagination: res.pagination };
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
