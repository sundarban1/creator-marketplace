import type { IconType } from 'react-icons';
import {
  FaShirt, FaPlane, FaUtensils, FaMicrochip, FaGamepad, FaDumbbell,
  FaSprayCan, FaLeaf, FaHouse, FaMusic, FaPalette, FaPaw,
  FaSackDollar, FaCamera, FaFutbol, FaClapperboard, FaBagShopping,
  FaCalendarDays, FaTag,
} from 'react-icons/fa6';

interface CategoryStyle {
  icon: IconType;
  color: string;
}

// Real categories come from the database (arbitrary content an admin can add
// to at any time), so this maps known category names to a Font Awesome icon
// and a thematically relevant color, falling back to a generic tag icon in
// neutral gray for anything unrecognized.
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'Fashion': { icon: FaShirt, color: '#DB2777' },
  'Travel': { icon: FaPlane, color: '#0EA5E9' },
  'Food & Beverage': { icon: FaUtensils, color: '#F97316' },
  'Technology': { icon: FaMicrochip, color: '#2563EB' },
  'Gaming': { icon: FaGamepad, color: '#7C3AED' },
  'Fitness & Health': { icon: FaDumbbell, color: '#DC2626' },
  'Beauty': { icon: FaSprayCan, color: '#EC4899' },
  'Lifestyle': { icon: FaLeaf, color: '#059669' },
  'Home & Living': { icon: FaHouse, color: '#B45309' },
  'Music': { icon: FaMusic, color: '#8B5CF6' },
  'Art & Design': { icon: FaPalette, color: '#C026D3' },
  'Pets': { icon: FaPaw, color: '#D97706' },
  'Finance': { icon: FaSackDollar, color: '#16A34A' },
  'Photography': { icon: FaCamera, color: '#475569' },
  'Sports': { icon: FaFutbol, color: '#EA580C' },
  'Entertainment': { icon: FaClapperboard, color: '#E11D48' },
  'Retail & E-commerce': { icon: FaBagShopping, color: '#0891B2' },
  'Events & Hospitality': { icon: FaCalendarDays, color: '#9333EA' },
};

const DEFAULT_STYLE: CategoryStyle = { icon: FaTag, color: '#6B7280' };

export function getCategoryStyle(name: string): CategoryStyle {
  return CATEGORY_STYLES[name] ?? DEFAULT_STYLE;
}
