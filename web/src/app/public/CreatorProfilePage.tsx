import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, Star, ExternalLink } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { compactNumber, totalFollowers } from '../lib/format';
import { fetchCreatorByHandle } from '../api/publicMarketplace';
import { ApiError } from '../lib/apiClient';
import { SEO } from '../../lib/seo/SEO';
import { absoluteUrl } from '../../lib/seo/config';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { paths } from '../routes';

export function CreatorProfilePage() {
  const t = useT();
  const { handle = '' } = useParams();

  const { data: creator, loading, error } = useAsync(
    (signal) => fetchCreatorByHandle(handle, signal),
    [handle],
  );

  if (loading) return <ProfileSkeleton />;

  if (error || !creator || creator.isPrivate) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          variant={notFound || creator?.isPrivate ? 'not-found' : 'error'}
          title={t('public.profileNotFoundTitle')}
          description={t('public.profileNotFoundBody')}
          action={{ label: t('public.backToCreators'), href: '/creators' }}
        />
      </div>
    );
  }

  const name = creator.fullName ?? 'Creator';
  const followers = totalFollowers(creator.socialAccounts);
  const canonicalHandle = creator.username ?? creator.id;
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
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

      <Link
        to="/creators"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={14} />
        {t('public.backToCreators')}
      </Link>

      {/* Hero */}
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={name} src={creator.avatarUrl} size="xl" className="h-24 w-24" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
            {creator.fullyVerified && (
              <BadgeCheck size={20} className="flex-shrink-0 text-brand" aria-label={t('public.verified')} />
            )}
          </div>
          {creator.username && <p className="text-[14px] text-ink-soft">@{creator.username}</p>}
          {creator.location && (
            <p className="mt-1 flex items-center gap-1 text-[14px] text-ink-soft">
              <MapPin size={13} />
              {creator.location}
            </p>
          )}
          {creator.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {creator.categories.map((c) => (
                <span key={c} className="rounded-full bg-surface-dim px-2.5 py-1 text-[12px] font-medium text-ink-soft">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6">
        <Link to={paths.signup}>
          <Button size="lg">{t('public.workWithCreator')}</Button>
        </Link>
      </div>

      {/* Stats */}
      {(followers > 0 || stat) && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {followers > 0 && (
            <StatBox label={t('public.followers')} value={compactNumber(followers)} />
          )}
          {stat && stat.reviewCount > 0 && (
            <StatBox
              label={t('public.avgRating')}
              value={
                <span className="inline-flex items-center gap-1">
                  {stat.averageRating.toFixed(1)}
                  <Star size={14} className="fill-warning text-warning" />
                </span>
              }
            />
          )}
          {stat && stat.completionRate > 0 && (
            <StatBox label={t('public.completionRate')} value={`${stat.completionRate}%`} />
          )}
          {responseTime && <StatBox label={t('public.responseTime')} value={responseTime} />}
        </div>
      )}

      {/* About */}
      <Section title={t('public.aboutHeading')}>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
          {creator.bio || t('public.noBio')}
        </p>
      </Section>

      {/* Social platforms */}
      {creator.socialAccounts.length > 0 && (
        <Section title={t('public.socialHeading')}>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {creator.socialAccounts.map((a) => (
              <li key={a.platform}>
                <a
                  href={a.profileUrl || undefined}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong"
                >
                  <PlatformIcon platform={a.platform} size={20} />
                  <span className="flex-1">
                    <span className="block text-[14px] font-semibold text-ink">
                      {platformMeta(a.platform).label}
                    </span>
                    {a.followers > 0 && (
                      <span className="text-[13px] text-ink-soft">
                        {compactNumber(a.followers)} {t('public.followers')}
                      </span>
                    )}
                  </span>
                  {a.profileUrl && <ExternalLink size={14} className="text-ink-soft" />}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Portfolio */}
      {(creator.portfolioItems.length > 0 || creator.portfolioLinks.length > 0) && (
        <Section title={t('public.portfolioHeading')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {creator.portfolioItems.map((p) => (
              <a
                key={p.id}
                href={p.linkUrl || p.mediaUrl || undefined}
                target="_blank"
                rel="noreferrer nofollow"
                className="group overflow-hidden rounded-xl border border-line bg-surface"
              >
                {(p.thumbnailUrl || p.mediaUrl) && (
                  <img
                    src={p.thumbnailUrl || p.mediaUrl || ''}
                    alt={p.title ?? ''}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                )}
                {p.title && <p className="truncate p-2 text-[12px] font-medium text-ink">{p.title}</p>}
              </a>
            ))}
            {creator.portfolioLinks.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer nofollow"
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-[13px] font-medium text-ink hover:border-line-strong"
              >
                <span className="truncate">{l.label}</span>
                <ExternalLink size={13} className="flex-shrink-0 text-ink-soft" />
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Services */}
      {creator.services.length > 0 && (
        <Section title={t('public.servicesHeading')}>
          <ul className="space-y-2.5">
            {creator.services.map((s) => (
              <li key={s.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-[14px] font-semibold text-ink">{s.name}</p>
                {s.description && <p className="mt-0.5 text-[13px] text-ink-soft">{s.description}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Team */}
      {creator.teamMembers.length > 0 && (
        <Section title={t('public.teamHeading')}>
          <ul className="flex flex-wrap gap-3">
            {creator.teamMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3">
                <Avatar name={m.fullName ?? '?'} src={m.avatarUrl} size="sm" />
                <span className="text-[13px] font-medium text-ink">{m.fullName}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Reviews */}
      {creator.reviews.length > 0 && (
        <Section title={t('public.reviewsHeading')}>
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
        </Section>
      )}

      {/* Bottom CTA */}
      <div className="mt-12 rounded-2xl bg-gradient-to-br from-brand-indigo to-violet-dark p-6 text-center text-white">
        <p className="text-[17px] font-semibold">{t('public.workWithCreator')}</p>
        <Link to={paths.signup} className="mt-3 inline-block">
          <Button variant="secondary" size="md">
            {t('public.getStarted')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <CardHeader title={title} />
      {children}
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-center">
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-[12px] text-ink-soft">{label}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex gap-5">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="mt-6 h-11 w-48 rounded-xl" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-24" />
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
