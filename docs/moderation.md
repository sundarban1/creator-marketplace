# Username & Display-Name Moderation

A deterministic, multilingual moderation system that rejects inappropriate
usernames and display names at signup and on profile updates. No external
API, no AI, no database table — it's a set of static TypeScript dictionaries
and precompiled regexes living entirely in the backend
(`backend/src/moderation/`).

## Why deterministic, not AI

Usernames/display names need a fast, offline, auditable decision on every
signup — no per-request external call, no non-determinism. AI moderation is a
better fit for free-form content (bios, event descriptions, chat) where
context matters; that's future work (see [Future: AI moderation](#future-ai-moderation)
below), not this system.

## Architecture

```text
User Input
    ↓
Unicode Normalization        (normalize.ts — NFKC)
    ↓
Moderation Representations   (normalize.ts — lowercase / compact / leetspeak / collapsed)
    ↓
Reserved / Impersonation Check (reserved.ts)
    ↓
Multilingual Dictionary Check (english.ts, nepali.ts, romanized-nepali.ts,
                                hindi.ts, romanized-hindi.ts, south-asian.ts,
                                matched via matcher.ts)
    ↓
Moderation Result             (types.ts)
    ↓
Allow / Reject
```

The dictionary check tests **every** normalized representation of the input
against **every** term in one pass (see `matcher.ts`'s `matchesRepresentations`).
That subsumes what would otherwise be a separate "obfuscation check" /
"pattern check" step later in the pipeline — a separator-obfuscated or
leetspeak-obfuscated string already produces a representation that matches
the same dictionary entry a plain string would, so there's no need for a
second pass. This is a deliberate efficiency choice (§32: no per-check work
beyond precompiled regex tests) that doesn't change what gets accepted or
rejected.

### Files

| File | Responsibility |
|---|---|
| `index.ts` | Public API — `moderateUsername`, `moderateDisplayName`, `moderateText`, `logModerationRejection`. Import from here only. |
| `types.ts` | `ModerationLanguage`, `ModerationCategory`, `ModerationSeverity`, `ModerationTerm`, `ModerationResult`, `ModerationRepresentations`. |
| `normalize.ts` | Builds the 6 comparison representations from raw input. |
| `patterns.ts` | `buildBoundaryRegex` — the one boundary-aware matching primitive everything else uses. |
| `matcher.ts` | Compiles a dictionary into regexes once, tests a term against all representations. |
| `reserved.ts` | Reserved system handles + the Kolab impersonation rule. |
| `english.ts`, `nepali.ts`, `romanized-nepali.ts`, `hindi.ts`, `romanized-hindi.ts`, `south-asian.ts` | Curated per-language dictionaries. |
| `moderation.test.ts` | Unit tests — the test matrix from the spec plus the false-positive regression set. |

## Supported languages

```ts
export type ModerationLanguage = 'en' | 'ne' | 'ne-roman' | 'hi' | 'hi-roman' | 'south-asian';
```

The system never tries to guess which language the input is in — it runs
**all** dictionaries against **all** input, every time (§3). A term appearing
in more than one dictionary (e.g. `chutiya` in both `romanized-nepali.ts` and
`romanized-hindi.ts`) is intentional, not a bug — it just means that root is
common to both languages' profanity.

## Normalization: the 6 representations

`normalize.ts`'s `buildRepresentations()` turns one input string into:

| Representation | How it's derived | What it catches |
|---|---|---|
| `original` | untouched | never used for matching — never stored differently either |
| `unicodeNormalized` | `.normalize('NFKC')` | fullwidth/compatibility Unicode variants, preserves every script |
| `lowercase` | `unicodeNormalized.toLowerCase()` | case variation (`FUCK`, `FuCk`) |
| `compact` | `lowercase` with `.`, `-`, `_`, `/`, `\`, and whitespace stripped | separator obfuscation (`m.u.j.i`, `f-u-c-k`) |
| `leetspeakNormalized` | `compact` with `0→o 1→i 3→e 4→a 5→s 7→t @→a $→s` | leetspeak substitution (`m4d4rchod`) |
| `collapsed` | `leetspeakNormalized` with runs of **3+** identical characters folded to 1 | repeated-character evasion (`muuuji` → `muji`) |

Every dictionary term is tested against `lowercase`, `compact`,
`leetspeakNormalized`, and `collapsed` in one pass (`unicodeNormalized`/
`lowercase` are the same string for pure-Devanagari input, since
`.toLowerCase()` is a no-op there).

The repeat-collapse threshold is **3, not 2**, specifically so ordinary double
letters ("Sagarr", "book", "committee") are never touched — only a repetition
long enough to look deliberate gets folded (§16, §37).

## Boundary-aware matching (the false-positive guard)

`patterns.ts`'s `buildBoundaryRegex(term)` is the single primitive every
dictionary/reserved lookup uses — **never** `.includes()`. It's not JS's
built-in `\b` (which only understands `[A-Za-z0-9_]`, so it's useless against
Devanagari and doesn't treat a digit as a boundary either). Instead:

```ts
new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'u')
```

A **letter in any script** immediately before/after the term blocks the
match; a digit, underscore, punctuation, or the start/end of the string all
count as a boundary. That one rule is what makes all of these work correctly
at once:

- `gand` rejects standalone, but **not** inside `Gandhi` or `Gandaki` (a
  letter follows `gand` in both — no boundary, no match).
- `ass` rejects standalone, but **not** inside `Assistant`, `Assam`, or
  `Classic`.
- `chutiya` still catches `chutiya123` (a digit is a boundary, even though
  JS's own `\b` would call the digit a "word character" and miss it).
- `muji` still catches `m.u.j.i` — once compacted, the whole string equals
  the term exactly.

## Dictionaries

Every dictionary is a plain array of:

```ts
interface ModerationTerm {
  term: string;
  category: ModerationCategory;   // PROFANITY | SEXUAL | HARASSMENT | SLUR | IMPERSONATION | RESERVED | SPAM
  severity: ModerationSeverity;   // LOW | MEDIUM | HIGH | CRITICAL
  language: ModerationLanguage;
}
```

**Adding a term**: pick the right file (or `south-asian.ts` if it's a
cross-language/regional blend), add one line. No matching code changes —
`compileDictionary()` in `index.ts` picks it up automatically.

### What's deliberately left out

- **`mc` / `bc`** (romanized Hindi 2-letter abbreviations) — excluded
  entirely. Even with boundary-aware matching, 2-character tokens collide
  with too much legitimate text for a username field: `bc` reads as "before
  Christ" or a plain initialism, `mc` as a name prefix (`Mc-`), and both show
  up constantly in birth-year-style handles (`bc1998`, `mc07`). See the
  comment in `romanized-hindi.ts`.
- **Racial/ethnic slurs beyond what's needed for the required test matrix** —
  the `SLUR` category and its plumbing exist, but the dictionaries are kept
  intentionally narrow. Populating it further is a policy decision, not a
  technical one — happy to extend once that's made explicitly.
- **A dedicated `SPAM` dictionary** — the category exists in `types.ts` for
  forward compatibility, but nothing populates it yet. Spam detection matters
  far more for bios/messages (repeated content, links) than for a 3-20
  character username, so it's left for whenever those fields are wired in.

## Reserved names & Kolab impersonation

`reserved.ts` has two independent checks:

1. **Standalone reserved words** (`admin`, `support`, `staff`, `root`, `api`,
   …) — matched the same boundary-aware way as any dictionary term.
2. **Kolab impersonation** — `kolab` alone, or combined with an ordinary word
   (`kolabcreator`, `kolabfan`, `kolabpartner`), is **allowed**. Only
   combinations with an authority-implying word are blocked:

   ```ts
   export const KOLAB_AUTHORITY_WORDS = [
     'admin', 'administrator', 'official', 'support', 'staff', 'security',
     'team', 'moderator', 'mod', 'root', 'system', 'help', 'service', 'verified',
   ];
   ```

   This is checked as a **plain substring** on the leetspeak/collapsed forms
   (not boundary-aware), because `kolabadmin` genuinely has no boundary
   between "kolab" and "admin" — both are letters. It's a narrow, deliberate
   exception scoped to this one brand+authority-word adjacency, not a general
   substring-matching fallback.

   To adjust the policy (§22 "make these rules configurable"), edit
   `KOLAB_AUTHORITY_WORDS` — nothing else needs to change.

## Severity & strictness profiles

```ts
type ModerationProfile = 'username' | 'displayName' | 'bio' | 'event' | 'message';
```

Only `username` and `displayName` are wired into any service today, and both
use `ModerationSeverity.LOW` as their minimum — i.e. **any** dictionary match,
regardless of severity, is rejected ("strict", per §34). `bio`/`event` default
to a `MEDIUM` floor so a future looser profile can let a mild/ambiguous term
(e.g. Nepali `गधा` "donkey", tagged `LOW`) through in a bio without a
dictionary change — see `PROFILE_MIN_SEVERITY` in `index.ts`. Wiring
enforcement into a new field is a call to `moderateText(text, { field, profile })`
at that field's write path; the engine itself doesn't change.

## Integration points

| Field | Where enforced | Error code |
|---|---|---|
| Creator `username` | `creator.service.ts` `updateProfile()` (submit) and `isUsernameAvailable()` (live-typing check) | `USERNAME_NOT_ALLOWED` |
| Creator `fullName` (display name) | `creator.service.ts` `updateProfile()` | `DISPLAY_NAME_NOT_ALLOWED` |
| Business `businessName` (display name) | `business.service.ts` `updateProfile()` | `DISPLAY_NAME_NOT_ALLOWED` |
| `fullName` / `businessName` at signup | `auth.service.ts` `register()` | `DISPLAY_NAME_NOT_ALLOWED` |

In this codebase, username and display name are actually set during
onboarding (`updateProfile`), not at `register()` — `register()` only takes
`email`/`phone`/`password`/`role` from the mobile/web signup screens today.
The `register()` check is defense-in-depth for any caller that *does* send
`fullName`/`businessName` directly (§25/§26: a malicious client calling the
API directly must not be able to bypass moderation), not the primary
enforcement point.

Format validation (Zod, e.g. `^[a-zA-Z0-9_]+$` for username) still happens
first, at the schema layer — moderation is a service-layer check that runs
after format validation and before the DB uniqueness lookup, exactly
matching the pipeline in §26/§27.

### Errors returned to the client

```json
{ "success": false, "message": "Please choose a different username.", "code": "USERNAME_NOT_ALLOWED" }
```

```json
{ "success": false, "message": "Please choose a different display name.", "code": "DISPLAY_NAME_NOT_ALLOWED" }
```

Both messages are plain `i18n` dictionary strings (`backend/src/i18n/{en,ne}.ts`)
— never the matched term, never a hint at which dictionary/language matched.
The frontend (mobile `login.tsx`, web `SignupScreen.tsx`/`CreatorOnboarding.tsx`)
already surfaces `AppError` messages generically (`err.message`) on these
forms, so no frontend changes were needed to show this inline — see each
screen's existing `catch (err) { setError(err.message) }` pattern.

The real-time username-availability check
(`GET /api/creator/username-available`) folds a moderated username into the
existing `{ available: false }` response rather than adding a new field, so
neither mobile nor web client code needed to change to benefit from it — a
moderated candidate just reads as "taken" while typing. This is a known,
intentional simplification: the wording ("this username is taken") isn't
perfectly accurate for a moderated-but-technically-free handle, but it's
functionally correct (the user can't have it either way) and ships without
touching two frontend codebases' response types. Precise real-time wording is
a good follow-up if it turns out to matter to users in practice.

## Logging (§31)

`logModerationRejection()` logs structured, non-identifying fields only —
**never** the input text or the matched term:

```ts
logger.warn({
  event: 'moderation_rejected',
  userId,
  field: 'username',
  category: 'PROFANITY',
  severity: 'HIGH',
  language: 'hi-roman',
  action: 'REJECTED',
}, 'Moderation: input rejected');
```

## No automatic account action

A rejected username/display name is just that — rejected. Nothing here
suspends, bans, flags for review, or rate-limits an account. Repeated abuse
is a trust & safety concern for a separate system, not this one (§30).

## Performance

Every dictionary is a static in-memory array; every term's regex is compiled
exactly once at module load (`compileDictionary()` in `matcher.ts`), not per
request. A single `moderateUsername()`/`moderateDisplayName()` call does no
I/O — no DB query, no external API — so it stays well under the <10ms target
regardless of load. Username *uniqueness* still requires the existing DB
lookup, unchanged; moderation runs before it, not as a replacement for it.

## Testing

`backend/src/moderation/moderation.test.ts` covers, per language: exact
terms, case variation, separator obfuscation, leetspeak, repeated-character
evasion, and — just as importantly — a legitimate-names regression set
(`Sundar`, `Gandhi`, `Gandaki`, `Assistant`, `Assam`, `Classic`, `Sussex`,
`Essex`, `Salahuddin`, `Randy`, `KolabCreator`, …) that must never be
rejected. Run it with:

```bash
cd backend && npx vitest run src/moderation/moderation.test.ts
```

When adding a new dictionary term, add both a rejection test for the term and
(if it's short or could plausibly be a substring of a real name/word) an
allow test for the closest legitimate collision you can think of.

## False-positive considerations (read before adding a term)

- **Prefer length ≥ 4** for a new term unless you've verified the exact
  collision risk (see the `mc`/`bc` exclusion above). Boundary-aware matching
  handles most short-term risk, but a 2-3 letter token combined with a digit
  suffix in a username is still a real false-positive vector worth thinking
  through case by case.
- **Check the term against common Nepali/Indian/English given names and
  place names** before adding it — this is exactly how `gand` (safe, thanks
  to boundary matching against `Gandhi`/`Gandaki`) was verified, and exactly
  why `randy` (an English first name, not a variant of `randi`) was
  deliberately *not* added despite looking similar.
- **Don't add ordinary vocabulary** just because it has an offensive-sounding
  reading in another context (§7, §37) — mild words with everyday meanings
  (Nepali `गधा` "donkey", Hindi `कुत्ता` "dog") are kept at `LOW`/`MEDIUM`
  severity rather than dropped, specifically so they still work correctly
  once a looser profile (bio/event) exists.
- **No fuzzy/edit-distance matching anywhere in this system** — every rule is
  a deterministic regex test against a fixed set of representations. If a
  new evasion pattern shows up in practice that isn't caught, add a curated
  variant to the dictionary (like `moji`/`mooji` next to `muji` in
  `romanized-nepali.ts`) rather than reaching for fuzzy matching.

## Future: AI moderation

Not implemented here by design (§41). The intended future pipeline:

```text
User Content
      ↓
Dictionary Rules      (this system)
      ↓
Pattern Rules
      ↓
Risk Rules
      ↓
AI Moderation (future)
      ↓
Allow / Flag / Reject
```

AI moderation is a better fit for contextual, free-form content — bios,
event descriptions, comments, chat messages — where meaning depends on more
than a fixed dictionary can express. Username/display-name checks are
short, high-volume, and need a deterministic answer on every signup; that's
what this system is for.
