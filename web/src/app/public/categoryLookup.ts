import type { IconType } from 'react-icons';
import { FaTag } from 'react-icons/fa';
import { getIconOption } from '../../lib/iconOptions';
import type { Category } from '../api/catalog';

export interface CategoryMeta {
  Icon: IconType;
  color: string;
}

const FALLBACK: CategoryMeta = { Icon: FaTag, color: '#6B7280' };

/**
 * Builds a `name -> {Icon, color}` resolver from the loaded category list, so a
 * creator/business card can render each of its category strings as an icon pill
 * (matching mobile's CategoryPillRow). Unknown names fall back to a plain tag.
 */
export function makeCategoryLookup(categories: Category[]): (name: string) => CategoryMeta {
  const byName = new Map(categories.map((c) => [c.name, c]));
  return (name) => {
    const c = byName.get(name);
    if (!c) return FALLBACK;
    return { Icon: getIconOption(c.icon)?.Icon ?? FaTag, color: c.color || FALLBACK.color };
  };
}
