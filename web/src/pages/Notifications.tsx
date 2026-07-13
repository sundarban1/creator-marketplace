import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { api, type ApiNotification } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useNotifications } from '../context/NotificationContext';
import { timeAgo, notificationRoute, notificationIcon } from '../lib/notificationMeta';

const PAGE_SIZE = 15;

export function Notifications() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { markRead, markAllRead, refresh, unreadCount } = useNotifications();

  const fetcher = useCallback(
    () => api.notifications.list({ page, limit: PAGE_SIZE }),
    [page],
  );
  const { data, loading, refetch } = useApi(fetcher);

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;

  function changePage(p: number) {
    setPage(p);
    refetch();
  }

  async function handleClick(n: ApiNotification) {
    if (!n.isRead) await markRead(n.id);
    const route = notificationRoute(n);
    if (route) navigate(route);
  }

  async function handleMarkAllRead() {
    await markAllRead();
    refresh();
    refetch();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Everything that's happened across the platform."
        action={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          ) : undefined
        }
      />

      <div className="bg-white rounded-xl border border-gray-200">
        {loading && notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No notifications yet.</p>
        ) : (
          <div>
            {notifications.map((n) => {
              const Icon = notificationIcon(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-5 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onChange={changePage}
        />
      )}
    </div>
  );
}
