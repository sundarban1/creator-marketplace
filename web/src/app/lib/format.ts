/** Shared display formatting. Financial values are always NPR (spec §48). */

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  if (n < 10_000_000) return `${(n / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
  return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
}

export function rupees(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

/**
 * Budget line for an event. The spec is emphatic (§13, §31): the amount shown
 * must read as **per creator**, never as a total that could mislead. When the
 * business entered a total, we divide by the creator count for the per-creator
 * figure and label it accordingly.
 */
export function perCreatorBudget(e: {
  budgetMin: number;
  budgetMax: number;
  budgetInputType?: 'PER_CREATOR' | 'TOTAL' | null;
  totalBudget?: number | null;
  creatorsNeeded?: number;
}): { amount: string; perCreator: boolean } {
  const count = Math.max(1, e.creatorsNeeded ?? 1);

  let min = e.budgetMin;
  let max = e.budgetMax;
  if (e.budgetInputType === 'TOTAL') {
    min = e.budgetMin / count;
    max = e.budgetMax / count;
  }

  const amount = min === max ? rupees(min) : `${rupees(min)} – ${rupees(max)}`;
  return { amount, perCreator: true };
}

export function totalFollowers(accounts: { followers: number }[]): number {
  return accounts.reduce((sum, a) => sum + (a.followers || 0), 0);
}

/** Whether an ISO timestamp is still in the future. */
export function isFuture(iso: string | null | undefined): boolean {
  return iso != null && new Date(iso).getTime() > Date.now();
}

/** Sort comparator by ISO timestamp, ascending (soonest first). */
export function byDateAsc(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

export interface DeadlineInfo {
  /** whole days until the deadline; negative when past */
  days: number;
  urgent: boolean;
  closed: boolean;
  /** localised "Closes 3 Sept" style date, for the non-urgent case */
  dateLabel: string;
}

export function deadlineInfo(iso: string, locale: 'en' | 'ne' = 'en'): DeadlineInfo {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return {
    days,
    urgent: days >= 0 && days <= 7,
    closed: days < 0,
    dateLabel: new Date(iso).toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    }),
  };
}

/** Back-compat English label (used only where translation isn't wired). */
export function relativeDeadline(iso: string): { label: string; urgent: boolean } {
  const d = deadlineInfo(iso);
  if (d.closed) return { label: 'Closed', urgent: false };
  if (d.days === 0) return { label: 'Closes today', urgent: true };
  if (d.days === 1) return { label: 'Closes tomorrow', urgent: true };
  if (d.days <= 7) return { label: `${d.days} days left`, urgent: true };
  return { label: `Closes ${d.dateLabel}`, urgent: false };
}
