import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchOpenMeetups } from '../api/meetup';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

function formatEventDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CreatorMeetupsPage() {
  const t = useT();
  const meetups = useAsync((s) => fetchOpenMeetups(s), []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('meetup.listTitle')} description={t('meetup.listSubtitle')} />

      {meetups.loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : meetups.error ? (
        <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: meetups.reload }} />
      ) : !meetups.data || meetups.data.length === 0 ? (
        <EmptyState variant="empty" title={t('meetup.noneOpenTitle')} description={t('meetup.noneOpenBody')} />
      ) : (
        <div className="space-y-3">
          {meetups.data.map((m) => (
            <Card key={m.id} as="li" interactive className="list-none">
              <Link to={`/creator/meetups/${m.id}`} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                    <MapPin size={13} />
                    {m.city}{m.district ? `, ${m.district}` : ''}
                  </p>
                  <p className="mt-0.5 text-[15px] font-semibold text-ink">{m.title}</p>
                  {formatEventDate(m.eventDate) && (
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">{formatEventDate(m.eventDate)}</p>
                  )}
                </div>
                <ArrowRight size={18} className="flex-shrink-0 text-ink-soft" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
