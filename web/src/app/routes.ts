import type { AppRole } from './api/auth';

/** Canonical marketplace paths. Admin lives under /admin/* (see src/App.tsx). */
export const paths = {
  home: '/',
  login: '/login',
  signup: '/signup',
  verify: '/verify',
  forgotPassword: '/forgot-password',

  creatorHome: '/creator',
  businessHome: '/business',
} as const;

/** Where a signed-in user belongs. ADMIN never reaches the marketplace app. */
export function roleHome(role: AppRole): string {
  return role === 'BUSINESS' ? paths.businessHome : paths.creatorHome;
}
