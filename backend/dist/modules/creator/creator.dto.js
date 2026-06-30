"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSocialAccountDto = toSocialAccountDto;
exports.toCreatorProfileDto = toCreatorProfileDto;
exports.toPublicCreatorDto = toPublicCreatorDto;
exports.toCreatorListItemDto = toCreatorListItemDto;
function toSocialAccountDto(a) {
    return {
        id: a.id,
        creatorProfileId: a.creatorProfileId,
        platform: a.platform,
        profileUrl: a.profileUrl,
        followers: a.followers,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
    };
}
function toCreatorProfileDto(p) {
    return {
        id: p.id,
        userId: p.userId,
        username: p.username,
        fullName: p.fullName,
        bio: p.bio,
        location: p.location,
        locationLat: p.locationLat,
        locationLng: p.locationLng,
        avatarUrl: p.avatarUrl,
        categories: p.categories,
        socialLinks: (p.socialLinks ?? {}),
        portfolioLinks: (p.portfolioLinks ?? []),
        isVerified: p.isVerified,
        paymentMethods: (p.paymentMethods ?? []),
        prefPlatforms: p.prefPlatforms,
        prefLocations: p.prefLocations,
        prefBudgetMin: p.prefBudgetMin,
        prefBudgetMax: p.prefBudgetMax,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        user: p.user ?? null,
        socialAccounts: (p.socialAccounts ?? []).map(toSocialAccountDto),
    };
}
function toPublicCreatorDto(p) {
    return {
        id: p.id,
        userId: p.userId,
        username: p.username,
        fullName: p.fullName,
        bio: p.bio,
        location: p.location,
        avatarUrl: p.avatarUrl,
        categories: p.categories,
        isVerified: p.isVerified,
        prefBudgetMin: p.prefBudgetMin,
        prefBudgetMax: p.prefBudgetMax,
        prefPlatforms: p.prefPlatforms,
        socialLinks: (p.socialLinks ?? {}),
        portfolioLinks: (p.portfolioLinks ?? []),
        socialAccounts: p.socialAccounts,
    };
}
function toCreatorListItemDto(p) {
    return {
        id: p.id,
        fullName: p.fullName,
        bio: p.bio,
        avatarUrl: p.avatarUrl,
        location: p.location,
        categories: p.categories,
        isVerified: p.isVerified,
        prefBudgetMin: p.prefBudgetMin,
        prefBudgetMax: p.prefBudgetMax,
        socialAccounts: p.socialAccounts,
    };
}
//# sourceMappingURL=creator.dto.js.map