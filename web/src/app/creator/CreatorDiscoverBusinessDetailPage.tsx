import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, Star, Globe } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchPublicBusiness } from '../api/publicMarketplace';
import { fetchCategories } from '../api/catalog';
import { ApiError } from '../lib/apiClient';
import { Avatar } from '../ui/Avatar';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { CategoryPill } from '../public/CategoryPill';
import { makeCategoryLookup } from '../public/categoryLookup';

export function CreatorDiscoverBusinessDetailPage() {
  const t = useT();
  const { id = '' } = useParams();
  const business = useAsync((s) => fetchPublicBusiness(id, s), [id]);
  const categories = useAsync((s) => fetchCategories(s), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories.data ?? []), [categories.data]);

  if (business.loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-6 w-24" />
        <div className="mt-5 flex gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2 pt-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <SkeletonText lines={4} className="mt-6" />
      </div>
    );
  }

  if (business.error || !business.data || business.data.isPrivate) {
    const notFound = business.error instanceof ApiError && business.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={notFound || business.data?.isPrivate ? 'not-found' : 'error'}
          title={t('public.businessNotFoundTitle')}
          description={t('public.businessNotFoundBody')}
          action={{ label: t('public.backToBusinesses'), href: '/creator/businesses' }}
        />
      </div>
    );
  }

  const b = business.data;
  const name = b.businessName ?? 'Business';
  const location = [b.city, b.district, b.province].filter(Boolean).join(', ');
  const socialLinks = Object.entries(b.socialLinks ?? {}).filter(([, url]) => Boolean(url));
  const reviews = b.reviews ?? [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/creator/businesses" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {t('public.backToBusinesses')}
      </Link>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={name} src={b.logoUrl} size="xl" className="h-20 w-20 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">{name}</h1>
            {b.fullyVerified && <BadgeCheck size={19} className="text-brand" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-soft">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {location}
              </span>
            )}
            {b.website && (
              <a
                href={b.website}
                target="_blank"
                rel="noreferrer nofollow"
                className="inline-flex items-center gap-1 font-medium text-violet hover:underline"
              >
                <Globe size={13} />
                {b.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          {b.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {b.categories.map((cat) => (
                <CategoryPill key={cat} label={cat} meta={categoryMeta(cat)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {(b._count.campaigns > 0 || reviewCount > 0) && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label={t('public.campaignsPosted')} value={String(b._count.campaigns)} />
          {reviewCount > 0 && (
            <Stat
              label={t('public.avgRating')}
              value={
                <span className="inline-flex items-center gap-1">
                  {avgRating.toFixed(1)}
                  <Star size={13} className="fill-warning text-warning" />
                </span>
              }
            />
          )}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title={t('public.aboutHeading')} />
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{b.description || t('public.noBusinessBio')}</p>
      </Card>

      {socialLinks.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={t('public.socialHeading')} />
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {socialLinks.map(([platform, url]) => (
              <li key={platform}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-violet/30"
                >
                  <span className="text-[13px] font-semibold capitalize text-ink">{platform}</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {b.campaigns.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={t('public.openCampaignsHeading')} />
          <ul className="space-y-2.5">
            {b.campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/creator/events/${c.id}`}
                  className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-violet/30"
                >
                  <span className="block truncate text-[14px] font-semibold text-ink">{c.title}</span>
                  <span className="text-[12px] text-ink-soft">{c.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {reviewCount > 0 && (
        <Card className="mt-6">
          <CardHeader title={t('public.reviewsHeading')} />
          <ul className="space-y-3">
            {reviews.slice(0, 6).map((r) => (
              <Card key={r.id} as="li" className="!p-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={i < r.rating ? 'fill-warning text-warning' : 'text-line-strong'} />
                  ))}
                </div>
                {r.comment && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{r.comment}</p>}
                {r.from?.name && (
                  <p className="mt-2 text-[12px] font-medium text-ink-soft">— {r.from.name}</p>
                )}
              </Card>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3.5 text-center">
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet/60 to-brand-orange/50" />
      <p className="font-serif text-[20px] font-medium leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-soft">{label}</p>
    </div>
  );
}
