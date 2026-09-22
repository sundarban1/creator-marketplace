import { ModerationCategory, ModerationSeverity, ModerationTerm } from './types';

function t(term: string, category: ModerationCategory, severity: ModerationSeverity): ModerationTerm {
  return { term, category, severity, language: 'ne-roman' };
}

const { PROFANITY, SEXUAL, HARASSMENT } = ModerationCategory;
const { LOW, MEDIUM, HIGH } = ModerationSeverity;

// Romanized Nepali (§9). Spelling variants are listed explicitly where common
// (muji/mujji, chutiya/chutiyaa/chutya) rather than relying on fuzzy matching
// to guess them — normalization (leetspeak/repeat-collapse) still catches
// further obfuscation of any of these on top of this list (§9: "normalization
// should handle many of them").
export const ROMANIZED_NEPALI_TERMS: ModerationTerm[] = [
  t('muji', PROFANITY, HIGH),
  t('mugi', PROFANITY, HIGH),
  t('mujji', PROFANITY, HIGH),
  // "0" reads visually as "o" (not "u") under the leetspeak table in
  // normalize.ts, so "m0ji"/"m00ji" resolve to "moji"/"mooji" rather than
  // back to "muji" itself — curated directly as known spellings of the same
  // evasion rather than widening the leet map (which would create false
  // positives elsewhere) or the repeat-collapse threshold (which would start
  // folding ordinary double letters).
  t('moji', PROFANITY, HIGH),
  t('mooji', PROFANITY, HIGH),
  t('chutiya', PROFANITY, HIGH),
  t('chutiyaa', PROFANITY, HIGH),
  t('chutya', PROFANITY, HIGH),
  t('randi', SEXUAL, HIGH),
  t('randii', SEXUAL, HIGH),
  t('harami', PROFANITY, HIGH),
  t('haraami', PROFANITY, HIGH),
  t('bokshi', HARASSMENT, MEDIUM),
  t('boksi', HARASSMENT, MEDIUM),
  t('bokchhi', HARASSMENT, MEDIUM),
  t('gadha', HARASSMENT, LOW),
  t('kukur', HARASSMENT, LOW),
  t('sala', HARASSMENT, LOW),
  t('saala', HARASSMENT, LOW),
  t('sali', HARASSMENT, LOW),
  t('saali', HARASSMENT, LOW),
  t('murkha', HARASSMENT, MEDIUM),
  t('murkho', HARASSMENT, MEDIUM),
  t('bewakuf', HARASSMENT, MEDIUM),
  t('bewakoof', HARASSMENT, MEDIUM),
  t('nalayak', HARASSMENT, MEDIUM),
  t('laphanga', HARASSMENT, MEDIUM),
  t('lafanga', HARASSMENT, MEDIUM),
  t('fataha', HARASSMENT, MEDIUM),
  t('chor', HARASSMENT, LOW),
  t('kamina', PROFANITY, MEDIUM),
  t('kamine', PROFANITY, MEDIUM),
];
