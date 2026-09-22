import { ModerationCategory, ModerationSeverity, ModerationRepresentations, ModerationTerm } from './types';
import { compileDictionary, findFirstMatch } from './matcher';

function t(term: string, severity: ModerationSeverity): ModerationTerm {
  return { term, category: ModerationCategory.RESERVED, severity, language: 'en' };
}

// System/staff handles reserved outright (§21). Matched boundary-aware, same
// as every dictionary — "administrator" blocks that exact handle, not every
// username starting with "admin".
export const RESERVED_STANDALONE_TERMS: ModerationTerm[] = [
  t('admin', ModerationSeverity.CRITICAL),
  t('administrator', ModerationSeverity.CRITICAL),
  t('support', ModerationSeverity.HIGH),
  t('customersupport', ModerationSeverity.HIGH),
  t('help', ModerationSeverity.MEDIUM),
  t('moderator', ModerationSeverity.HIGH),
  t('moderators', ModerationSeverity.HIGH),
  t('staff', ModerationSeverity.HIGH),
  t('team', ModerationSeverity.MEDIUM),
  t('security', ModerationSeverity.HIGH),
  t('billing', ModerationSeverity.HIGH),
  t('payments', ModerationSeverity.HIGH),
  t('finance', ModerationSeverity.HIGH),
  t('developer', ModerationSeverity.MEDIUM),
  t('developers', ModerationSeverity.MEDIUM),
  t('system', ModerationSeverity.HIGH),
  t('root', ModerationSeverity.HIGH),
  t('api', ModerationSeverity.MEDIUM),
];

const COMPILED_RESERVED = compileDictionary(RESERVED_STANDALONE_TERMS);

// §22 — plain "kolab", or "kolab" combined with an ordinary word
// ("kolabcreator", "kolabfan", "kolabpartner"), stays allowed. Only
// combinations that imply official authority are blocked. This list is the
// "configurable" surface §22 asks for — edit it here, nothing else changes.
export const KOLAB_AUTHORITY_WORDS = [
  'admin', 'administrator', 'official', 'support', 'staff', 'security',
  'team', 'moderator', 'mod', 'root', 'system', 'help', 'service', 'verified',
];

// "kolabadmin" has no boundary between "kolab" and "admin" (both letters), so
// the boundary-aware dictionary check above can never see it as two words —
// this is a deliberate, narrow exception that does a plain substring check,
// specifically for this brand+authority-word adjacency. It runs against the
// leetspeak/collapsed forms so "k0lab_official" / "k.o.l.a.b.o.f.f.i.c.i.a.l"
// are still caught once separators and leet substitutions are resolved.
function isKolabImpersonation(reps: ModerationRepresentations): boolean {
  const candidates = [reps.leetspeakNormalized, reps.collapsed];
  return candidates.some(
    (text) => text.includes('kolab') && KOLAB_AUTHORITY_WORDS.some((word) => text.includes(word)),
  );
}

export interface ReservedMatch {
  category: ModerationCategory;
  severity: ModerationSeverity;
  language: 'en';
  matchedTerm: string;
  reason: string;
}

export function checkReserved(reps: ModerationRepresentations): ReservedMatch | null {
  if (isKolabImpersonation(reps)) {
    return {
      category: ModerationCategory.IMPERSONATION,
      severity: ModerationSeverity.CRITICAL,
      language: 'en',
      matchedTerm: 'kolab-impersonation',
      reason: 'Impersonates Kolab staff or the Kolab brand',
    };
  }

  const match = findFirstMatch([COMPILED_RESERVED], reps);
  if (match) {
    return {
      category: match.category,
      severity: match.severity,
      language: match.language as 'en',
      matchedTerm: match.term,
      reason: 'Reserved system name',
    };
  }

  return null;
}
