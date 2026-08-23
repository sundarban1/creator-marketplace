import { Prisma } from '@prisma/client';
import { isCreatorFullyVerified, providerVerificationStatus } from '../../utils/verification';
import { maskLocationByVisibility } from '../../utils/geo';

export interface SocialAccountDto {
  id: string;
  creatorProfileId: string;
  businessProfileId: string | null;
  platform: string;
  profileUrl: string;
  followers: number;
  connectedViaOAuth: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Last time `followers` was actually re-fetched from the platform — lets the app
  // show "Updated 3h ago" so the automatic-refresh behavior is visible, even though
  // there's no manual sync action. Never null for an OAuth-connected account once
  // it's synced at least once; null otherwise (e.g. a manually-typed account).
  followersSyncedAt: string | null;
}

export interface CreatorProfileDto {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  nearbyRadiusKm: number;
  nearbyUseHomeLocation: boolean;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  categories: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  isVerified: boolean;
  fullyVerified: boolean;
  paymentMethods: string[];
  prefPlatforms: string[];
  prefLocations: string[];
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  // §5 — AGENCY business registration. Gates an agency's verified badge the
  // way citizenship gates an individual's.
  companyRegDocUrl: string | null;
  companyRegDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUploadedAt: string | null;
  // Derived server-side so no client recomputes the AGENCY-vs-person rule.
  verificationStatus: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED';
  verificationRejectReason: string | null;
  verificationRejectedAt: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  teamSize: number | null;
  industries: string[];
  website: string | null;
  serviceMode: 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID' | null;
  // §5 — private DTO only. A PAN/VAT/registration number is never exposed on
  // the public profile or on discovery cards.
  panNo: string | null;
  vatNo: string | null;
  companyRegNo: string | null;
  startingRate: number | null;
  negotiable: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    phone: string | null;
    role: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isOnboarded: boolean;
  } | null;
  socialAccounts: SocialAccountDto[];
  // How many businesses currently have this creator in their saved-creators list.
  savedByBusinessCount: number;
}

export interface PublicCreatorDto {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  // §9 — a client needs to know whether they're hiring a person, a team or a
  // business before they hire. Null for accounts onboarded before the question
  // existed; clients render no badge rather than assuming INDIVIDUAL.
  providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  // Only ever set for a TEAM — renders the spec's "Team · 4 members" line.
  teamSize: number | null;
  // Only ever set for an AGENCY — the spec's "Agency · Creative & Marketing".
  industries: string[];
  // Hidden by hideSocialLinks, like socialLinks/socialAccounts below — a
  // website is an external link, not a private contact detail.
  website: string | null;
  // §3 step 4 — public: a client has to know whether the provider comes to
  // them, works online, or expects them to travel.
  serviceMode: 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID' | null;
  bio: string | null;
  location: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  avatarUrl: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  prefPlatforms: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  socialAccounts: Array<{
    id: string;
    platform: string;
    followers: number;
    profileUrl: string;
    connectedViaOAuth: boolean;
  }>;
}

// Mirrors business.dto.ts's toPrivateBusinessDto — returned in place of the
// full public DTO when the profile owner has turned showPublicProfile off.
export interface PrivateCreatorDto {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPrivate: true;
}

export interface CreatorListItemDto {
  id: string;
  fullName: string | null;
  providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  teamSize: number | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  socialAccounts: Array<{ platform: string; followers: number }>;
  distanceKm?: number;
  // Only populated on the "recommended creators" path (see getRecommendedForCampaign) —
  // undefined everywhere else (explore/search doesn't compute these per-row).
  averageRating?: number;
  completionRate?: number;
  completedEvents?: number;
}

type RawSocialAccount = {
  id: string;
  creatorProfileId: string | null;
  businessProfileId?: string | null;
  platform: string;
  profileUrl: string;
  followers: number;
  connectedViaOAuth?: boolean;
  avatarUrl?: string | null;
  followersSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toSocialAccountDto(a: RawSocialAccount): SocialAccountDto {
  return {
    id:               a.id,
    creatorProfileId: a.creatorProfileId ?? '',
    businessProfileId: a.businessProfileId ?? null,
    platform:         a.platform,
    profileUrl:       a.profileUrl,
    followers:        a.followers,
    connectedViaOAuth: a.connectedViaOAuth ?? false,
    avatarUrl:        a.avatarUrl ?? null,
    followersSyncedAt: a.followersSyncedAt ? a.followersSyncedAt.toISOString() : null,
    createdAt:        a.createdAt.toISOString(),
    updatedAt:        a.updatedAt.toISOString(),
  };
}

type RawCreatorProfile = {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  nearbyRadiusKm: number;
  nearbyUseHomeLocation: boolean;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  categories: string[];
  socialLinks: Prisma.JsonValue;
  portfolioLinks: Prisma.JsonValue;
  isVerified: boolean;
  paymentMethods: Prisma.JsonValue;
  prefPlatforms: string[];
  prefLocations: string[];
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl?: string | null;
  companyRegDocStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUploadedAt?: Date | null;
  verificationRejectReason: string | null;
  verificationRejectedAt: Date | null;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  providerType?: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  teamSize?: number | null;
  industries?: string[];
  website?: string | null;
  serviceMode?: 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID' | null;
  panNo?: string | null;
  vatNo?: string | null;
  companyRegNo?: string | null;
  startingRate: number | null;
  negotiable: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; email: string; phone: string | null; role: string; isEmailVerified: boolean; isPhoneVerified: boolean; isOnboarded: boolean } | null;
  socialAccounts?: RawSocialAccount[];
  _count?: { savedBy: number };
};

export function toCreatorProfileDto(p: RawCreatorProfile): CreatorProfileDto {
  return {
    id:            p.id,
    userId:        p.userId,
    username:      p.username,
    fullName:      p.fullName,
    bio:           p.bio,
    location:      p.location,
    locationLat:   p.locationLat,
    locationLng:   p.locationLng,
    nearbyRadiusKm:        p.nearbyRadiusKm,
    nearbyUseHomeLocation: p.nearbyUseHomeLocation,
    avatarUrl:     p.avatarUrl,
    coverImageUrl: p.coverImageUrl,
    categories:    p.categories,
    socialLinks:   (p.socialLinks ?? {}) as Record<string, string>,
    portfolioLinks: (p.portfolioLinks ?? []) as Array<{ id: string; label: string; url: string }>,
    isVerified:    p.isVerified,
    fullyVerified: p.user ? isCreatorFullyVerified(p.user, p) : false,
    paymentMethods: (p.paymentMethods ?? []) as string[],
    prefPlatforms: p.prefPlatforms,
    prefLocations: p.prefLocations,
    prefBudgetMin: p.prefBudgetMin,
    prefBudgetMax: p.prefBudgetMax,
    citizenshipDocUrl: p.citizenshipDocUrl,
    citizenshipStatus: p.citizenshipStatus,
    panDocUrl:     p.panDocUrl,
    panDocStatus:  p.panDocStatus,
    companyRegDocUrl:        p.companyRegDocUrl ?? null,
    companyRegDocStatus:     p.companyRegDocStatus ?? 'NONE',
    companyRegDocUploadedAt: p.companyRegDocUploadedAt ? p.companyRegDocUploadedAt.toISOString() : null,
    verificationStatus: p.user ? providerVerificationStatus(p.user, p) : 'NOT_VERIFIED',
    verificationRejectReason: p.verificationRejectReason,
    verificationRejectedAt: p.verificationRejectedAt ? p.verificationRejectedAt.toISOString() : null,
    province:      p.province,
    district:      p.district,
    city:          p.city,
    area:          p.area,
    address:       p.address,
    locationVisibility: p.locationVisibility,
    showPublicProfile:  p.showPublicProfile,
    hideContactDetails: p.hideContactDetails,
    hideSocialLinks:    p.hideSocialLinks,
    availabilityStatus: p.availabilityStatus,
    providerType:  p.providerType ?? null,
    teamSize:      p.teamSize ?? null,
    industries:    p.industries ?? [],
    website:       p.website ?? null,
    serviceMode:   p.serviceMode ?? null,
    panNo:         p.panNo ?? null,
    vatNo:         p.vatNo ?? null,
    companyRegNo:  p.companyRegNo ?? null,
    startingRate:  p.startingRate,
    negotiable:    p.negotiable,
    createdAt:     p.createdAt.toISOString(),
    updatedAt:     p.updatedAt.toISOString(),
    user:          p.user ?? null,
    socialAccounts: (p.socialAccounts ?? []).map(toSocialAccountDto),
    savedByBusinessCount: p._count?.savedBy ?? 0,
  };
}

type RawPublicCreator = {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  providerType?: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  teamSize?: number | null;
  industries?: string[];
  website?: string | null;
  serviceMode?: 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID' | null;
  bio: string | null;
  location: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  avatarUrl: string | null;
  categories: string[];
  isVerified: boolean;
  citizenshipStatus: string;
  companyRegDocStatus?: string;
  prefPlatforms: string[];
  socialLinks: Prisma.JsonValue;
  portfolioLinks: Prisma.JsonValue;
  socialAccounts: Array<{ id: string; platform: string; followers: number; profileUrl: string; connectedViaOAuth?: boolean }>;
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toPrivateCreatorDto(p: { id: string; fullName: string | null; avatarUrl: string | null }): PrivateCreatorDto {
  return { id: p.id, fullName: p.fullName, avatarUrl: p.avatarUrl, isPrivate: true };
}

export function toPublicCreatorDto(p: RawPublicCreator): PublicCreatorDto {
  const loc = maskLocationByVisibility(p, p.locationVisibility);
  const hideSocial = p.hideSocialLinks;
  return {
    id:            p.id,
    userId:        p.userId,
    username:      p.username,
    fullName:      p.fullName,
    providerType:  p.providerType ?? null,
    teamSize:      p.teamSize ?? null,
    industries:    p.industries ?? [],
    website:       hideSocial ? null : (p.website ?? null),
    serviceMode:   p.serviceMode ?? null,
    bio:           p.bio,
    location:      p.location,
    province:      loc.province,
    district:      loc.district,
    city:          loc.city,
    avatarUrl:     p.avatarUrl,
    categories:    p.categories,
    isVerified:    p.isVerified,
    fullyVerified: p.user ? isCreatorFullyVerified(p.user, p) : false,
    prefPlatforms: p.prefPlatforms,
    socialLinks:   hideSocial ? {} : ((p.socialLinks ?? {}) as Record<string, string>),
    portfolioLinks: (p.portfolioLinks ?? []) as Array<{ id: string; label: string; url: string }>,
    socialAccounts: hideSocial ? [] : p.socialAccounts.map((a) => ({ ...a, connectedViaOAuth: a.connectedViaOAuth ?? false })),
  };
}

type RawCreatorListItem = {
  id: string;
  fullName: string | null;
  providerType?: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  teamSize?: number | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  citizenshipStatus: string;
  companyRegDocStatus?: string;
  socialAccounts: Array<{ platform: string; followers: number }>;
  distanceKm?: number;
  averageRating?: number;
  completionRate?: number;
  completedEvents?: number;
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toCreatorListItemDto(p: RawCreatorListItem): CreatorListItemDto {
  const dto: CreatorListItemDto = {
    id:            p.id,
    fullName:      p.fullName,
    providerType:  p.providerType ?? null,
    teamSize:      p.teamSize ?? null,
    bio:           p.bio,
    avatarUrl:     p.avatarUrl,
    location:      p.location,
    categories:    p.categories,
    isVerified:    p.isVerified,
    fullyVerified: p.user ? isCreatorFullyVerified(p.user, p) : false,
    socialAccounts: p.socialAccounts,
  };
  if (p.distanceKm != null) dto.distanceKm = Math.round(p.distanceKm * 10) / 10;
  if (p.averageRating != null) dto.averageRating = Math.round(p.averageRating * 10) / 10;
  if (p.completionRate != null) dto.completionRate = Math.round(p.completionRate * 100);
  if (p.completedEvents != null) dto.completedEvents = p.completedEvents;
  return dto;
}
