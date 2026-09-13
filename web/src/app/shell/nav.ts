import {
  LayoutDashboard,
  Compass,
  FileText,
  Briefcase,
  Wallet,
  UserRound,
  Settings,
  Users,
  Building2,
  CalendarDays,
  PackageCheck,
  CreditCard,
  MessageCircle,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '../api/auth';

export interface NavItem {
  /** i18n key under `nav.*` */
  key: string;
  to: string;
  icon: LucideIcon;
  /** Match only the exact path (dashboards), not `startsWith`. */
  end?: boolean;
}

const CREATOR_NAV: NavItem[] = [
  { key: 'dashboard', to: '/creator', icon: LayoutDashboard, end: true },
  { key: 'discoverEvents', to: '/creator/events', icon: Compass },
  { key: 'discoverCreators', to: '/creator/creators', icon: Users },
  { key: 'discoverBusinesses', to: '/creator/businesses', icon: Building2 },
  { key: 'applications', to: '/creator/applications', icon: FileText },
  { key: 'myWork', to: '/creator/work', icon: Briefcase },
  { key: 'messages', to: '/creator/messages', icon: MessageCircle },
  { key: 'wallet', to: '/creator/wallet', icon: Wallet },
  { key: 'profile', to: '/creator/profile', icon: UserRound },
  { key: 'settings', to: '/creator/settings', icon: Settings },
  { key: 'help', to: '/creator/support', icon: HelpCircle },
];

const BUSINESS_NAV: NavItem[] = [
  { key: 'dashboard', to: '/business', icon: LayoutDashboard, end: true },
  { key: 'findCreators', to: '/business/creators', icon: Users },
  { key: 'events', to: '/business/events', icon: CalendarDays },
  { key: 'applications', to: '/business/applications', icon: FileText },
  { key: 'messages', to: '/business/messages', icon: MessageCircle },
  { key: 'deliverables', to: '/business/deliverables', icon: PackageCheck },
  { key: 'payments', to: '/business/payments', icon: CreditCard },
  { key: 'profile', to: '/business/profile', icon: UserRound },
  { key: 'settings', to: '/business/settings', icon: Settings },
  { key: 'help', to: '/business/support', icon: HelpCircle },
];

export function navFor(role: AppRole): NavItem[] {
  return role === 'BUSINESS' ? BUSINESS_NAV : CREATOR_NAV;
}

// Curated subset for the mobile bottom tab bar — five slots max, so this picks
// the primary discover → apply/review → get-paid → profile path and leaves
// the rest (settings, help, deliverables/events) to the drawer.
const CREATOR_BOTTOM_KEYS = ['dashboard', 'discoverEvents', 'myWork', 'wallet', 'profile'];
const BUSINESS_BOTTOM_KEYS = ['dashboard', 'findCreators', 'applications', 'payments', 'profile'];

export function bottomNavFor(role: AppRole): NavItem[] {
  const keys = role === 'BUSINESS' ? BUSINESS_BOTTOM_KEYS : CREATOR_BOTTOM_KEYS;
  const items = navFor(role);
  return keys.map((key) => items.find((i) => i.key === key)).filter((i): i is NavItem => Boolean(i));
}
