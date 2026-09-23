import { apiRequest } from '../lib/apiClient';

/**
 * The admin kill-switches the web app respects — same flags mobile reads
 * from this endpoint (`GET /api/public/platform-flags`). Not the full admin
 * `PlatformFlags` shape (see `web/src/lib/api.ts`); this is only the subset
 * that gates client-side behavior (signup, onboarding).
 */
export interface PlatformFlags {
  creatorRegistrationEnabled: boolean;
  businessRegistrationEnabled: boolean;
  creatorOnboardingEnabled: boolean;
  businessOnboardingEnabled: boolean;
  /** Escrow-funding fee breakdown — mirrors mobile's PlatformSettingsContext, same source endpoint. */
  paymentFeePercent: number;
  paymentTaxPercent: number;
  /** Per-platform switches for the OAuth "Connect Accounts" flow. */
  socialAccountsTiktokEnabled: boolean;
  socialAccountsFacebookEnabled: boolean;
  socialAccountsInstagramEnabled: boolean;
  socialAccountsYoutubeEnabled: boolean;
}

export function fetchPlatformFlags(signal?: AbortSignal): Promise<PlatformFlags> {
  return apiRequest<PlatformFlags>('GET', '/api/public/platform-flags', undefined, {
    anonymous: true,
    signal,
  }).then((r) => r.data);
}

/**
 * Memoized, in-flight-deduped fetch — the flags are read from a few unrelated
 * places (signup, social auth, post-auth redirect, route guards) in quick
 * succession, and they don't change within a session. The fallback on a
 * fetch failure is deliberately asymmetric: registration defaults to
 * *enabled* so a flags-endpoint hiccup never blocks a real signup (the
 * backend is the actual, authoritative gate — see auth.service.ts's
 * assertRegistrationEnabled — this is only a proactive UX nicety); onboarding
 * defaults to *off* so a hiccup never traps an already-registered user who
 * can't reach their dashboard.
 */
let cached: Promise<PlatformFlags> | null = null;

export function getPlatformFlags(): Promise<PlatformFlags> {
  if (!cached) {
    cached = fetchPlatformFlags().catch(() => ({
      creatorRegistrationEnabled: true,
      businessRegistrationEnabled: true,
      creatorOnboardingEnabled: false,
      businessOnboardingEnabled: false,
      paymentFeePercent: 5,
      paymentTaxPercent: 13,
      socialAccountsTiktokEnabled: true,
      socialAccountsFacebookEnabled: true,
      socialAccountsInstagramEnabled: true,
      socialAccountsYoutubeEnabled: true,
    }));
  }
  return cached;
}
