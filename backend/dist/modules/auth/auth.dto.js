"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUserDto = toUserDto;
function toUserDto(user) {
    const name = user.creatorProfile?.fullName ?? user.businessProfile?.businessName ?? user.email.split('@')[0];
    const avatar = user.creatorProfile?.avatarUrl ?? user.businessProfile?.logoUrl ?? null;
    return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isOnboarded: user.isOnboarded,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        creatorProfile: user.creatorProfile
            ? { id: user.creatorProfile.id, username: user.creatorProfile.username ?? null, fullName: user.creatorProfile.fullName, avatarUrl: user.creatorProfile.avatarUrl }
            : null,
        businessProfile: user.businessProfile ?? null,
        name,
        avatar,
    };
}
//# sourceMappingURL=auth.dto.js.map