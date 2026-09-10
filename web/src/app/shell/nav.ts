import {
  LayoutDashboard,
  Compass,
  FileText,
  Briefcase,
  Wallet,
  UserRound,
  Settings,
  Users,
  CalendarDays,
  PackageCheck,
  CreditCard,
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
  { key: 'applications', to: '/creator/applications', icon: FileText },
  { key: 'myWork', to: '/creator/work', icon: Briefcase },
  { key: 'wallet', to: '/creator/wallet', icon: Wallet },
  { key: 'profile', to: '/creator/profile', icon: UserRound },
  { key: 'settings', to: '/creator/settings', icon: Settings },
];

const BUSINESS_NAV: NavItem[] = [
  { key: 'dashboard', to: '/business', icon: LayoutDashboard, end: true },
  { key: 'findCreators', to: '/business/creators', icon: Users },
  { key: 'events', to: '/business/events', icon: CalendarDays },
  { key: 'applications', to: '/business/applications', icon: FileText },
  { key: 'deliverables', to: '/business/deliverables', icon: PackageCheck },
  { key: 'payments', to: '/business/payments', icon: CreditCard },
  { key: 'profile', to: '/business/profile', icon: UserRound },
  { key: 'settings', to: '/business/settings', icon: Settings },
];

export function navFor(role: AppRole): NavItem[] {
  return role === 'BUSINESS' ? BUSINESS_NAV : CREATOR_NAV;
}
