import { ModerationCategory, ModerationSeverity, ModerationTerm } from './types';

function t(term: string, category: ModerationCategory, severity: ModerationSeverity): ModerationTerm {
  return { term, category, severity, language: 'ne' };
}

const { PROFANITY, SEXUAL, HARASSMENT } = ModerationCategory;
const { LOW, MEDIUM, HIGH, CRITICAL } = ModerationSeverity;

// Curated Nepali Devanagari profanity/abuse (§8). Mild epithets that overlap
// with ordinary speech (गधा "donkey", कुकुर "dog", लाटो "silly", चोर "thief")
// are kept at LOW/MEDIUM severity rather than dropped outright — the strict
// username/displayName profile still rejects them (§34), but the severity is
// there so a future looser profile (bio/event) can let mild ones through
// without a dictionary change.
export const NEPALI_TERMS: ModerationTerm[] = [
  t('मुर्ख', HARASSMENT, MEDIUM),
  t('मूर्ख', HARASSMENT, MEDIUM),
  t('बेवकुफ', HARASSMENT, MEDIUM),
  t('बेवकूफ', HARASSMENT, MEDIUM),
  t('गधा', HARASSMENT, LOW),
  t('कुकुर', HARASSMENT, LOW),
  t('हरामी', PROFANITY, HIGH),
  t('हरामि', PROFANITY, HIGH),
  t('रन्डी', SEXUAL, HIGH),
  t('रण्डी', SEXUAL, HIGH),
  t('वेश्या', SEXUAL, HIGH),
  t('बोक्सी', HARASSMENT, MEDIUM),
  t('डाँका', HARASSMENT, MEDIUM),
  t('डाका', HARASSMENT, MEDIUM),
  t('चोर', HARASSMENT, LOW),
  t('लफंगा', HARASSMENT, MEDIUM),
  t('लफङ्गा', HARASSMENT, MEDIUM),
  t('फटाहा', HARASSMENT, MEDIUM),
  t('नालायक', HARASSMENT, MEDIUM),
  t('चुत', SEXUAL, CRITICAL),
  t('चुतिया', PROFANITY, HIGH),
  t('चुत्तिया', PROFANITY, HIGH),
  t('लाटो', HARASSMENT, LOW),
  t('लाटी', HARASSMENT, LOW),
  t('साला', HARASSMENT, LOW),
  t('साली', HARASSMENT, LOW),
];
