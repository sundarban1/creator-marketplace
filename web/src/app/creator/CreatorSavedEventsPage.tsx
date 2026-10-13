import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useLiveRefresh } from '../lib/liveUpdates';
import { useSavedEvents } from '../lib/useSavedEvents';
import { fetchSavedEvents } from '../api/campaigns';
import { EventCard } from '../public/EventCard';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { DashPageHeader } from './dash-ui/DashPageHeader';

/** The creator's bookmarked events — web twin of mobile's shortlisted-events.tsx. */
export function CreatorSavedEventsPage() {
  const t = useT();
  const toast = useToast();
  const events = useAsync((s) => fetchSavedEvents(s), []);
  useLiveRefresh(['campaigns'], events.refresh);
  const saved = useSavedEvents();

  // Unsaved from this page — hide it right away without a refetch.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const list = (events.data ?? []).filter((e) => !removed.has(e.id));

  async function unsave(id: string) {
    try {
      const stillSaved = await saved.toggle(id);
      if (!stillSaved) setRemoved((prev) => new Set(prev).add(id));
      toast.success(t('savedEvents.removedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  }

  return (
    <div>
      <DashPageHeader title={t('savedEvents.title')} description={t('savedEvents.subtitle')} />

      {events.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : events.error ? (
        <EmptyState variant="error" title={t('savedEvents.loadError')} action={{ label: t('common.retry'), onClick: events.reload }} />
      ) : list.length === 0 ? (
        <EmptyState
          variant="empty"
          icon={<Bookmark size={26} strokeWidth={1.75} />}
          title={t('savedEvents.empty')}
          description={t('savedEvents.emptyHint')}
          action={{ label: t('savedEvents.browse'), href: '/creator/events' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((ev) => (
            <div key={ev.id} className="relative h-full min-w-0">
              <EventCard event={ev} hrefBase="/creator/events" />
              <button
                type="button"
                onClick={() => unsave(ev.id)}
                aria-label={t('savedEvents.unsave')}
                title={t('savedEvents.unsave')}
                className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-violet-dark shadow-sm backdrop-blur hover:bg-surface"
              >
                <Bookmark size={16} className="fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
