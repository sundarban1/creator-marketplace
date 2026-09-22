import { ModerationCategory, ModerationSeverity, ModerationTerm } from './types';

function t(term: string, category: ModerationCategory, severity: ModerationSeverity): ModerationTerm {
  return { term, category, severity, language: 'en' };
}

const { PROFANITY, SEXUAL, HARASSMENT } = ModerationCategory;
const { LOW, MEDIUM, HIGH, CRITICAL } = ModerationSeverity;

// Curated common English profanity/sexual-content terms (§7). Deliberately
// does not include ordinary words that merely contain an offensive substring
// (e.g. "Scunthorpe", "Assistant") — that's handled by boundary-aware
// matching (patterns.ts), not by leaving words out of this list.
export const ENGLISH_TERMS: ModerationTerm[] = [
  // A short term like this is exactly why matching is boundary-aware (see
  // patterns.ts) rather than substring-based — "Assistant", "Assam" and
  // "Classic" must never trigger this.
  t('ass', PROFANITY, LOW),
  t('fuck', PROFANITY, HIGH),
  t('fucking', PROFANITY, HIGH),
  t('fucker', PROFANITY, HIGH),
  t('fuckboy', PROFANITY, MEDIUM),
  t('motherfucker', PROFANITY, CRITICAL),
  t('motherfucking', PROFANITY, CRITICAL),
  t('shit', PROFANITY, MEDIUM),
  t('bullshit', PROFANITY, MEDIUM),
  t('shithead', PROFANITY, MEDIUM),
  t('bitch', PROFANITY, HIGH),
  t('bitches', PROFANITY, HIGH),
  t('bastard', PROFANITY, MEDIUM),
  t('asshole', PROFANITY, HIGH),
  t('dick', PROFANITY, MEDIUM),
  t('dickhead', PROFANITY, MEDIUM),
  t('douchebag', PROFANITY, MEDIUM),
  t('twat', PROFANITY, HIGH),
  t('cunt', PROFANITY, CRITICAL),
  t('pussy', SEXUAL, HIGH),
  t('cock', SEXUAL, HIGH),
  t('whore', SEXUAL, HIGH),
  t('slut', SEXUAL, HIGH),
  t('slutty', SEXUAL, HIGH),
  t('porn', SEXUAL, HIGH),
  t('porno', SEXUAL, HIGH),
  t('pornstar', SEXUAL, HIGH),
  t('xxx', SEXUAL, HIGH),
  t('nude', SEXUAL, MEDIUM),
  t('nudes', SEXUAL, HIGH),
  t('naked', SEXUAL, LOW),
  t('sex', SEXUAL, MEDIUM),
  t('sexy', SEXUAL, LOW),
  t('blowjob', SEXUAL, HIGH),
  t('handjob', SEXUAL, HIGH),
  t('dildo', SEXUAL, HIGH),
  t('vibrator', SEXUAL, MEDIUM),
  t('penis', SEXUAL, MEDIUM),
  t('vagina', SEXUAL, MEDIUM),
  t('boobs', SEXUAL, MEDIUM),
  t('tits', SEXUAL, MEDIUM),
  t('titties', SEXUAL, MEDIUM),
  t('camgirl', SEXUAL, MEDIUM),
  t('onlyfans', SEXUAL, MEDIUM),
  t('escort', SEXUAL, MEDIUM),
  t('hooker', SEXUAL, HIGH),
  t('rape', HARASSMENT, CRITICAL),
  t('rapist', HARASSMENT, CRITICAL),
  t('pedo', HARASSMENT, CRITICAL),
  t('pedophile', HARASSMENT, CRITICAL),
  t('kill yourself', HARASSMENT, CRITICAL),
  t('retard', HARASSMENT, HIGH),
  t('retarded', HARASSMENT, HIGH),
  t('faggot', HARASSMENT, CRITICAL),
];
