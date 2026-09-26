import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, Star, Globe } from 'lucide-react';
import { useT } from '../i18n';
import { useAppAuth } from '../auth/AppAuthContext';
import { useAsync } from '../lib/useAsync';
import { fetchPublicBusiness } from '../api/publicMarketplace';
import { fetchCategories } from '../api/catalog';
import { ApiError } from '../lib/apiClient';
import { SEO } from '../../lib/seo/SEO';
import { absoluteUrl } from '../../lib/seo/config';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { paths } from '../routes';
import { CategoryPill } from './CategoryPill';
import { makeCategoryLookup } from './categoryLookup';
import {
  BottomCTA,
  DetailBody,
  DetailHero,
  DetailSection,
  HeroReveal,
  LinkRow,
  RingAvatar,
  StatTile,
} from './detailKit';
import { SignupGateModal } from './SignupGateModal';

export function BusinessProfilePage() {
  const t = useT();
  const { status } = useAppAuth();
  const { id = '' } = useParams();
  const [gateOpen, setGateOpen] = useState(false);

  const { data: business, loading, error } = useAsync(
    (signal) => fetchPublicBusiness(id, signal),
    [id],
  );

  const { data: categories } = useAsync((signal) => fetchCategories(signal), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories ?? []), [categories]);

  if (loading) return <ProfileSkeleton />;

  if (error || !business || business.isPrivate) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          variant={notFound || business?.isPrivate ? 'not-found' : 'error'}
          title={t('public.businessNotFoundTitle')}
          description={t('public.businessNotFoundBody')}
          action={{ label: t('public.backToHome'), href: paths.home }}
        />
      </div>
    );
  }

  const name = business.businessName ?? 'Business';
  const location = [business.city, business.district, business.province].filter(Boolean).join(', ');
  const metaDesc =
    business.description?.slice(0, 155) ??
    `${name}${location ? ` · ${location}` : ''} — hiring content creators on Kolab.`;
  const socialLinks = Object.entries(business.socialLinks ?? {}).filter(([, url]) => Boolean(url));
  const reviews = business.reviews ?? [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;
  const hasStats = business._count.campaigns > 0 || reviewCount > 0;
  // Canonical URL always prefers the slug once one exists, even when this
  // page was reached via the raw id (older link, or a slug not generated
  // yet) — search engines converge on the one URL without a hard redirect.
  const canonicalPath = `/businesses/${business.slug ?? business.id}`;

  return (
    <div>
      <SEO
        title={name}
        description={metaDesc}
        path={canonicalPath}
        image={business.logoUrl ?? undefined}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name,
          description: business.description ?? undefined,
          logo: business.logoUrl ?? undefined,
          url: business.website ?? absoluteUrl(canonicalPath),
          address: location || undefined,
          sameAs: socialLinks.map(([, url]) => url),
        }}
      />

      <DetailHero backTo={paths.home} backLabel={t('public.backToHome')}>
        <HeroReveal className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          <RingAvatar>
            <Avatar name={name} src={business.logoUrl} size="xl" className="h-24 w-24" />
          </RingAvatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl">
                {name}
              </h1>
              {business.fullyVerified && (
                <BadgeCheck size={22} className="flex-shrink-0 text-brand" aria-label={t('public.verified')} />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-soft">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  {location}
                </span>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="inline-flex items-center gap-1 font-medium text-violet hover:underline"
                >
                  <Globe size={13} />
                  {business.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            {business.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {business.categories.map((c) => (
                  <CategoryPill key={c} label={c} meta={categoryMeta(c)} />
                ))}
              </div>
            )}
          </div>
        </HeroReveal>

        {hasStats && (
          <HeroReveal className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatTile label={t('public.campaignsPosted')} value={String(business._count.campaigns)} />
            {reviewCount > 0 && (
              <StatTile
                label={t('public.avgRating')}
                value={
                  <span className="inline-flex items-center gap-1">
                    {avgRating.toFixed(1)}
                    <Star size={15} className="fill-warning text-warning" />
                  </span>
                }
              />
            )}
          </HeroReveal>
        )}
      </DetailHero>

      <DetailBody>
        <DetailSection title={t('public.aboutHeading')} className="mt-0">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {business.description || t('public.noBusinessBio')}
          </p>
        </DetailSection>

        {socialLinks.length > 0 && (
          <DetailSection title={t('public.socialHeading')}>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {socialLinks.map(([platform, url]) => (
                <li key={platform}>
                  {/* Outbound link only for signed-in visitors. */}
                  <LinkRow href={status === 'authenticated' ? url : undefined}>
                    <span className="text-[14px] font-semibold capitalize text-ink">{platform}</span>
                  </LinkRow>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {business.campaigns.length > 0 && (
          <DetailSection title={t('public.openCampaignsHeading')}>
            <ul className="space-y-2.5">
              {business.campaigns.map((c) => (
                <li key={c.id}>
                  <LinkRow to={`/events/${c.slug ?? c.id}`}>
                    <span className="block truncate text-[14px] font-semibold text-ink">{c.title}</span>
                    <span className="text-[12px] text-ink-soft">{c.category}</span>
                  </LinkRow>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {reviewCount > 0 && (
          <DetailSection title={t('public.reviewsHeading')}>
            <ul className="space-y-3">
              {reviews.slice(0, 6).map((r) => (
                <Card key={r.id} as="li" className="!p-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={i < r.rating ? 'fill-warning text-warning' : 'text-line-strong'}
                      />
                    ))}
                  </div>
                  {r.comment && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{r.comment}</p>}
                  {r.from?.name && (
                    <p className="mt-2 text-[12px] font-medium text-ink-soft">— {r.from.name}</p>
                  )}
                </Card>
              ))}
            </ul>
          </DetailSection>
        )}

        {status === 'authenticated' ? (
          <BottomCTA
            title={t('public.browseBusinessJobs')}
            ctaLabel={t('public.browseEvents')}
            to="/events"
          />
        ) : (
          <BottomCTA
            title={t('public.browseBusinessJobs')}
            ctaLabel={t('public.getStarted')}
            onClick={() => setGateOpen(true)}
          />
        )}
      </DetailBody>

      <SignupGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title={t('public.businessGateTitle')}
        body={t('public.businessGateBody')}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-4xl px-4 pb-9 pt-10 sm:px-6 lg:pb-11 lg:pt-14">
          <Skeleton className="h-4 w-28" />
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-64 rounded-full" />
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:py-11">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4">
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}
