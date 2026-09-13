import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useT } from '../i18n';
import { useAppAuth } from '../auth/AppAuthContext';
import { notificationRoute } from '../lib/notificationRoute';
import { fetchNotificationsPage, type AppNotification } from '../api/creator';
import { useNotifications } from './NotificationsContext';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../ui/cn';

const PAGE_SIZE = 20;

function dayLabel(iso: string, t: ReturnType<typeof useT>): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return t('notifications.today');
  if (diffDays === 1) return t('notifications.yesterday');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Shared by /creator/notifications and /business/notifications. */
export function NotificationsPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppAuth();
  const { markRead, markAllRead, unread } = useNotifications();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'loadingMore' | 'ready' | 'error'>('loading');
  const reqId = useRef(0);

  const load = useCallback(async (nextPage: number, append: boolean) => {
    const id = ++reqId.current;
    setStatus(append ? 'loadingMore' : 'loading');
    try {
      const res = await fetchNotificationsPage(nextPage, PAGE_SIZE);
      if (id !== reqId.current) return;
      setItems((prev) => (append ? [...prev, ...res.items] : res.items));
      setTotal(res.total);
      setPage(nextPage);
      setStatus('ready');
    } catch {
      if (id !== reqId.current) return;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1, false);
  }, [load]);

  const go = (n: AppNotification) => {
    if (!n.isRead) {
      markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
    if (user) navigate(notificationRoute(n, user.role));
    else navigate(location.pathname.startsWith('/business') ? '/business' : '/creator');
  };

  const canLoadMore = items.length < total;

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-1/2" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const withDayLabel = items.map((n, i) => {
    const day = dayLabel(n.createdAt, t);
    const showDay = i === 0 || day !== dayLabel(items[i - 1].createdAt, t);
    return { n, day, showDay };
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t('notifications.title')}
        actions={
          unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <Check size={14} />
              {t('nav.markAllRead')}
            </Button>
          ) : undefined
        }
      />

      {status === 'error' && items.length === 0 ? (
        <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: () => load(1, false) }} />
      ) : items.length === 0 ? (
        <EmptyState variant="empty" title={t('notifications.emptyTitle')} description={t('notifications.emptyBody')} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {withDayLabel.map(({ n, day, showDay }) => {
            return (
              <div key={n.id}>
                {showDay && (
                  <div className="border-b border-line bg-surface-dim px-4 py-2 text-[12px] font-semibold text-ink-soft">
                    {day}
                  </div>
                )}
                <button
                  onClick={() => go(n)}
                  className={cn(
                    'flex w-full gap-3 border-b border-line px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-surface-dim',
                    !n.isRead && 'bg-brand/[0.04]',
                  )}
                >
                  <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', n.isRead ? 'bg-line-strong' : 'bg-brand')} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-[14px]', n.isRead ? 'font-medium text-ink' : 'font-semibold text-ink')}>
                        {n.title}
                      </span>
                      <span className="flex-shrink-0 text-[12px] text-ink-soft">{timeLabel(n.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-soft">{n.body}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {canLoadMore && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" loading={status === 'loadingMore'} onClick={() => load(page + 1, true)}>
            {t('notifications.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
