import { ModerationCategory, ModerationSeverity, ModerationTerm } from './types';

function t(term: string, category: ModerationCategory, severity: ModerationSeverity): ModerationTerm {
  return { term, category, severity, language: 'hi-roman' };
}

const { PROFANITY, SEXUAL } = ModerationCategory;
const { MEDIUM, HIGH, CRITICAL } = ModerationSeverity;

// Romanized Hindi / Indian profanity (§11) — the layer the spec calls out as
// especially important, since this is how most Hindi profanity actually shows
// up in a Latin-script username field.
//
// Deliberately excluded: 2-letter abbreviations like "mc" and "bc". Even with
// boundary-aware matching they collide with too much legitimate text for a
// username field — "bc" reads as "before Christ" or a plain initialism, "mc"
// as a name prefix ("Mc-"), and both are common in birth-year-style handles
// ("bc1998", "mc07"). The false-positive cost of a 2-character token is too
// high relative to how often it's actually the slur; see docs/moderation.md.
export const ROMANIZED_HINDI_TERMS: ModerationTerm[] = [
  t('madarchod', PROFANITY, CRITICAL),
  t('madarchood', PROFANITY, CRITICAL),
  t('behenchod', PROFANITY, CRITICAL),
  t('bahenchod', PROFANITY, CRITICAL),
  t('bhenchod', PROFANITY, CRITICAL),
  t('benchod', PROFANITY, CRITICAL),
  t('bhosdike', SEXUAL, CRITICAL),
  t('bhosda', SEXUAL, CRITICAL),
  t('chutiya', PROFANITY, HIGH),
  t('chutiye', PROFANITY, HIGH),
  t('chutiyapa', PROFANITY, HIGH),
  t('randi', SEXUAL, HIGH),
  t('harami', PROFANITY, HIGH),
  t('haramzada', PROFANITY, HIGH),
  t('haramzadi', PROFANITY, HIGH),
  t('kamina', PROFANITY, MEDIUM),
  t('kamine', PROFANITY, MEDIUM),
  t('kaminey', PROFANITY, MEDIUM),
  t('gaand', SEXUAL, HIGH),
  t('gandu', PROFANITY, HIGH),
  t('gand', SEXUAL, HIGH),
  t('lavde', SEXUAL, HIGH),
  t('laude', SEXUAL, HIGH),
  t('lauda', SEXUAL, HIGH),
  t('loda', SEXUAL, HIGH),
  t('lund', SEXUAL, HIGH),
  t('chod', SEXUAL, HIGH),
  t('chodu', SEXUAL, HIGH),
];
