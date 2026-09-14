import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { notificationRoute } from '../lib/notificationRoute';
import { useNotifications } from './NotificationsContext';
import { cn } from '../ui/cn';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationsBell() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAppAuth();
  const { items, unread, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const go = (n: (typeof items)[number]) => {
    if (!n.isRead) markRead(n.id);
    setOpen(false);
    if (user) navigate(notificationRoute(n, user.role));
  };

  const viewAll = () => {
    setOpen(false);
    navigate(user?.role === 'BUSINESS' ? '/business/notifications' : '/creator/notifications');
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('nav.notifications')}
        className="relative rounded-lg p-2 text-ink-soft hover:bg-surface-dim"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[14px] font-semibold text-ink">{t('nav.notifications')}</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline">
                <Check size={12} />
                {t('nav.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-soft">{t('common.loading')}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-ink-soft">{t('dashboard.noActivity')}</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => go(n)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-dim',
                        !n.isRead && 'bg-brand/[0.04]',
                      )}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', n.isRead ? 'bg-line-strong' : 'bg-brand')} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-ink">{n.title}</span>
                          <span className="flex-shrink-0 text-[11px] text-ink-soft">{timeAgo(n.createdAt)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[12px] text-ink-soft">{n.body}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={viewAll}
            className="block w-full border-t border-line px-4 py-3 text-center text-[13px] font-semibold text-brand hover:bg-surface-dim"
          >
            {t('notifications.viewAll')}
          </button>
        </div>
      )}
    </div>
  );
}
