import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Star,
  Briefcase,
  Megaphone,
  CreditCard,
  FileBarChart,
  Settings,
  Tag,
  Share2,
  Gift,
  LogOut,
  X,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  BookOpen,
  Scale,
  Mail,
  Gauge,
  Quote,
  FileSignature,
  Building2,
  ScrollText,
  History,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type NavItem = { to: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { to: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
      { to: '/admin/users',      label: 'Users',      icon: Users           },
      { to: '/admin/creators',   label: 'Creators',   icon: Star            },
      { to: '/admin/businesses', label: 'Businesses', icon: Briefcase       },
      { to: '/admin/verification', label: 'Verification', icon: ShieldCheck },
      { to: '/admin/campaigns',  label: 'Events',     icon: Megaphone       },
      { to: '/admin/creator-meetups', label: 'Creator Meetups', icon: CalendarDays },
      { to: '/admin/categories', label: 'Categories', icon: Tag             },
      { to: '/admin/platforms',  label: 'Platforms',  icon: Share2          },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { to: '/admin/conversations', label: 'Conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/admin/payments',   label: 'Payments',   icon: CreditCard   },
      { to: '/admin/referrals',  label: 'Referrals',  icon: Gift         },
      { to: '/admin/reports',    label: 'Reports',    icon: FileBarChart },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/admin/help-center',   label: 'Help Center',   icon: HelpCircle    },
      { to: '/admin/faqs',          label: 'FAQs',          icon: BookOpen      },
      { to: '/admin/success-stories', label: 'Success Stories', icon: Quote     },
      { to: '/admin/get-in-touch',  label: 'Get in Touch',  icon: Mail          },
      { to: '/admin/support-inbox', label: 'Support Inbox', icon: MessageCircle },
      { to: '/admin/legal',         label: 'Legal',         icon: Scale         },
      { to: '/admin/contracts',     label: 'Contracts',     icon: FileSignature },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/contact-info', label: 'Company',     icon: Building2 },
      { to: '/admin/settings',     label: 'Settings',    icon: Settings },
      { to: '/admin/rate-limits',  label: 'Rate Limits', icon: Gauge    },
      { to: '/admin/audit-logs',   label: 'Audit Logs',  icon: ScrollText },
      { to: '/admin/activity-logs', label: 'Activity Logs', icon: History },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    onClose();
    logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-lp-black/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel — a glass rail in the landing style: white in light,
          translucent navy in dark, gradient pill for the active page. */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-30 flex flex-col
          bg-white/85 border-r border-gray-200 backdrop-blur-xl
          dark:bg-lp-navy-2/80
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <img src="/logo-flat.svg" alt="Kolab" className="h-7 w-auto object-contain" />
            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-lp-accent-ink">
              Admin
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto scrollbar-hide">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.14em] px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-lp-brinjal via-[#8B5CF6] to-lp-orange text-white font-medium shadow-[0_10px_30px_-12px_rgba(99,102,241,0.7)]'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon size={17} strokeWidth={1.75} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-200 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-br from-lp-orange via-[#C04FD0] to-lp-brinjal flex-shrink-0">
              <div className="w-full h-full rounded-full bg-lp-brinjal flex items-center justify-center text-white text-xs font-semibold">
                {user ? initials(user.name) : 'SA'}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-900 font-medium truncate">{user?.name ?? 'Super Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email ?? 'admin@creatorhub.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={17} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
