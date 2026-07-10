export type AnalyticsRange = '7d' | '30d' | '90d' | '12mo' | 'all';

const RANGE_DAYS: Record<Exclude<AnalyticsRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12mo': 365,
};

export function parseRange(raw: unknown): AnalyticsRange {
  const value = typeof raw === 'string' ? raw : '30d';
  return (['7d', '30d', '90d', '12mo', 'all'] as const).includes(value as AnalyticsRange)
    ? (value as AnalyticsRange)
    : '30d';
}

/** null means "no lower bound" (the 'all' range). */
export function rangeStart(range: AnalyticsRange): Date | null {
  if (range === 'all') return null;
  const days = RANGE_DAYS[range];
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Day buckets for 7d/30d, month buckets for 90d/12mo/all — keeps chart series a sane length. */
export function bucketGranularity(range: AnalyticsRange): 'day' | 'month' {
  return range === '7d' || range === '30d' ? 'day' : 'month';
}

export function bucketKey(date: Date, granularity: 'day' | 'month'): string {
  const iso = date.toISOString();
  return granularity === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}
