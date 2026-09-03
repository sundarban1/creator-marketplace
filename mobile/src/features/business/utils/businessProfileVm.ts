import type { BusinessProfile } from '@/services/profile';
import type { BusinessDetail, PrivateBusinessDetail, BusinessActiveCampaign } from '@/services/business';
import type { ApiReviewReceived } from '@/services/creator';

// The public payloads (BusinessDetail) ship the review list but no
// reviewSummary, so <ProfileRatingRow>'s stars had nothing to fill from and
// rendered all grey. Derive the summary from the reviews when the payload
// doesn't carry one.
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

// One normalized shape the unified <BusinessProfileView> renders, regardless of
// which endpoint the data came from:
//   • owner  — profileService.getBusinessProfile()  (BusinessProfile)
//   • visitor — businessService.getBusinessById(id)  (BusinessDetail)
// The two DTOs diverge (owner has coverImage + email + no performance stats /
// campaign list; visitor has city/district instead of a location string, a
// performance block, and the active-events list). Those differences are
// absorbed here so the view has a single contract.
export type BusinessProfileVM = {
  id: string;
  // Present on the visitor payload only — used for report / message-request
  // targets. Never needed in owner mode.
  userId: string | null;
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  verified: boolean;
  location: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  // owner: always true · visitor: !hideContactDetails
  showContact: boolean;
  categories: string[];
  stats: {
    activeCampaigns: number;
    savedCreators: number;
    favoritedBy: number;
  };
  // Visitor-only — the business's response/rating-given performance block.
  performance: { averageRatingGiven: number; responseTimeAvgMins: number } | null;
  reviews: ApiReviewReceived[];
  reviewSummary?: { averageRating: number; reviewCount: number };
  // Visitor-only — the business's currently open campaigns/events.
  campaigns: BusinessActiveCampaign[];
};

export function toOwnerVm(
  profile: BusinessProfile,
  extra: { activeCampaigns: number; savedCreators: number },
): BusinessProfileVM {
  return {
    id: profile.id,
    userId: null,
    name: profile.businessName ?? 'Business',
    logoUrl: profile.logoUrl,
    coverImageUrl: profile.coverImageUrl,
    verified: !!(profile.fullyVerified || profile.isVerified),
    location: profile.location,
    description: profile.description,
    website: profile.website,
    phone: profile.user?.phone ?? profile.phone,
    email: profile.user?.email ?? null,
    showContact: true,
    categories: profile.categories ?? [],
    stats: {
      activeCampaigns: extra.activeCampaigns,
      savedCreators: extra.savedCreators,
      favoritedBy: profile.favoritedByCount ?? 0,
    },
    performance: null,
    reviews: profile.reviews ?? [],
    reviewSummary: summarizeReviews(profile.reviews ?? [], profile.reviewSummary),
    campaigns: [],
  };
}

// Owner first paint — before getBusinessProfile() resolves — so the screen
// shows its chrome (name, empty stats) immediately instead of a blank frame,
// matching the pre-unification behaviour.
export function emptyOwnerVm(name: string): BusinessProfileVM {
  return {
    id: '', userId: null, name, logoUrl: null, coverImageUrl: null,
    verified: false, location: null, description: null, website: null,
    phone: null, email: null, showContact: true, categories: [],
    stats: { activeCampaigns: 0, savedCreators: 0, favoritedBy: 0 },
    performance: null, reviews: [], campaigns: [],
  };
}

// The private payload carries only id / businessName / logoUrl — enough for the
// locked hero <BusinessProfileView> shows when isPrivate is set.
export function privateVisitorVm(detail: PrivateBusinessDetail): BusinessProfileVM {
  return {
    ...emptyOwnerVm(detail.businessName ?? 'Business'),
    id: detail.id,
    logoUrl: detail.logoUrl,
    showContact: false,
  };
}

export function toVisitorVm(detail: BusinessDetail): BusinessProfileVM {
  const location =
    [detail.city, detail.district].filter(Boolean).join(', ') || null;
  return {
    id: detail.id,
    userId: detail.userId,
    name: detail.businessName ?? 'Business',
    logoUrl: detail.logoUrl,
    coverImageUrl: null,
    verified: !!(detail.fullyVerified || detail.isVerified),
    location,
    description: detail.description,
    website: detail.website,
    phone: detail.phone,
    email: null,
    showContact: !detail.hideContactDetails,
    categories: detail.categories ?? [],
    stats: {
      activeCampaigns: detail._count?.campaigns ?? 0,
      savedCreators: detail.savedCreatorsCount ?? 0,
      favoritedBy: detail.favoritedByCount ?? 0,
    },
    performance: detail.stats
      ? {
          averageRatingGiven: detail.stats.averageRatingGiven,
          responseTimeAvgMins: detail.stats.responseTimeAvgMins,
        }
      : null,
    reviews: detail.reviews ?? [],
    reviewSummary: summarizeReviews(detail.reviews ?? []),
    campaigns: detail.campaigns ?? [],
  };
}
