import {
  FaUserPlus, FaBriefcase, FaBullhorn, FaPaperPlane, FaHourglassHalf, FaWallet,
  FaMoneyBillWave, FaTriangleExclamation, FaEnvelope, FaShieldHalved, FaUserSlash,
  FaUserXmark, FaBell,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';
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

const TYPE_ICONS: Record<string, IconType> = {
  creator_joined:            FaUserPlus,
  business_joined:           FaBriefcase,
  campaign_created:          FaBullhorn,
  proposal_submitted:        FaPaperPlane,
  campaign_expired:          FaHourglassHalf,
  payment_release_pending:   FaWallet,
  money_withdrawn:           FaMoneyBillWave,
  issue_reported:            FaTriangleExclamation,
  contact_message:           FaEnvelope,
  account_verified:          FaShieldHalved,
  account_deactivated:       FaUserSlash,
  account_deleted:           FaUserXmark,
};

export function notificationIcon(type: string): IconType {
  return TYPE_ICONS[type] ?? FaBell;
}
