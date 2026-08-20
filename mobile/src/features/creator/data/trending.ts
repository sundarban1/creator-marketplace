import type { Campaign } from '@/types';

/**
 * Ranking for the Discover feed's "Trending" tab.
 *
 * "Trending" is not "popular" — a six-week-old campaign sitting on 80
 * applications is popular, but nothing is happening to it. What the tab should
 * surface is the events people are acting on *right now* and that a creator
 * can still get into. The old rule (`proposals >= 3`) couldn't tell those
 * apart, and left the tab ordered by post date like every other tab.
 *
 * A campaign's score is the product of four independent factors, so a campaign
 * has to be doing well on interest AND still be live to rank — a strong signal
 * on one axis can't fully paper over a dead one:
 *
 *     score = heat × freshness × urgency × contention
 *
 *   heat       how much creator interest, weighted toward interest *now*
 *   freshness  decay on how long ago it was posted
 *   urgency    boost as the sign-up deadline closes in
 *   contention boost as applications pile up against the slots on offer
 *
 * Ineligible campaigns (closed, full, past deadline, or nobody interested)
 * score 0 and drop out of the tab entirely rather than ranking last — a tab
 * of cold events is worse than a short tab.
 *
 * Everything runs client-side over the feed already in memory, same as the
 * New / Free / Ending-soon tabs, so switching tabs re-ranks instantly with no
 * round-trip. The one signal the client can't derive on its own — how many
 * applications arrived in the last 72h — is supplied by the API as
 * `recentProposals` (see CampaignRepository.countRecentApplications).
 */

/** Must match the backend's window — see CampaignRepository.TRENDING_WINDOW_HOURS. */
export const TRENDING_WINDOW_HOURS = 72;

// Weight on a *recent* application relative to an all-time one. At 3, a
// campaign that pulled 4 applications in the last three days outranks one
// that has quietly accumulated 60 since launch — which is the entire point of
// separating "trending" from "popular".
const RECENT_WEIGHT = 3;

// Age at which freshness has decayed to roughly half. Kept close to the 72h
// trending window: past about a week, a campaign needs real current velocity
// to still show up here.
const FRESHNESS_HALF_LIFE_DAYS = 3;
// >1 makes the decay curve steeper than linear, so week-old campaigns fall
// away faster than the first-few-days ones.
const FRESHNESS_DECAY_EXP = 1.2;

// How close to the deadline the urgency boost starts, and how large it gets.
const URGENCY_WINDOW_DAYS = 3;
const URGENCY_MAX_BOOST = 0.5;

// How large the boost gets once a campaign is fully subscribed (as many
// applications as slots) or beyond.
const CONTENTION_MAX_BOOST = 0.4;

// An estimated velocity is a guess spread evenly over a campaign's whole life,
// so it's discounted against a measured one — a campaign we actually know is
// hot should outrank one we're only assuming is.
const ESTIMATE_CONFIDENCE = 0.5;

// Floors that keep cold campaigns out of the tab. Either one qualifies: a
// brand-new campaign with a couple of applications today is trending, and so
// is an established one with steady all-time interest.
const MIN_RECENT_PROPOSALS = 1;
const MIN_TOTAL_PROPOSALS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function daysBetween(from: number, to: number): number {
  return (to - from) / DAY_MS;
}

/** Parses an API date, returning null for missing or malformed values. */
function parseDate(value: string | undefined | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Applications in the trending window. The API measures this exactly; when
 * it's absent — a cached feed written before the field existed, or an endpoint
 * that doesn't compute it — estimate from the all-time average rate so the tab
 * degrades to "popular, decayed" instead of going empty.
 */
function recentInterest(c: Campaign, ageDays: number): number {
  if (c.recentProposals != null) return c.recentProposals;
  const perDay = c.proposals / Math.max(ageDays, 1);
  const estimate = Math.min(c.proposals, perDay * (TRENDING_WINDOW_HOURS / 24));
  return estimate * ESTIMATE_CONFIDENCE;
}

/**
 * Whether a campaign can trend at all. Split out from the score so the reasons
 * a campaign is excluded stay readable, and so callers can ask the question
 * without paying for the arithmetic.
 */
export function isTrendingEligible(c: Campaign, now = Date.now()): boolean {
  // The feed only serves active campaigns, but a cached feed can outlive that.
  if (c.status && c.status !== 'active') return false;
  // A full or closed event can't be joined, however hot it is.
  if (c.eventStatus === 'FULL' || c.eventStatus === 'CLOSED') return false;

  // Sign-ups have closed — for a free event the registration deadline is the
  // gate, not the event date itself.
  const deadline = parseDate(c.deadline);
  if (deadline != null && deadline < now) return false;

  // Deliberately NOT excluded on `proposals >= capacity/creatorsNeeded`:
  // those count applications, not hires. Ten creators applying for one slot is
  // an oversubscribed campaign, not a closed one — nobody is in until the
  // business accepts them, which is what flips eventStatus/status above.

  const ageDays = Math.max(0, daysBetween(parseDate(c.createdAt) ?? now, now));
  return recentInterest(c, ageDays) >= MIN_RECENT_PROPOSALS || c.proposals >= MIN_TOTAL_PROPOSALS;
}

/**
 * Trending score, higher is hotter. Returns 0 for anything ineligible, so
 * `score > 0` is the same question as `isTrendingEligible`.
 */
export function trendingScore(c: Campaign, now = Date.now()): number {
  if (!isTrendingEligible(c, now)) return 0;

  const ageDays = Math.max(0, daysBetween(parseDate(c.createdAt) ?? now, now));

  // ── heat: recent applications dominate; all-time interest is logged so a
  // long-running campaign's back catalogue can't drown out today's momentum.
  const heat = RECENT_WEIGHT * recentInterest(c, ageDays) + Math.log2(1 + c.proposals);

  // ── freshness: gravity decay on age, the same shape as a news-feed ranking.
  const freshness = 1 / Math.pow(1 + ageDays / FRESHNESS_HALF_LIFE_DAYS, FRESHNESS_DECAY_EXP);

  // ── urgency: ramps up over the last URGENCY_WINDOW_DAYS before sign-ups
  // close. Campaigns with no deadline set simply don't get the boost.
  const deadline = parseDate(c.deadline);
  const daysLeft = deadline != null ? daysBetween(now, deadline) : null;
  const urgency = daysLeft == null
    ? 1
    : 1 + URGENCY_MAX_BOOST * clamp01((URGENCY_WINDOW_DAYS - daysLeft) / URGENCY_WINDOW_DAYS);

  // ── contention: applications per available slot. Creators chase what other
  // creators are chasing, so a contested opportunity reads as hot — capped at
  // 1x oversubscribed so a runaway campaign can't ride this factor alone.
  const slots = c.capacity ?? c.creatorsNeeded ?? 0;
  const contested = slots > 0 ? clamp01(c.proposals / slots) : 0;
  const contention = 1 + CONTENTION_MAX_BOOST * contested;

  return heat * freshness * urgency * contention;
}

/**
 * Scores a feed once and returns the id → score map for everything that
 * qualifies. Callers filter on `has(id)` and sort on `get(id)`, so the score
 * is computed once per campaign per feed rather than once per comparison.
 */
export function trendingScores(campaigns: Campaign[], now = Date.now()): Map<string, number> {
  const scores = new Map<string, number>();
  for (const c of campaigns) {
    const score = trendingScore(c, now);
    if (score > 0) scores.set(c.id, score);
  }
  return scores;
}
