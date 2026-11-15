// Mandatory agreement acceptance (Terms of Use + Community Guidelines +
// Privacy Policy) and the declared-age gate.
//
// Versions live in platform settings (legal.version.*). Bumping one in the
// admin dashboard makes every user re-accept on their next app open — the
// apps call GET /api/legal/acceptance after sign-in and show the agreement
// screen whenever `accepted` is false. Each acceptance is a new immutable
// TermsAcceptance row (audit trail); nothing is ever updated in place.
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { getCachedSettings } from '../../utils/settingsCache';
import { logAudit } from '../logging/audit.service';
import { AuditAction, EntityType } from '../logging/logging.constants';

export interface LegalVersions { terms: string; guidelines: string; privacy: string; minimumAge: number }

export async function currentLegalVersions(): Promise<LegalVersions> {
  const s = await getCachedSettings();
  return {
    terms: String(s['legal.version.terms'] ?? '1'),
    guidelines: String(s['legal.version.guidelines'] ?? '1'),
    privacy: String(s['legal.version.privacy'] ?? '1'),
    minimumAge: Number(s['legal.minimumAge'] ?? 18) || 18,
  };
}

export function ageOn(birthDate: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = now.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}

export const termsService = {
  async status(userId: string) {
    const [v, latest] = await Promise.all([
      currentLegalVersions(),
      prisma.termsAcceptance.findFirst({ where: { userId }, orderBy: { acceptedAt: 'desc' } }),
    ]);
    const accepted = !!latest && latest.termsVersion === v.terms && latest.guidelinesVersion === v.guidelines;
    return {
      accepted,
      // Date of birth is no longer collected — kept in the payload so older
      // app builds (which read it) never show the DOB field.
      ageRequired: false,
      versions: v,
      acceptedAt: latest?.acceptedAt ?? null,
    };
  },

  async accept(userId: string, input: { termsVersion: string; guidelinesVersion: string; privacyVersion?: string; birthDate?: string; platform?: string }, ip?: string) {
    const v = await currentLegalVersions();
    if (input.termsVersion !== v.terms || input.guidelinesVersion !== v.guidelines) {
      throw new AppError('The Terms have been updated. Please review the latest version.', HttpStatus.CONFLICT, true, { code: 'TERMS_VERSION_OUTDATED', versions: v });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { birthDate: true } });
    if (!user) throw new AppError('User not found', HttpStatus.NOT_FOUND);

    let birthDate = user.birthDate;
    if (input.birthDate) {
      const d = new Date(`${input.birthDate.slice(0, 10)}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d > new Date() || d.getUTCFullYear() < 1900) throw new AppError('Enter a valid date of birth', HttpStatus.BAD_REQUEST);
      birthDate = d;
    }
    // DOB is optional now; an age check only runs when one is supplied (older clients).
    if (birthDate && ageOn(birthDate) < v.minimumAge) {
      throw new AppError(`You must be at least ${v.minimumAge} years old to use Kolab.`, HttpStatus.FORBIDDEN, true, { code: 'UNDER_MINIMUM_AGE', minimumAge: v.minimumAge });
    }

    const row = await prisma.$transaction(async (tx) => {
      if (!user.birthDate && birthDate) await tx.user.update({ where: { id: userId }, data: { birthDate } });
      return tx.termsAcceptance.create({
        data: { userId, termsVersion: v.terms, guidelinesVersion: v.guidelines, privacyVersion: input.privacyVersion ?? v.privacy, ageConfirmed: !!birthDate, platform: input.platform ?? null, ipAddress: ip ?? null },
      });
    });
    logAudit({ userId, actorType: 'USER', action: AuditAction.TERMS_ACCEPTED, entityType: EntityType.USER, entityId: userId, newValue: { terms: v.terms, guidelines: v.guidelines, privacy: row.privacyVersion } });
    return { accepted: true, acceptedAt: row.acceptedAt, versions: v };
  },
};
