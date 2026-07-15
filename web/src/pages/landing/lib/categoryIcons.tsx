import type { IconType } from 'react-icons';
import {
  FaShirt, FaPlane, FaUtensils, FaMicrochip, FaGamepad, FaDumbbell,
  FaSprayCan, FaLeaf, FaHouse, FaMusic, FaPalette, FaPaw,
  FaSackDollar, FaCamera, FaFutbol, FaClapperboard, FaBagShopping,
  FaCalendarDays, FaTag,
} from 'react-icons/fa6';

// Real categories come from the database (arbitrary content an admin can add
// to at any time), so this maps known category names to a Font Awesome icon
// and falls back to a generic tag icon for anything unrecognized.
const CATEGORY_ICONS: Record<string, IconType> = {
  'Fashion': FaShirt,
  'Travel': FaPlane,
  'Food & Beverage': FaUtensils,
  'Technology': FaMicrochip,
  'Gaming': FaGamepad,
  'Fitness & Health': FaDumbbell,
  'Beauty': FaSprayCan,
  'Lifestyle': FaLeaf,
  'Home & Living': FaHouse,
  'Music': FaMusic,
  'Art & Design': FaPalette,
  'Pets': FaPaw,
  'Finance': FaSackDollar,
  'Photography': FaCamera,
  'Sports': FaFutbol,
  'Entertainment': FaClapperboard,
  'Retail & E-commerce': FaBagShopping,
  'Events & Hospitality': FaCalendarDays,
};

export function getCategoryIcon(name: string): IconType {
  return CATEGORY_ICONS[name] ?? FaTag;
}
