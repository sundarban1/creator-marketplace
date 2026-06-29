import { Role } from '@prisma/client';

export interface UserDto {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  name: string;
  avatar: string | null;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
  creatorProfile: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  businessProfile: {
    id: string;
    businessName: string | null;
    logoUrl: string | null;
  } | null;
}

type UserInput = {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
  creatorProfile?: {
    id: string;
    username?: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  businessProfile?: {
    id: string;
    businessName: string | null;
    logoUrl: string | null;
  } | null;
};

export function toUserDto(user: UserInput): UserDto {
  const name   = user.creatorProfile?.fullName  ?? user.businessProfile?.businessName ?? user.email.split('@')[0];
  const avatar = user.creatorProfile?.avatarUrl ?? user.businessProfile?.logoUrl      ?? null;
  return {
    id:              user.id,
    email:           user.email,
    phone:           user.phone,
    role:            user.role,
    isEmailVerified: user.isEmailVerified,
    isOnboarded:     user.isOnboarded,
    createdAt:       user.createdAt.toISOString(),
    updatedAt:       user.updatedAt.toISOString(),
    creatorProfile:  user.creatorProfile
      ? { id: user.creatorProfile.id, username: user.creatorProfile.username ?? null, fullName: user.creatorProfile.fullName, avatarUrl: user.creatorProfile.avatarUrl }
      : null,
    businessProfile: user.businessProfile ?? null,
    name,
    avatar,
  };
}
