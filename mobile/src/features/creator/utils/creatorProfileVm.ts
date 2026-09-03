import type {
  ApiCreatorProfile,
  ApiCreatorPublicProfile,
  ApiCreatorPublicStats,
  ApiPublicService,
  ApiPublicTeamMember,
  ApiReviewReceived,
  ProviderType,
  ServiceMode,
} from '@/services/creator';
import type { ApiPortfolioItem } from '@/services/portfolio';

// The public payloads (ApiCreatorPublicProfile) ship the review list but no
// reviewSummary, so <ProfileRatingRow>'s stars had nothing to fill from and
// rendered all grey. Derive the summary from the reviews when absent.
function summarizeReviews(
  reviews: ApiReviewReceived[],
  existing?: { averageRating: number; reviewCount: number },
): { averageRating: number; reviewCount: number } | undefined {
  if (existing && existing.reviewCount > 0) return existing;
  if (!reviews.length) return existing;
  return {
    averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
    reviewCount: reviews.length,
  };
}

// One normalized shape the unified <CreatorProfileView> renders, regardless of
// which endpoint the data came from:
//   • owner    — creatorService.getProfile()              (ApiCreatorProfile)
//   • business — creatorService.getCreatorPublicProfile() (ApiCreatorPublicProfile)
//   • peer     — creatorService.getPeerCreatorProfile()   (ApiCreatorPublicProfile)
// The owner payload is richer in some places (coverImage, engagement stats,
// own portfolio via a separate call) and thinner in others (no performance
// stats / services / team roster). The mappers below absorb that so the view
// has a single contract.
export type MergedPlatform = {
  key: string;
  platform: string;
  handle: string | null;
  followers: number | null;
  profileUrl: string | null;
  verified: boolean;
};

export type CreatorProfileVM = {
  id: string;
  // Public payloads carry userId (report / message-request target). null in
  // owner mode where neither is needed.
  userId: string | null;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  verified: boolean;
  location: string | null;
  bio: string | null;
  categories: string[];
  providerType: ProviderType | null;
  teamSize: number | null;
  industries: string[];
  serviceMode: ServiceMode | null;
  website: string | null;
  platforms: MergedPlatform[];
  prefPlatforms: string[];
  // Engagement stats — owner tab only.
  ownerStats: { completedEvents: number; savedBrands: number; savedByBusinesses: number } | null;
  // Performance stats — visitor views only.
  visitorStats: ApiCreatorPublicStats | null;
  services: ApiPublicService[];
  teamMembers: ApiPublicTeamMember[];
  portfolioItems: ApiPortfolioItem[];
  portfolioLinks: { id: string; label: string; url: string }[];
  reviews: ApiReviewReceived[];
  reviewSummary?: { averageRating: number; reviewCount: number };
};

// Merge socialLinks (bare JSON handles) + socialAccounts (structured, with
// follower counts). Structured accounts win; a socialLinks entry for a platform
// already covered by an account is dropped. Lifted verbatim from the two
// creator-detail screens.
export function mergeSocialPlatforms(
  socialAccounts: { id: string; platform: string; followers: number; profileUrl: string; connectedViaOAuth: boolean }[],
  socialLinks: Record<string, string | null> | null | undefined,
): MergedPlatform[] {
  const merged: MergedPlatform[] = [];
  const covered = new Set<string>();
  for (const acc of socialAccounts ?? []) {
    merged.push({
      key: acc.id, platform: acc.platform, handle: null,
      followers: acc.followers, profileUrl: acc.profileUrl, verified: acc.connectedViaOAuth,
    });
    covered.add(acc.platform.toLowerCase());
  }
  for (const [platform, handle] of Object.entries(socialLinks ?? {})) {
    if (handle && !covered.has(platform.toLowerCase())) {
      merged.push({ key: platform, platform, handle, followers: null, profileUrl: null, verified: false });
    }
  }
  return merged;
}

export function toOwnerVm(
  profile: ApiCreatorProfile,
  extra: {
    completedEvents: number;
    savedBrands: number;
    savedByBusinesses: number;
    portfolioItems: ApiPortfolioItem[];
  },
): CreatorProfileVM {
  return {
    id: profile.id,
    userId: null,
    fullName: profile.fullName ?? 'Creator',
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: profile.coverImageUrl,
    verified: !!(profile.fullyVerified || profile.isVerified),
    location: profile.location,
    bio: profile.bio,
    categories: profile.categories ?? [],
    providerType: profile.providerType,
    teamSize: profile.teamSize,
    industries: profile.industries ?? [],
    serviceMode: profile.serviceMode,
    website: profile.website,
    platforms: [],
    prefPlatforms: profile.prefPlatforms ?? [],
    ownerStats: {
      completedEvents: extra.completedEvents,
      savedBrands: extra.savedBrands,
      savedByBusinesses: extra.savedByBusinesses,
    },
    visitorStats: null,
    services: [],
    teamMembers: [],
    portfolioItems: extra.portfolioItems ?? [],
    portfolioLinks: [],
    reviews: profile.reviews ?? [],
    reviewSummary: summarizeReviews(profile.reviews ?? [], profile.reviewSummary),
  };
}

export function emptyOwnerVm(name: string): CreatorProfileVM {
  return {
    id: '', userId: null, fullName: name, username: null, avatarUrl: null,
    coverImageUrl: null, verified: false, location: null, bio: null, categories: [],
    providerType: null, teamSize: null, industries: [], serviceMode: null, website: null,
    platforms: [], prefPlatforms: [],
    ownerStats: { completedEvents: 0, savedBrands: 0, savedByBusinesses: 0 },
    visitorStats: null, services: [], teamMembers: [], portfolioItems: [], portfolioLinks: [],
    reviews: [],
  };
}

export function toVisitorVm(profile: ApiCreatorPublicProfile): CreatorProfileVM {
  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.fullName ?? 'Creator',
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: null,
    verified: !!(profile.fullyVerified || profile.isVerified),
    location: profile.location,
    bio: profile.bio,
    categories: profile.categories ?? [],
    providerType: profile.providerType,
    teamSize: profile.teamSize,
    industries: profile.industries ?? [],
    serviceMode: profile.serviceMode,
    website: profile.website,
    platforms: mergeSocialPlatforms(profile.socialAccounts, profile.socialLinks),
    prefPlatforms: profile.prefPlatforms ?? [],
    ownerStats: null,
    visitorStats: profile.stats,
    services: profile.services ?? [],
    teamMembers: profile.teamMembers ?? [],
    portfolioItems: profile.portfolioItems ?? [],
    portfolioLinks: (profile.portfolioLinks ?? []) as { id: string; label: string; url: string }[],
    reviews: profile.reviews ?? [],
    reviewSummary: summarizeReviews(profile.reviews ?? []),
  };
}

// Private public payload — id/fullName/avatarUrl only. Enough for the locked hero.
export function privateVisitorVm(profile: ApiCreatorPublicProfile): CreatorProfileVM {
  return {
    ...emptyOwnerVm(profile.fullName ?? 'Creator'),
    id: profile.id,
    userId: profile.userId ?? null,
    username: profile.username ?? null,
    avatarUrl: profile.avatarUrl,
    ownerStats: null,
  };
}
