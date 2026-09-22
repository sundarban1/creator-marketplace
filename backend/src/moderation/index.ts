// Public entry point for the moderation system. See docs/moderation.md for
// the full architecture; callers outside this module should only ever import
// from here, never reach into individual dictionary/matcher files directly.
import { logger } from '../config/logger';
import { buildRepresentations } from './normalize';
import { compileDictionary, findFirstMatch } from './matcher';
import { checkReserved } from './reserved';
import { ENGLISH_TERMS } from './english';
import { NEPALI_TERMS } from './nepali';
import { ROMANIZED_NEPALI_TERMS } from './romanized-nepali';
import { HINDI_TERMS } from './hindi';
import { ROMANIZED_HINDI_TERMS } from './romanized-hindi';
import { SOUTH_ASIAN_TERMS } from './south-asian';
import {
  ModerationField,
  ModerationProfile,
  ModerationResult,
  ModerationSeverity,
} from './types';

export * from './types';

// Compiled once at module load (§32 — no per-request regex construction, no
// external calls, no DB lookups).
const COMPILED_DICTIONARIES = [
  compileDictionary(ENGLISH_TERMS),
  compileDictionary(ROMANIZED_HINDI_TERMS),
  compileDictionary(ROMANIZED_NEPALI_TERMS),
  compileDictionary(SOUTH_ASIAN_TERMS),
  compileDictionary(NEPALI_TERMS),
  compileDictionary(HINDI_TERMS),
];

const SEVERITY_RANK: Record<ModerationSeverity, number> = {
  [ModerationSeverity.LOW]: 0,
  [ModerationSeverity.MEDIUM]: 1,
  [ModerationSeverity.HIGH]: 2,
  [ModerationSeverity.CRITICAL]: 3,
};

// §34 — only username/displayName are enforced by any service today, both
// "strict" (reject on any match, any severity). bio/event/message thresholds
// are wired up now so turning on enforcement for those fields later is a
// call-site change, not a redesign.
const PROFILE_MIN_SEVERITY: Record<ModerationProfile, ModerationSeverity> = {
  username: ModerationSeverity.LOW,
  displayName: ModerationSeverity.LOW,
  bio: ModerationSeverity.MEDIUM,
  event: ModerationSeverity.MEDIUM,
  message: ModerationSeverity.LOW,
};

export interface ModerateTextOptions {
  field: ModerationField;
  profile: ModerationProfile;
}

// The one function every check in this system ultimately calls.
//
//   Unicode normalization + moderation representations (normalize.ts)
//     -> reserved/impersonation check (reserved.ts)
//     -> multilingual dictionary check, every representation, every
//        dictionary (matcher.ts) — this pass already covers separator,
//        leetspeak, and repeated-character obfuscation, since each
//        representation is tested directly rather than gated behind a
//        separate "did the plain form match" step.
export function moderateText(text: string, options: ModerateTextOptions): ModerationResult {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { allowed: true, normalizedText: trimmed };

  const reps = buildRepresentations(trimmed);

  const reserved = checkReserved(reps);
  if (reserved) {
    return { allowed: false, normalizedText: reps.compact, ...reserved };
  }

  const match = findFirstMatch(COMPILED_DICTIONARIES, reps);
  if (match) {
    const minSeverity = PROFILE_MIN_SEVERITY[options.profile];
    if (SEVERITY_RANK[match.severity] >= SEVERITY_RANK[minSeverity]) {
      return {
        allowed: false,
        normalizedText: reps.compact,
        category: match.category,
        severity: match.severity,
        language: match.language,
        matchedTerm: match.term,
        reason: 'Contains disallowed content',
      };
    }
  }

  return { allowed: true, normalizedText: reps.compact };
}

export function moderateUsername(text: string): ModerationResult {
  return moderateText(text, { field: 'username', profile: 'username' });
}

export function moderateDisplayName(text: string): ModerationResult {
  return moderateText(text, { field: 'displayName', profile: 'displayName' });
}

// §31 — logs enough to act on (who, which field, what category/severity/
// language) without ever writing the offending text or the matched term
// itself into application logs.
export function logModerationRejection(params: {
  userId?: string;
  field: ModerationField;
  result: ModerationResult;
}): void {
  const { userId, field, result } = params;
  logger.warn(
    {
      event: 'moderation_rejected',
      userId,
      field,
      category: result.category,
      severity: result.severity,
      language: result.language,
      action: 'REJECTED',
    },
    'Moderation: input rejected',
  );
}
