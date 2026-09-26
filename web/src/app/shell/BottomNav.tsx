import { NavLink } from 'react-router-dom';
import { useT } from '../i18n';
import { cn } from '../ui/cn';
import type { NavItem } from './nav';

/**
 * Fixed mobile tab bar (hidden `lg:`+) mirroring the mobile app's bottom nav —
 * a curated 5-item subset of the sidebar (see `bottomNavFor`). The sidebar
 * drawer still carries the full nav (settings, help, etc.) via the header's
 * menu button, so nothing here is otherwise unreachable.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const t = useT();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/80 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ key, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150',
              isActive ? 'text-violet-dark' : 'text-ink-soft',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-150',
                  isActive && 'app-active-pill',
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.3 : 2} />
              </span>
              {t(`nav.${key}`)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
