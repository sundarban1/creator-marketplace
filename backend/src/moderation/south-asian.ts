import { ModerationCategory, ModerationSeverity, ModerationTerm } from './types';

function t(term: string, category: ModerationCategory, severity: ModerationSeverity): ModerationTerm {
  return { term, category, severity, language: 'south-asian' };
}

const { PROFANITY, HARASSMENT } = ModerationCategory;
const { HIGH, CRITICAL } = ModerationSeverity;

// Regional/Indian-English blends that don't cleanly fit one language bucket
// (§12) — mainly nation-directed harassment ("fuckindia" style) and the
// English-medium spelling social media actually uses for South Asian
// profanity. Core Hindi/Nepali roots already live in their own dictionaries
// (romanized-hindi.ts, romanized-nepali.ts) and are matched regardless of
// which file they're in — see index.ts, every dictionary is checked against
// every input.
//
// "mc" / "bc" / "ganduch" are deliberately excluded — see
// romanized-hindi.ts's note on 2-letter abbreviations, and "ganduch" isn't a
// term in real use worth the ambiguity.
export const SOUTH_ASIAN_TERMS: ModerationTerm[] = [
  t('fuckindia', HARASSMENT, CRITICAL),
  t('fucknepal', HARASSMENT, CRITICAL),
  t('fuckpakistan', HARASSMENT, CRITICAL),
  t('fuckbangladesh', HARASSMENT, CRITICAL),
  t('gandu', PROFANITY, HIGH),
  t('chutiya', PROFANITY, HIGH),
  t('harami', PROFANITY, HIGH),
  t('kamina', PROFANITY, HIGH),
  t('madarchod', PROFANITY, CRITICAL),
  t('bhenchod', PROFANITY, CRITICAL),
];
