import {
  UserPlus, Briefcase, Megaphone, Send, Clock, Wallet, Banknote,
  AlertTriangle, Mail, ShieldCheck, ShieldOff, UserX, Bell, type LucideIcon,
} from 'lucide-react';
import type { ApiNotification } from './api';

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Routes a notification to the most relevant admin page for its type.
export function notificationRoute(n: ApiNotification): string | null {
  switch (n.type) {
    case 'creator_joined':      return '/creators';
    case 'business_joined':     return '/businesses';
    case 'campaign_created':
    case 'proposal_submitted':
    case 'campaign_expired':
    case 'payment_release_pending':
      return n.refId ? `/campaigns/${n.refId}` : '/campaigns';
    case 'money_withdrawn':     return '/payments';
    case 'issue_reported':
    case 'contact_message':     return '/support-inbox';
    case 'account_verified':
    case 'account_deactivated':
    case 'account_deleted':     return '/users';
    default: return null;
  }
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  creator_joined:            UserPlus,
  business_joined:           Briefcase,
  campaign_created:          Megaphone,
  proposal_submitted:        Send,
  campaign_expired:          Clock,
  payment_release_pending:   Wallet,
  money_withdrawn:           Banknote,
  issue_reported:            AlertTriangle,
  contact_message:           Mail,
  account_verified:          ShieldCheck,
  account_deactivated:       ShieldOff,
  account_deleted:           UserX,
};

export function notificationIcon(type: string): LucideIcon {
  return TYPE_ICONS[type] ?? Bell;
}
