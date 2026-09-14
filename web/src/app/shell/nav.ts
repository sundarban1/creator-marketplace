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
  Tag,
  Gift,
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

/** A labeled section of the sidebar — mirrors the admin dashboard's grouped
 *  nav (Platform / Messaging / Finance / Support / System). */
export interface NavGroup {
  /** i18n key under `nav.group*` */
  labelKey: string;
  items: NavItem[];
}

const CREATOR_NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'groupMain',
    items: [
      { key: 'dashboard', to: '/creator', icon: LayoutDashboard, end: true },
      { key: 'profile', to: '/creator/profile', icon: UserRound },
    ],
  },
  {
    labelKey: 'groupDiscover',
    items: [
      { key: 'discoverEvents', to: '/creator/events', icon: Compass },
      { key: 'discoverCreators', to: '/creator/creators', icon: Users },
      { key: 'discoverBusinesses', to: '/creator/businesses', icon: Building2 },
    ],
  },
  {
    labelKey: 'groupWork',
    items: [
      { key: 'myApplications', to: '/creator/applications', icon: FileText },
      { key: 'myWork', to: '/creator/work', icon: Briefcase },
      { key: 'messages', to: '/creator/messages', icon: MessageCircle },
    ],
  },
  {
    labelKey: 'groupFinance',
    items: [
      { key: 'wallet', to: '/creator/wallet', icon: Wallet },
      { key: 'referFriend', to: '/creator/referrals', icon: Gift },
    ],
  },
  {
    labelKey: 'groupAccount',
    items: [
      { key: 'settings', to: '/creator/settings', icon: Settings },
      { key: 'help', to: '/creator/support', icon: HelpCircle },
    ],
  },
];

const BUSINESS_NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'groupMain',
    items: [
      { key: 'dashboard', to: '/business', icon: LayoutDashboard, end: true },
      { key: 'profile', to: '/business/profile', icon: UserRound },
    ],
  },
  {
    labelKey: 'groupMarketplace',
    items: [
      { key: 'findCreators', to: '/business/creators', icon: Users },
      { key: 'events', to: '/business/events', icon: CalendarDays },
      { key: 'promotions', to: '/business/promotions', icon: Tag },
    ],
  },
  {
    labelKey: 'groupWork',
    items: [
      { key: 'applications', to: '/business/applications', icon: FileText },
      { key: 'messages', to: '/business/messages', icon: MessageCircle },
      { key: 'deliverables', to: '/business/deliverables', icon: PackageCheck },
    ],
  },
  {
    labelKey: 'groupFinance',
    items: [
      { key: 'payments', to: '/business/payments', icon: CreditCard },
      { key: 'referBusiness', to: '/business/referrals', icon: Gift },
    ],
  },
  {
    labelKey: 'groupAccount',
    items: [
      { key: 'settings', to: '/business/settings', icon: Settings },
      { key: 'help', to: '/business/support', icon: HelpCircle },
    ],
  },
];

export function navGroupsFor(role: AppRole): NavGroup[] {
  return role === 'BUSINESS' ? BUSINESS_NAV_GROUPS : CREATOR_NAV_GROUPS;
}

export function navFor(role: AppRole): NavItem[] {
  return navGroupsFor(role).flatMap((g) => g.items);
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
