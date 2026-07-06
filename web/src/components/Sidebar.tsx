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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type NavItem = { to: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
      { to: '/users',      label: 'Users',      icon: Users           },
      { to: '/creators',   label: 'Creators',   icon: Star            },
      { to: '/businesses', label: 'Businesses', icon: Briefcase       },
      { to: '/campaigns',  label: 'Campaigns',  icon: Megaphone       },
      { to: '/categories', label: 'Categories', icon: Tag             },
      { to: '/platforms',  label: 'Platforms',  icon: Share2          },
    ],
  },
  {
    label: 'Messaging',
    items: [
      { to: '/conversations', label: 'Conversations', icon: MessageSquare },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payments',   label: 'Payments',   icon: CreditCard   },
      { to: '/referrals',  label: 'Referrals',  icon: Gift         },
      { to: '/reports',    label: 'Reports',    icon: FileBarChart },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/help-center',   label: 'Help Center',   icon: HelpCircle    },
      { to: '/faqs',          label: 'FAQs',          icon: BookOpen      },
      { to: '/support-inbox', label: 'Support Inbox', icon: MessageCircle },
      { to: '/legal',         label: 'Legal',         icon: Scale         },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
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
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-900 z-30 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 bg-white rounded-lg px-2.5 py-1.5">
            <img src="/logo.png" alt="kolabh" className="h-6 w-auto" />
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon size={17} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user ? initials(user.name) : 'SA'}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.name ?? 'Super Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email ?? 'admin@creatorhub.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
