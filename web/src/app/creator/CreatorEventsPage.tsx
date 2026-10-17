import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useLiveRefresh } from '../lib/liveUpdates';
import { fetchMyApplications } from '../api/creator';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { EventsBrowser } from '../events/EventsBrowser';
import { CompetitionsStrip } from '../competitions/CompetitionsStrip';

export function CreatorEventsPage() {
  const t = useT();
  // Used only to tag events the creator has already applied to.
  const applied = useAsync((s) => fetchMyApplications({ limit: 100 }, s), []);
  useLiveRefresh(['applications'], applied.refresh);
  const appliedIds = new Set((applied.data?.items ?? []).map((a) => a.campaignId));

  return (
    <>
      <DashPageHeader
        title={t('nav.discoverEvents')}
        description={t('public.eventsSubtitle')}
      />
      <CompetitionsStrip />
      <EventsBrowser hrefBase="/creator/events" appliedIds={appliedIds} variant="dashboard" />
    </>
  );
}
