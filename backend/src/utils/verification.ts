// A creator/business is "fully verified" only once every identity signal is
// confirmed: both contact channels, and (for creators) an approved citizenship
// document or (for businesses) approved PAN + company registration documents.
// This is intentionally separate from the profile's manually-toggled
// `isVerified` flag — that flag stays admin-controlled; this one is always
// derived fresh from the underlying signals so it can never drift out of sync.

type VerifiableUser = { isEmailVerified: boolean; isPhoneVerified: boolean };

// Providers verify differently depending on how they provide services (§5).
// An AGENCY is a registered business, so it proves that with its company
// registration document — it has no "citizenship" of its own, and demanding
// the owner's would leave every agency stuck on an individual's rule.
// INDIVIDUAL and TEAM both prove a person's identity with citizenship.
//
// A null providerType falls back to the citizenship rule, NOT the agency one:
// unlike the service-taker side (where the fallback is deliberately the
// stricter rule), every provider predating the provider-type question is a
// person, and applying the agency rule to them would strip badges already earned.
export function isCreatorFullyVerified(
  user: VerifiableUser,
  profile: { citizenshipStatus: string; companyRegDocStatus?: string; providerType?: string | null },
): boolean {
  if (!user.isEmailVerified || !user.isPhoneVerified) return false;
  if (profile.providerType === 'AGENCY') return profile.companyRegDocStatus === 'APPROVED';
  return profile.citizenshipStatus === 'APPROVED';
}

// Service takers verify differently depending on how they hire (spec §15).
// An ORGANIZATION proves it is a real registered business: PAN plus company
// registration. An INDIVIDUAL has neither, so demanding them would leave every
// personal account permanently unverifiable — they prove identity instead,
// with a single citizenship / national ID / personal PAN document.
//
// `representingType` is nullable (profiles created before it was collected,
// and accounts still mid-onboarding). Those fall back to the ORGANIZATION
// rule, which is the stricter of the two — never the looser one, so a missing
// hiring type can't hand out a verified badge that wasn't earned.
export function isBusinessFullyVerified(
  user: VerifiableUser,
  profile: {
    panDocStatus: string;
    companyRegDocStatus: string;
    identityDocStatus?: string;
    representingType?: string | null;
  },
): boolean {
  if (!user.isEmailVerified || !user.isPhoneVerified) return false;
  if (profile.representingType === 'INDIVIDUAL') {
    return profile.identityDocStatus === 'APPROVED';
  }
  return profile.panDocStatus === 'APPROVED' && profile.companyRegDocStatus === 'APPROVED';
}

/** The provider-side mirror of businessVerificationStatus below: derived, never
 *  stored, so the badge, the settings screen and any future surface can't
 *  disagree, and so the AGENCY-vs-person document rule lives in exactly one
 *  place. Only the document relevant to this provider's type is considered —
 *  an agency's pending citizenship upload (if it ever made one) must not read
 *  as "verification in progress" when the registration document is what
 *  actually gates its badge. */
export function providerVerificationStatus(
  user: VerifiableUser,
  profile: { citizenshipStatus: string; companyRegDocStatus?: string; providerType?: string | null },
): 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' {
  if (isCreatorFullyVerified(user, profile)) return 'VERIFIED';
  const relevant = profile.providerType === 'AGENCY'
    ? (profile.companyRegDocStatus ?? 'NONE')
    : profile.citizenshipStatus;
  return relevant === 'PENDING' ? 'PENDING' : 'NOT_VERIFIED';
}

/** The three states the spec (§7) wants surfaced, derived rather than stored so
 *  it can never drift from the underlying document statuses. PENDING means at
 *  least one relevant document is awaiting review; a REJECTED or missing
 *  document reads as NOT_VERIFIED, which is what the upload UI acts on. Only
 *  documents relevant to this profile's hiring type are considered. */
export function businessVerificationStatus(
  user: VerifiableUser,
  profile: {
    panDocStatus: string;
    companyRegDocStatus: string;
    identityDocStatus?: string;
    representingType?: string | null;
  },
): 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' {
  if (isBusinessFullyVerified(user, profile)) return 'VERIFIED';
  const relevant = profile.representingType === 'INDIVIDUAL'
    ? [profile.identityDocStatus ?? 'NONE']
    : [profile.panDocStatus, profile.companyRegDocStatus];
  return relevant.includes('PENDING') ? 'PENDING' : 'NOT_VERIFIED';
}
