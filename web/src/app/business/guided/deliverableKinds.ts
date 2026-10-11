// Deliverables are kept simple: what to make (video / story / photo post) and
// how many per creator. Which platform is a campaign-level choice, not a
// per-item one. Older campaigns and AI drafts still carry granular types
// (REEL, TIKTOK_VIDEO, …) and per-item platforms — these helpers fold them
// into the simple kinds without a data migration.

type Item = { type: string; platform?: string | null; quantity: number; notes?: string | null };

export const SIMPLE_KINDS = ['VIDEO', 'STORY', 'PHOTO_POST'] as const;

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
  return (SIMPLE_KINDS as readonly string[]).includes(type) ? t(`guided.kind_${type}`) : t(`guided.deliv_${type}`);
}

/** "1× Video, 2× Story, 1× Post" */
export function deliverableSummary<T extends Item>(items: T[], t: (k: string) => string): string {
  return simplifyDeliverables(items).map((d) => `${d.quantity}× ${deliverableLabel(d.type, t)}`).join(', ');
}
