import { Role } from '@prisma/client';

export interface UserDto {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  name: string;
  avatar: string | null;
  isEmailVerified: boolean;
  // True while `email` is a placeholder minted because Sign in with Apple
  // withheld the real address — the client must route the user through
  // add-email before letting them into the app.
  emailIsPlaceholder: boolean;
  isPhoneVerified: boolean;
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
  emailIsPlaceholder: boolean;
  isPhoneVerified: boolean;
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
  // Fall back to the local-part of the email only when it's a real address —
  // a placeholder ("apple_00123...@placeholder.invalid") would be an ugly name.
  const emailName = user.emailIsPlaceholder ? 'there' : user.email.split('@')[0];
  const name   = user.creatorProfile?.fullName  ?? user.businessProfile?.businessName ?? emailName;
  const avatar = user.creatorProfile?.avatarUrl ?? user.businessProfile?.logoUrl      ?? null;
  return {
    id:              user.id,
    email:           user.email,
    phone:           user.phone,
    role:            user.role,
    isEmailVerified: user.isEmailVerified,
    emailIsPlaceholder: user.emailIsPlaceholder,
    isPhoneVerified: user.isPhoneVerified,
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
