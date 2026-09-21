import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, Star, Users } from 'lucide-react';
import { useT } from '../i18n';
import { useAppAuth } from '../auth/AppAuthContext';
import { useAsync } from '../lib/useAsync';
import { compactNumber, totalFollowers } from '../lib/format';
import { fetchCreatorByHandle } from '../api/publicMarketplace';
import { fetchCategories } from '../api/catalog';
import { makeCategoryLookup } from './categoryLookup';
import { CategoryPill } from './CategoryPill';
import { PortfolioGrid } from './PortfolioGrid';
import { ApiError } from '../lib/apiClient';
import { SEO } from '../../lib/seo/SEO';
import { absoluteUrl } from '../../lib/seo/config';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { paths } from '../routes';
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

export function CreatorProfilePage() {
  const t = useT();
  const { status } = useAppAuth();
  const { handle = '' } = useParams();

  const { data: creator, loading, error } = useAsync(
    (signal) => fetchCreatorByHandle(handle, signal),
    [handle],
  );

  const { data: categories } = useAsync((signal) => fetchCategories(signal), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories ?? []), [categories]);

  const [gateOpen, setGateOpen] = useState(false);

  if (loading) return <ProfileSkeleton />;

  if (error || !creator || creator.isPrivate) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          variant={notFound || creator?.isPrivate ? 'not-found' : 'error'}
          title={t('public.profileNotFoundTitle')}
          description={t('public.profileNotFoundBody')}
          action={{ label: t('public.backToHome'), href: paths.home }}
        />
      </div>
    );
  }

  const name = creator.fullName ?? 'Creator';
  const followers = totalFollowers(creator.socialAccounts);
  const canonicalHandle = creator.username ?? creator.id;
  const isTeam = creator.providerType === 'TEAM' || creator.providerType === 'AGENCY';
  const metaDesc =
    creator.bio?.slice(0, 155) ??
    `${name}${creator.location ? ` · ${creator.location}` : ''} — content creator on Kolab.`;

  const stat = creator.stats;
  const responseTime =
    stat && stat.responseTimeAvgMins > 0
      ? stat.responseTimeAvgMins >= 60
        ? t('public.hoursShort', { h: Math.round(stat.responseTimeAvgMins / 60) })
        : t('public.minsShort', { m: stat.responseTimeAvgMins })
      : null;
  const hasStats = followers > 0 || Boolean(stat);

  return (
    <div>
      <SEO
        title={name}
        description={metaDesc}
        path={`/creators/${canonicalHandle}`}
        image={creator.avatarUrl ?? undefined}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name,
          description: creator.bio ?? undefined,
          image: creator.avatarUrl ?? undefined,
          address: creator.location ?? undefined,
          url: absoluteUrl(`/creators/${canonicalHandle}`),
          sameAs: creator.socialAccounts.map((a) => a.profileUrl).filter(Boolean) as string[],
        }}
      />

      <DetailHero backTo={paths.home} backLabel={t('public.backToHome')}>
        <HeroReveal className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          {creator.avatarUrl ? (
            <Avatar name={name} src={creator.avatarUrl} size="xl" className="h-24 w-24" />
          ) : (
            <RingAvatar>
              <Avatar name={name} src={creator.avatarUrl} size="xl" className="h-24 w-24" />
            </RingAvatar>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl">
                {name}
              </h1>
              {creator.fullyVerified && (
                <BadgeCheck size={22} className="flex-shrink-0 text-brand" aria-label={t('public.verified')} />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-soft">
              {creator.username && <span>@{creator.username}</span>}
              {creator.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  {creator.location}
                </span>
              )}
              {isTeam && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Users size={13} />
                  {creator.providerType === 'AGENCY'
                    ? 'Agency'
                    : creator.teamSize
                      ? `Team · ${creator.teamSize}`
                      : 'Team'}
                </span>
              )}
            </div>
            {creator.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {creator.categories.map((c) => (
                  <CategoryPill key={c} label={c} meta={categoryMeta(c)} />
                ))}
              </div>
            )}
          </div>
        </HeroReveal>

        {hasStats && (
          <HeroReveal className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {followers > 0 && (
              <StatTile label={t('public.followers')} value={compactNumber(followers)} />
            )}
            {stat && stat.reviewCount > 0 && (
              <StatTile
                label={t('public.avgRating')}
                value={
                  <span className="inline-flex items-center gap-1">
                    {stat.averageRating.toFixed(1)}
                    <Star size={15} className="fill-warning text-warning" />
                  </span>
                }
              />
            )}
            {stat && stat.completionRate > 0 && (
              <StatTile label={t('public.completionRate')} value={`${stat.completionRate}%`} />
            )}
            {responseTime && <StatTile label={t('public.responseTime')} value={responseTime} />}
          </HeroReveal>
        )}
      </DetailHero>

      <DetailBody>
        <DetailSection title={t('public.aboutHeading')} className="mt-0">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
            {creator.bio || t('public.noBio')}
          </p>
        </DetailSection>

        {creator.socialAccounts.length > 0 && (
          <DetailSection title={t('public.socialHeading')}>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {creator.socialAccounts.map((a) => (
                <li key={a.platform}>
                  <LinkRow href={a.profileUrl || undefined}>
                    <span className="flex items-center gap-3">
                      <PlatformIcon platform={a.platform} size={20} />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-ink">
                          {platformMeta(a.platform).label}
                        </span>
                        {a.followers > 0 && (
                          <span className="text-[13px] text-ink-soft">
                            {compactNumber(a.followers)} {t('public.followers')}
                          </span>
                        )}
                      </span>
                    </span>
                  </LinkRow>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {(creator.portfolioItems.length > 0 || creator.portfolioLinks.length > 0) && (
          <DetailSection title={t('public.portfolioHeading')}>
            <PortfolioGrid items={creator.portfolioItems} links={creator.portfolioLinks} />
          </DetailSection>
        )}

        {creator.services.length > 0 && (
          <DetailSection title={t('public.servicesHeading')}>
            <ul className="space-y-2.5">
              {creator.services.map((s) => (
                <li key={s.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <p className="text-[14px] font-semibold text-ink">{s.name}</p>
                  {s.description && <p className="mt-0.5 text-[13px] text-ink-soft">{s.description}</p>}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {creator.teamMembers.length > 0 && (
          <DetailSection title={t('public.teamHeading')}>
            <ul className="flex flex-wrap gap-3">
              {creator.teamMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3.5"
                >
                  <Avatar name={m.fullName ?? '?'} src={m.avatarUrl} size="sm" />
                  <span className="text-[13px] font-medium text-ink">{m.fullName}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {creator.reviews.length > 0 && (
          <DetailSection title={t('public.reviewsHeading')}>
            <ul className="space-y-3">
              {creator.reviews.slice(0, 6).map((r) => (
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
                  {r.reviewer?.name && (
                    <p className="mt-2 text-[12px] font-medium text-ink-soft">— {r.reviewer.name}</p>
                  )}
                </Card>
              ))}
            </ul>
          </DetailSection>
        )}

        {status !== 'authenticated' && (
          <BottomCTA
            title={t('public.workWithCreator')}
            ctaLabel={t('public.getStarted')}
            onClick={() => setGateOpen(true)}
          />
        )}
      </DetailBody>

      <SignupGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title={t('public.creatorGateTitle')}
        body={t('public.creatorGateBody')}
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
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
