// Shared types for the multilingual username/display-name moderation system.
// See docs/moderation.md for the architecture this backs.

export type ModerationLanguage =
  | 'en'
  | 'ne'
  | 'ne-roman'
  | 'hi'
  | 'hi-roman'
  | 'south-asian';

export enum ModerationCategory {
  PROFANITY = 'PROFANITY',
  SEXUAL = 'SEXUAL',
  HARASSMENT = 'HARASSMENT',
  SLUR = 'SLUR',
  IMPERSONATION = 'IMPERSONATION',
  RESERVED = 'RESERVED',
  SPAM = 'SPAM',
}

export enum ModerationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// A single curated dictionary entry. Dictionaries are plain arrays of these —
// see english.ts / nepali.ts / etc — so adding a term never means touching
// matching logic.
export interface ModerationTerm {
  term: string;
  category: ModerationCategory;
  severity: ModerationSeverity;
  language: ModerationLanguage;
}

// What every field this system moderates ultimately gets validated with.
// Only 'username' and 'displayName' are wired into any service yet — the rest
// exist so bio/event/message enforcement (§2, §41) is a wiring change, not a
// redesign.
export type ModerationField = 'username' | 'displayName' | 'bio' | 'event' | 'message';
export type ModerationProfile = 'username' | 'displayName' | 'bio' | 'event' | 'message';

// The backend-only result of a moderation check. `matchedTerm` exists for
// logging/debugging — callers MUST NOT send it to the client (see §5, §28).
export interface ModerationResult {
  allowed: boolean;
  normalizedText: string;
  category?: ModerationCategory;
  severity?: ModerationSeverity;
  language?: ModerationLanguage;
  matchedTerm?: string;
  reason?: string;
}

// The handful of comparison strings every check runs against. `original` is
// never altered or persisted differently — it's carried here only so callers
// can see what was actually typed alongside its normalized forms.
export interface ModerationRepresentations {
  original: string;
  unicodeNormalized: string;
  lowercase: string;
  compact: string;
  leetspeakNormalized: string;
  collapsed: string;
}
