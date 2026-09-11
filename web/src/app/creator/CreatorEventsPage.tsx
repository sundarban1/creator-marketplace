import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchMyApplications } from '../api/creator';
import { PageHeader } from '../ui/PageHeader';
import { EventsBrowser } from '../events/EventsBrowser';

export function CreatorEventsPage() {
  const t = useT();
  // Used only to tag events the creator has already applied to.
  const applied = useAsync((s) => fetchMyApplications({ limit: 100 }, s), []);
  const appliedIds = new Set((applied.data?.items ?? []).map((a) => a.campaignId));

  return (
    <>
      <PageHeader eyebrow={t('creatorEvents.eyebrow')} title={t('nav.discoverEvents')} description={t('public.eventsSubtitle')} />
      <EventsBrowser hrefBase="/creator/events" appliedIds={appliedIds} />
    </>
  );
}
