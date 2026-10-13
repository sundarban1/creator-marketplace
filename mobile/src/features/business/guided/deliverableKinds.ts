// Deliverables are kept simple: what to make (video / story / photo post) and
// how many per creator. Which platform is a campaign-level choice, not a
// per-item one. Older campaigns and AI drafts still carry granular types
// (REEL, TIKTOK_VIDEO, …) and per-item platforms — these helpers fold them
// into the simple kinds without a data migration.

type Item = { type: string; platform?: string | null; quantity: number; notes?: string | null };

export const SIMPLE_KINDS = ['VIDEO', 'STORY', 'PHOTO_POST'] as const;
// Offered under "Add another deliverable", beyond the three core kinds.
export const EXTRA_KINDS = ['CAROUSEL', 'GOOGLE_REVIEW', 'BLOG_POST'] as const;
// Anything else the business types is stored as `CUSTOM:<their words>`
// (type is free-form server-side, max 40 chars).
export const CUSTOM_PREFIX = 'CUSTOM:';
export const MAX_CUSTOM_LABEL = 40 - CUSTOM_PREFIX.length;

const VIDEO_TYPES = new Set([
  'VIDEO', 'REEL', 'TIKTOK_VIDEO', 'YOUTUBE_SHORT', 'YOUTUBE_VIDEO', 'UGC_VIDEO',
  'PRODUCT_REVIEW', 'EVENT_COVERAGE', 'LIVE_STREAM',
]);

export function kindOf(type: string): string {
  if (VIDEO_TYPES.has(type)) return 'VIDEO';
  if (type === 'PHOTO') return 'PHOTO_POST';
  return type;
}

/** Merge items by kind (quantities summed, capped at 50), platform dropped. */
export function simplifyDeliverables<T extends Item>(items: T[]): Item[] {
  const byKind = new Map<string, Item>();
  for (const it of items) {
    const kind = kindOf(it.type);
    const prev = byKind.get(kind);
    if (prev) prev.quantity = Math.min(50, prev.quantity + it.quantity);
    else byKind.set(kind, { type: kind, platform: null, quantity: it.quantity, notes: it.notes ?? null });
  }
  const order = (k: string) => { const i = (SIMPLE_KINDS as readonly string[]).indexOf(k); return i < 0 ? SIMPLE_KINDS.length : i; };
  return Array.from(byKind.values()).sort((a, b) => order(a.type) - order(b.type));
}

/** Campaign platforms plus any a legacy item named, de-duplicated. */
export function deliverablePlatforms(platforms: string[] | undefined, items: Item[]): string[] {
  const seen = new Map<string, string>();
  for (const p of [...(platforms ?? []), ...items.map((i) => i.platform ?? '')]) {
    const k = p.trim().toLowerCase();
    if (k && k !== 'google' && !seen.has(k)) seen.set(k, p.trim());
  }
  return Array.from(seen.values());
}

export function deliverableLabel(type: string, t: (k: string) => string): string {
  if (type.startsWith(CUSTOM_PREFIX)) return type.slice(CUSTOM_PREFIX.length);
  return (SIMPLE_KINDS as readonly string[]).includes(type) ? t(`guided.kind_${type}`) : t(`guided.deliv_${type}`);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/s$/, '');

/** What the business picked or typed → the deliverable type to add, or the
 *  label of the row it duplicates ("videos" = Video, "Reel" = Video too). */
export function resolveNewDeliverable(
  input: string, existing: Item[], t: (k: string) => string,
): { type: string } | { duplicateOf: string } | null {
  const raw = input.trim().replace(/\s+/g, ' ');
  if (!raw) return null;
  const known = [...SIMPLE_KINDS, ...EXTRA_KINDS, ...VIDEO_TYPES] as string[];
  const preset = known.find((k) => k === raw)
    ?? known.find((k) => [t(`guided.deliv_${k}`), t(`guided.pick_${k}`), deliverableLabel(k, t)].some((l) => norm(l) === norm(raw)));
  const type = preset ? kindOf(preset) : `${CUSTOM_PREFIX}${raw.slice(0, MAX_CUSTOM_LABEL)}`;
  const label = norm(deliverableLabel(type, t));
  const dup = simplifyDeliverables(existing).find((i) => i.quantity > 0 && (i.type === type || norm(deliverableLabel(i.type, t)) === label));
  return dup ? { duplicateOf: deliverableLabel(dup.type, t) } : { type };
}

/** "1× Video, 2× Story, 1× Post" */
export function deliverableSummary<T extends Item>(items: T[], t: (k: string) => string): string {
  return simplifyDeliverables(items).map((d) => `${d.quantity}× ${deliverableLabel(d.type, t)}`).join(', ');
}
