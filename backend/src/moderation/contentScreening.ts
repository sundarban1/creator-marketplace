// Pre-publication screening for user-generated content (Apple 1.2: "a method
// for filtering objectionable material from being posted").
//
// Two layers:
//   1. Local multilingual dictionary (this module's sibling files) — English,
//      Nepali (Devanagari), romanized Nepali, Hindi, romanized Hindi, with
//      leetspeak/separator/repeat normalization. Synchronous, no network,
//      never fails. This is the ONLY layer on the chat hot path.
//   2. OpenAI omni-moderation (free endpoint, multilingual, text + images) —
//      only on publish/edit paths (profiles, events, competitions, portfolio,
//      submissions, image uploads), never on reads or feeds. Bounded by a
//      short timeout so a slow provider can't stall a request for long.
//
// Outcomes: APPROVED (publish), PENDING_REVIEW (publish only after an admin
// approves — used where a review gate exists, e.g. events), REJECTED (block
// with a generic message; the matched term is never echoed back).
//
// Provider failure never silently approves gated content: callers that have
// a review gate pass `holdOnError` and get PENDING_REVIEW; others publish on
// the local layer's verdict and a MODERATION_SERVICE_ERROR event lists the
// item for an admin to look at.
import OpenAI from 'openai';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { moderateText } from './index';
import { AppError } from '../middleware/error';
import { ModerationCategory, ModerationSeverity, type ModerationProfile } from './types';

export type ScreenOutcome = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';

export interface ScreenResult {
  outcome: ScreenOutcome;
  // Which field tripped it (for a field-level error), never the term itself.
  field?: string;
  categories?: string[];
  source?: 'dictionary' | 'ai' | 'ai_unavailable';
}

export interface ScreenContext {
  userId?: string;
  contentType: string; // 'creator_bio' | 'event' | 'competition' | 'portfolio_item' | 'image' | ...
  contentId?: string;
  // Content type has an admin review gate → hold for review if the AI layer
  // is unavailable instead of publishing on the dictionary alone.
  holdOnError?: boolean;
}

const AI_TIMEOUT_MS = 6000;
const APPROVED: ScreenResult = { outcome: 'APPROVED' };

// Categories that are rejected outright when OpenAI flags them; anything else
// flagged is held for human review (ambiguous → human).
const REJECT_CATEGORIES = new Set(['sexual/minors', 'hate/threatening', 'harassment/threatening', 'violence/graphic', 'self-harm/instructions', 'illicit/violent']);
const REJECT_SCORE = 0.9;

let client: OpenAI | null = null;
function ai(): OpenAI | null {
  if (!env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: AI_TIMEOUT_MS, maxRetries: 1 });
  return client;
}

/** True when the AI layer is configured (it's optional — dictionary always runs). */
export function aiScreeningEnabled(): boolean {
  return !!env.OPENAI_API_KEY && env.NODE_ENV !== 'test';
}

// ── Layer 1: dictionary ─────────────────────────────────────────────────────

const SEVERITY_RANK: Record<ModerationSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/**
 * Local check over several fields. HIGH/CRITICAL → REJECTED. MEDIUM →
 * PENDING_REVIEW when `reviewable`, else REJECTED. LOW (mild profanity) only
 * matters for names, which use the stricter moderateUsername path elsewhere.
 */
export function screenTextLocal(fields: Record<string, string | null | undefined>, profile: ModerationProfile, opts: { reviewable?: boolean } = {}): ScreenResult {
  let held: ScreenResult | null = null;
  for (const [field, value] of Object.entries(fields)) {
    if (!value || !value.trim()) continue;
    const r = moderateText(value, { field: profile, profile });
    if (r.allowed || !r.severity) continue;
    const rank = SEVERITY_RANK[r.severity];
    if (rank >= SEVERITY_RANK.HIGH || (rank === SEVERITY_RANK.MEDIUM && !opts.reviewable)) {
      return { outcome: 'REJECTED', field, categories: r.category ? [r.category] : undefined, source: 'dictionary' };
    }
    if (rank === SEVERITY_RANK.MEDIUM) held ??= { outcome: 'PENDING_REVIEW', field, categories: r.category ? [r.category] : undefined, source: 'dictionary' };
  }
  return held ?? APPROVED;
}

/**
 * Chat: dictionary only (no network on the hot path). Private messages between
 * adults aren't policed for ordinary swearing — only slurs, sexual content,
 * harassment and anything CRITICAL are blocked; the rest is handled by
 * report → moderation.
 */
export function screenChatMessage(text: string): ScreenResult {
  const r = moderateText(text, { field: 'message', profile: 'message' });
  const severe = !!r.severity && (
    r.severity === ModerationSeverity.CRITICAL
    || (SEVERITY_RANK[r.severity] >= SEVERITY_RANK.HIGH && r.category !== ModerationCategory.PROFANITY)
  );
  if (!r.allowed && severe) {
    return { outcome: 'REJECTED', field: 'content', categories: r.category ? [r.category] : undefined, source: 'dictionary' };
  }
  return APPROVED;
}

// ── Layer 2: AI ─────────────────────────────────────────────────────────────

type AiInput = Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

async function aiCheck(inputs: AiInput): Promise<ScreenResult | 'error'> {
  const c = ai();
  if (!c || env.NODE_ENV === 'test' || !inputs.length) return APPROVED;
  try {
    const res = await c.moderations.create({ model: 'omni-moderation-latest', input: inputs as never });
    let held: ScreenResult | null = null;
    for (const r of res.results) {
      if (!r.flagged) continue;
      const flagged = Object.entries(r.categories).filter(([, v]) => v).map(([k]) => k);
      const scores = r.category_scores as unknown as Record<string, number>;
      const severe = flagged.some((k) => REJECT_CATEGORIES.has(k) || (scores[k] ?? 0) >= REJECT_SCORE);
      if (severe) return { outcome: 'REJECTED', categories: flagged, source: 'ai' };
      held ??= { outcome: 'PENDING_REVIEW', categories: flagged, source: 'ai' };
    }
    return held ?? APPROVED;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'AI content screening unavailable');
    return 'error';
  }
}

async function recordEvent(type: 'CONTENT_AUTO_REJECTED' | 'CONTENT_HELD_FOR_REVIEW' | 'MODERATION_SERVICE_ERROR', ctx: ScreenContext, result?: ScreenResult) {
  await prisma.moderationEvent.create({
    data: {
      type,
      actorUserId: ctx.userId ?? null,
      targetUserId: ctx.userId ?? null,
      contentType: ctx.contentType,
      contentId: ctx.contentId ?? null,
      metadata: { field: result?.field ?? null, categories: result?.categories ?? null, source: result?.source ?? null } as Prisma.InputJsonValue,
    },
  }).catch((err) => logger.error({ err }, 'Failed to record moderation event'));
}

/**
 * Full screening for publishable content. Never throws — callers decide what
 * to do with the outcome (see `rejectIfBlocked` for the common case).
 */
export async function screenContent(
  input: { texts?: Record<string, string | null | undefined>; imageUrls?: (string | null | undefined)[]; profile?: ModerationProfile },
  ctx: ScreenContext,
): Promise<ScreenResult> {
  const local = screenTextLocal(input.texts ?? {}, input.profile ?? 'event', { reviewable: !!ctx.holdOnError });
  if (local.outcome === 'REJECTED') {
    void recordEvent('CONTENT_AUTO_REJECTED', ctx, local);
    return local;
  }

  const inputs: AiInput = [];
  const text = Object.values(input.texts ?? {}).filter((v): v is string => !!v && !!v.trim()).join('\n\n').slice(0, 20_000);
  if (text) inputs.push({ type: 'text', text });
  for (const url of input.imageUrls ?? []) if (url && /^(https:|data:image\/)/.test(url)) inputs.push({ type: 'image_url', image_url: { url } });

  const aiResult = aiScreeningEnabled() ? await aiCheck(inputs) : APPROVED;
  if (aiResult === 'error') {
    void recordEvent('MODERATION_SERVICE_ERROR', ctx, { outcome: 'PENDING_REVIEW', source: 'ai_unavailable' });
    if (ctx.holdOnError) return { outcome: 'PENDING_REVIEW', source: 'ai_unavailable' };
    return local;
  }
  const worst = aiResult.outcome === 'REJECTED' ? aiResult : local.outcome === 'PENDING_REVIEW' ? local : aiResult;
  if (worst.outcome === 'REJECTED') void recordEvent('CONTENT_AUTO_REJECTED', ctx, worst);
  else if (worst.outcome === 'PENDING_REVIEW') void recordEvent('CONTENT_HELD_FOR_REVIEW', ctx, worst);
  return worst;
}

/** Image buffer → data URL for screening before it is uploaded anywhere. */
export function bufferToDataUrl(buf: Buffer, mime: string): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export const CONTENT_REJECTED_MESSAGE = 'This content doesn’t meet the Kolab Community Guidelines. Please edit it and try again.';

/**
 * Throws the generic 422 for content that can't be published. `gated` = the
 * content type has an admin review queue that a PENDING_REVIEW result is
 * routed into by the caller; without one, anything not APPROVED is refused
 * (conservative default — nothing ambiguous goes live unreviewed).
 */
export function enforceScreen(result: ScreenResult, opts: { gated?: boolean } = {}): void {
  if (result.outcome === 'APPROVED') return;
  if (result.outcome === 'PENDING_REVIEW' && (opts.gated || result.source === 'ai_unavailable')) return;
  throw new AppError(CONTENT_REJECTED_MESSAGE, 422, true, { code: 'CONTENT_REJECTED', field: result.field });
}
