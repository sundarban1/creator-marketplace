import { useT } from '../i18n';
import { SEO } from '../../lib/seo/SEO';
import { webPageSchema } from '../../lib/seo/schema';
import { EventsBrowser } from '../events/EventsBrowser';

export function EventsPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
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

      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[2.5rem]">{t('public.eventsTitle')}</h1>
        <p className="mt-2 text-[15px] text-ink-soft">{t('public.eventsSubtitle')}</p>
      </header>

      <EventsBrowser hrefBase="/events" />
    </div>
  );
}
