import { ModerationRepresentations, ModerationTerm } from './types';
import { buildBoundaryRegex } from './patterns';

export interface CompiledTerm {
  term: ModerationTerm;
  regex: RegExp;
}

// Regexes are compiled once, at module load, from the static dictionaries —
// never per-request (§32 performance: no per-check regex construction).
export function compileDictionary(entries: ModerationTerm[]): CompiledTerm[] {
  return entries.map((entry) => ({
    term: entry,
    regex: buildBoundaryRegex(entry.term.toLowerCase()),
  }));
}

// Tests one compiled term against every normalized representation of the
// input. Running all four together (rather than only falling back to the
// obfuscated forms when the plain form misses) is one linear pass per term
// instead of up to four — see docs/moderation.md's note on why this folds
// the pipeline diagram's separate "obfuscation check" step in here.
export function matchesRepresentations(compiled: CompiledTerm, reps: ModerationRepresentations): boolean {
  const { regex } = compiled;
  return (
    regex.test(reps.lowercase) ||
    regex.test(reps.compact) ||
    regex.test(reps.leetspeakNormalized) ||
    regex.test(reps.collapsed)
  );
}

// Returns the first matching term across an ordered list of compiled
// dictionaries, or null. Order only matters for which `language` tag comes
// back on a term that happens to appear (deliberately) in more than one
// dictionary — it never affects whether something matches.
export function findFirstMatch(
  compiledDictionaries: CompiledTerm[][],
  reps: ModerationRepresentations,
): ModerationTerm | null {
  for (const dictionary of compiledDictionaries) {
    for (const entry of dictionary) {
      if (matchesRepresentations(entry, reps)) return entry.term;
    }
  }
  return null;
}
