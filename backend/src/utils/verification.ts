// A creator/business is "fully verified" only once every identity signal is
// confirmed: both contact channels, and (for creators) an approved citizenship
// document or (for businesses) approved PAN + company registration documents.
// This is intentionally separate from the profile's manually-toggled
// `isVerified` flag — that flag stays admin-controlled; this one is always
// derived fresh from the underlying signals so it can never drift out of sync.

type VerifiableUser = { isEmailVerified: boolean; isPhoneVerified: boolean };

export function isCreatorFullyVerified(
  user: VerifiableUser,
  profile: { citizenshipStatus: string },
): boolean {
  return user.isEmailVerified && user.isPhoneVerified && profile.citizenshipStatus === 'APPROVED';
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
