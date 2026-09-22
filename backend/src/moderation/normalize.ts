import { ModerationRepresentations } from './types';

// Separators a user can insert between letters to spell a word out and dodge
// a naive filter — §14/§18. Deliberately narrow (no arbitrary punctuation) so
// this never eats characters that are part of the actual content.
const SEPARATOR_RE = /[.\-_/\\\s]+/g;

// Conservative leetspeak table (§15) — only digits/symbols with one obvious
// letter reading. No 8→b, 2→z, etc: those have enough legitimate numeric use
// (dates, counts) that guessing wrong creates false positives instead of
// catching evasion.
const LEET_RE = /[013457@$]/g;
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
};

function applyLeetspeak(input: string): string {
  return input.replace(LEET_RE, (ch) => LEET_MAP[ch] ?? ch);
}

// Collapses runs of 3+ identical characters down to one — "muuuji" -> "muji".
// Stops at 3 (not 2) specifically so ordinary double letters ("Sagar", "book")
// survive untouched; only a repetition long enough to look deliberate gets
// folded (§16, §37 — no aggressive fuzzy matching).
function collapseRepeats(input: string): string {
  return input.replace(/(.)\1{2,}/gu, '$1');
}

// Builds every comparison string a single input is checked against. Nothing
// here mutates or replaces the value a caller might persist — `original` is
// untouched, and every other field is purely for matching (§14, §19).
export function buildRepresentations(input: string): ModerationRepresentations {
  const original = input;
  // NFKC preserves Devanagari and other scripts as-is while folding
  // compatibility variants (fullwidth digits, etc) — never transliterates
  // between scripts (§17).
  const unicodeNormalized = input.normalize('NFKC');
  const lowercase = unicodeNormalized.toLowerCase();
  const compact = lowercase.replace(SEPARATOR_RE, '');
  const leetspeakNormalized = applyLeetspeak(compact);
  const collapsed = collapseRepeats(leetspeakNormalized);

  return { original, unicodeNormalized, lowercase, compact, leetspeakNormalized, collapsed };
}
