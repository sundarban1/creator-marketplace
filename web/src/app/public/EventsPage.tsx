import { useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { SEO } from '../../lib/seo/SEO';
import { webPageSchema } from '../../lib/seo/schema';
import { EventsBrowser } from '../events/EventsBrowser';
import { BrowseHero } from './BrowseHero';

export function EventsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';

  const patchSearch = (value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  };

  return (
    <>
      <SEO
        title={t('public.eventsTitle')}
        description={t('public.eventsSubtitle')}
        path="/events"
        jsonLd={webPageSchema({
          path: '/events',
          title: t('public.eventsTitle'),
          description: t('public.eventsSubtitle'),
        })}
      />

      <BrowseHero
        eyebrow={t('public.eventsEyebrow')}
        title={t('public.eventsTitle')}
        subtitle={t('public.eventsSubtitle')}
        search={search}
        onSearch={patchSearch}
        searchPlaceholder={t('public.searchEventsPlaceholder')}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <EventsBrowser hrefBase="/events" showSearch={false} />
      </div>
    </>
  );
}
