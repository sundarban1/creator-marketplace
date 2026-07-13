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

export function isBusinessFullyVerified(
  user: VerifiableUser,
  profile: { panDocStatus: string; companyRegDocStatus: string },
): boolean {
  return (
    user.isEmailVerified &&
    user.isPhoneVerified &&
    profile.panDocStatus === 'APPROVED' &&
    profile.companyRegDocStatus === 'APPROVED'
  );
}
