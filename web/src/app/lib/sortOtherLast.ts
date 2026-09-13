import type { Category } from '../api/catalog';

/** Pins the catch-all "Other" row to the end of a picker — same convention
 *  mobile's `sortOtherLast` uses, so the two platforms present categories
 *  identically. Sort is stable, so every other row keeps its position. */
export function sortOtherLast(categories: Category[]): Category[] {
  const isOther = (c: Category) => c.key === 'other-industry' || c.key === 'other-provider' || c.name === 'Other';
  return [...categories].sort((a, b) => Number(isOther(a)) - Number(isOther(b)));
}
