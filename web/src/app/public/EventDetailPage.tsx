import { useParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchPublicEvent } from '../api/publicMarketplace';
import { ApiError } from '../lib/apiClient';
import { SEO } from '../../lib/seo/SEO';
import { absoluteUrl } from '../../lib/seo/config';
import { EmptyState } from '../ui/EmptyState';
import { EventDetailBody, EventDetailSkeleton } from '../events/EventDetailBody';
import { BottomCTA } from './detailKit';

export function EventDetailPage() {
  const t = useT();
  const { id = '' } = useParams();
  const { data: event, loading, error } = useAsync((s) => fetchPublicEvent(id, s), [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <EventDetailSkeleton />
      </div>
    );
  }

  if (error || !event) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          variant={notFound ? 'not-found' : 'error'}
          title={t('public.eventNotFoundTitle')}
          description={t('public.eventNotFoundBody')}
          action={{ label: t('public.backToEvents'), href: '/events' }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <SEO
        title={event.title}
        description={event.description.slice(0, 155)}
        path={`/events/${event.id}`}
        image={event.featureImageUrl ?? undefined}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: event.title,
          description: event.description,
          datePosted: event.createdAt,
          validThrough: event.deadline,
          hiringOrganization: { '@type': 'Organization', name: event.business.businessName },
          jobLocationType: event.locationType === 'REMOTE' ? 'TELECOMMUTE' : undefined,
          url: absoluteUrl(`/events/${event.id}`),
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'NPR',
            value: {
              '@type': 'QuantitativeValue',
              minValue: event.budgetMin,
              maxValue: event.budgetMax,
              unitText: 'PER_CREATOR',
            },
          },
        }}
      />

      <EventDetailBody event={event} backTo="/events" backLabel={t('public.backToEvents')} />

      <BottomCTA title={t('public.applyInApp')} ctaLabel={t('public.getStarted')} href="/" />
    </div>
  );
}
