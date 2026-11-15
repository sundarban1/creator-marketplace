// An admin suspension is in force while suspendedAt is set and either it is
// permanent (suspendedUntil null) or the temporary end hasn't passed yet.
// Once a temporary suspension expires, the normal login path reactivates the
// account (AuthRepository.reactivateAccount clears the suspension fields).
export function suspensionActive(u: { suspendedAt: Date | null; suspendedUntil?: Date | null }, now = new Date()): boolean {
  if (!u.suspendedAt) return false;
  return !u.suspendedUntil || u.suspendedUntil > now;
}
