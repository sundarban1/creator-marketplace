"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBusinessProfileDto = toBusinessProfileDto;
exports.toPublicBusinessDto = toPublicBusinessDto;
exports.toBusinessListItemDto = toBusinessListItemDto;
function toBusinessProfileDto(b) {
    return {
        id: b.id,
        userId: b.userId,
        businessName: b.businessName,
        description: b.description,
        logoUrl: b.logoUrl,
        website: b.website,
        categories: b.categories,
        panNo: b.panNo,
        location: b.location,
        isVerified: b.isVerified,
        showPublicProfile: b.showPublicProfile,
        hideContactDetails: b.hideContactDetails,
        allowDirectMessages: b.allowDirectMessages,
        socialLinks: (b.socialLinks ?? {}),
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        user: b.user ?? null,
    };
}
function toPublicBusinessDto(b) {
    return {
        id: b.id,
        userId: b.userId,
        businessName: b.businessName,
        description: b.description,
        logoUrl: b.logoUrl,
        website: b.website,
        categories: b.categories,
        isVerified: b.isVerified,
        showPublicProfile: b.showPublicProfile,
        hideContactDetails: b.hideContactDetails,
        allowDirectMessages: b.allowDirectMessages,
        createdAt: b.createdAt.toISOString(),
        campaigns: b.campaigns.map((c) => ({ ...c, deadline: c.deadline.toISOString() })),
        _count: b._count,
    };
}
function toBusinessListItemDto(b) {
    return {
        id: b.id,
        businessName: b.businessName,
        description: b.description,
        logoUrl: b.logoUrl,
        website: b.website,
        categories: b.categories,
        isVerified: b.isVerified,
        _count: b._count,
    };
}
//# sourceMappingURL=business.dto.js.map