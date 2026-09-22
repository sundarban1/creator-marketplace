import { ModerationCategory, ModerationSeverity, ModerationTerm } from './types';

function t(term: string, category: ModerationCategory, severity: ModerationSeverity): ModerationTerm {
  return { term, category, severity, language: 'hi' };
}

const { PROFANITY, SEXUAL, HARASSMENT } = ModerationCategory;
const { LOW, MEDIUM, HIGH, CRITICAL } = ModerationSeverity;

// Curated Hindi Devanagari profanity (§10). Words with legitimate everyday
// meanings (कुत्ता "dog" used as a name for a pet, बदतमीज़ "rude") are kept at
// LOW/MEDIUM severity rather than left out, consistent with nepali.ts.
export const HINDI_TERMS: ModerationTerm[] = [
  t('मादरचोद', PROFANITY, CRITICAL),
  t('भेनचोद', PROFANITY, CRITICAL),
  t('बहनचोद', PROFANITY, CRITICAL),
  t('चूतिया', PROFANITY, HIGH),
  t('चूत', SEXUAL, CRITICAL),
  t('गांडू', PROFANITY, HIGH),
  t('गांड', PROFANITY, HIGH),
  t('रंडी', SEXUAL, HIGH),
  t('हरामी', PROFANITY, HIGH),
  t('हरामज़ादा', PROFANITY, HIGH),
  t('कमीना', PROFANITY, MEDIUM),
  t('कमीनी', PROFANITY, MEDIUM),
  t('साला', HARASSMENT, LOW),
  t('साली', HARASSMENT, LOW),
  t('लौड़ा', SEXUAL, HIGH),
  t('लंड', SEXUAL, HIGH),
  t('भोसड़ी', SEXUAL, CRITICAL),
  t('भोसड़ीके', SEXUAL, CRITICAL),
  t('कुत्ता', HARASSMENT, LOW),
  t('कुत्ती', HARASSMENT, LOW),
  t('नालायक', HARASSMENT, MEDIUM),
  t('बदतमीज़', HARASSMENT, LOW),
  t('बेवकूफ़', HARASSMENT, MEDIUM),
  t('गधा', HARASSMENT, LOW),
];
