// Boundary-aware matching primitives (§20). No `.includes()` as a primary
// matcher anywhere in this system — every dictionary/reserved lookup goes
// through `buildBoundaryRegex` below.

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A "word boundary" defined as *any script's* letter — not JS's built-in `\b`,
// which only understands [A-Za-z0-9_] and so treats Devanagari as all
// non-word characters (making `\b` match everywhere, i.e. nowhere useful) and
// treats a digit as a normal "word" character (making `\bterm\b` fail to
// catch "chutiya123").
//
// Concretely: a letter (any script, via \p{L}) immediately before/after the
// term blocks the match; a digit, underscore, punctuation, or the start/end
// of the string all count as a boundary. That's what lets:
//   - "gand"    reject inside "gandhi" / "gandaki"      (letter blocks it)
//   - "ass"     reject inside "assistant" / "classic"   (letter blocks it)
//   - "chutiya" still catch "chutiya123"                (digit is a boundary)
//   - "muji"    still catch "m.u.j.i" once compacted    (exact-string match)
export function buildBoundaryRegex(term: string): RegExp {
  const escaped = escapeRegExp(term);
  return new RegExp(`(?<![\\p{L}])(?:${escaped})(?![\\p{L}])`, 'u');
}

export function matchesBoundary(haystack: string, term: string): boolean {
  if (!term) return false;
  return buildBoundaryRegex(term).test(haystack);
}
