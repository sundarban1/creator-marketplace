import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Clock, MapPin, Building2, Tag, Users, Eye, ExternalLink, Ban,
} from 'lucide-react';
import { useT, useAppLanguage } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { ApiError } from '../lib/apiClient';
import { SEO } from '../../lib/seo/SEO';
import { absoluteUrl } from '../../lib/seo/config';
import { api as adminApi, type CommunityEventDetail } from '../../lib/api';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';
import { DetailHero, DetailSection, HeroReveal } from '../public/detailKit';
import { EventGallery } from './EventGallery';
import { fetchCommunityEvent } from './api';
import {
  COMMUNITY_EVENTS_PATH, cldImage, communityEventPath, formatEventDateRange, formatEventTime, placeLine, videoEmbed,
} from './format';

/**
 * Admin "Preview" opens this page with `?preview=<id>`: the event is then
 * read through the admin endpoint (admin token) so a draft can be checked
 * before publishing. The public fetch never returns unpublished events.
 */
async function loadPreview(id: string): Promise<CommunityEventDetail> {
  const { data } = await adminApi.admin.communityEvent(id);
  return {
    ...data,
    registrationOpen: data.registrationEnabled && !!data.registrationUrl && data.section === 'upcoming',
  };
}

export function CommunityEventDetailPage() {
  const t = useT();
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const previewId = params.get('preview');
  const { data: event, loading, error } = useAsync(
    (s) => (previewId ? loadPreview(previewId) : fetchCommunityEvent(slug, s)),
    [slug, previewId],
  );

  if (loading) return <DetailSkeleton />;

  if (error || !event) {
    const notFound = error instanceof ApiError ? error.status === 404 : true;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          variant={notFound ? 'not-found' : 'error'}
          title={t('communityEvents.notFoundTitle')}
          description={t('communityEvents.notFoundBody')}
          action={{ label: t('communityEvents.backToEvents'), href: COMMUNITY_EVENTS_PATH }}
        />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <EventSeo event={event} noindex={!!previewId} />
      {previewId && (
        <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-center text-[13px] font-medium text-ink">
          <Eye size={14} /> {t('communityEvents.previewBanner')}
        </div>
      )}
      <EventDetail event={event} />
    </MotionConfig>
  );
}

function EventDetail({ event }: { event: CommunityEventDetail }) {
  const t = useT();
  const { language } = useAppLanguage();
  const isPast = event.section === 'past';
  const isCancelled = event.status === 'CANCELLED';
  const tz = event.timezone;

  const dateLabel = formatEventDateRange(event.startDateTime, event.endDateTime, tz, language);
  const startTime = formatEventTime(event.startDateTime, tz, language);
  const timeLabel = event.endDateTime
    ? `${startTime} – ${formatEventTime(event.endDateTime, tz, language)}`
    : t('communityEvents.onwards', { time: startTime });
  const venueLine = placeLine(event.venueName, event.city);
  const fullAddress = placeLine(event.address, event.city !== event.address ? event.country : null);
  const mapsHref =
    event.mapsUrl ??
    (event.latitude != null && event.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
      : venueLine
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeLine(event.venueName, event.address, event.city, event.country))}`
        : null);
  const registerHref = event.registrationOpen && !isCancelled ? event.registrationUrl : null;

  return (
    <>
      <DetailHero backTo={COMMUNITY_EVENTS_PATH} backLabel={t('communityEvents.backToEvents')}>
        <HeroReveal className="mt-6">
          <StatusPill event={event} />
        </HeroReveal>
        <HeroReveal>
          <h1 className="text-balance mt-4 font-serif text-[34px] font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl">
            {event.title}
          </h1>
        </HeroReveal>
        <HeroReveal>
          <p className="mt-3 font-serif text-[18px] italic text-violet sm:text-[20px]">{event.shortDescription}</p>
        </HeroReveal>
        <HeroReveal>
          <div className="mt-5 flex flex-col gap-2 text-[15px] text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-6">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} className="text-violet" /> {dateLabel}
            </span>
            {venueLine && (
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-violet" /> {venueLine}
              </span>
            )}
          </div>
        </HeroReveal>
        {registerHref && (
          <HeroReveal className="mt-6">
            <RegisterButton href={registerHref} />
          </HeroReveal>
        )}
      </DetailHero>

      {event.coverImageUrl && (
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <img
            src={cldImage(event.coverImageUrl, 1600)}
            srcSet={`${cldImage(event.coverImageUrl, 800)} 800w, ${cldImage(event.coverImageUrl, 1600)} 1600w, ${cldImage(event.coverImageUrl, 2400)} 2400w`}
            sizes="(min-width: 1024px) 1024px, 100vw"
            alt={event.title}
            className="aspect-[16/9] w-full rounded-2xl border border-line object-cover shadow-[0_24px_60px_-30px_rgba(20,17,16,0.45)]"
          />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {/* About + info card side by side on desktop; stacked on mobile. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="min-w-0">
            {event.description && (
              <DetailSection title={t('communityEvents.aboutTitle')}>
                <div className="max-w-[65ch] whitespace-pre-line text-[16px] leading-[1.75] text-ink-soft">{event.description}</div>
              </DetailSection>
            )}
          </div>
          <aside className="lg:pt-10">
            <div className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {t('communityEvents.detailsTitle')}
              </p>
              <dl className="space-y-3.5">
                <InfoRow icon={<CalendarDays size={16} />} label={t('communityEvents.infoDate')} value={dateLabel} />
                <InfoRow icon={<Clock size={16} />} label={t('communityEvents.infoTime')} value={timeLabel} />
                {event.venueName && (
                  <InfoRow icon={<Building2 size={16} />} label={t('communityEvents.infoVenue')} value={event.venueName} />
                )}
                {(fullAddress || mapsHref) && (
                  <InfoRow
                    icon={<MapPin size={16} />}
                    label={t('communityEvents.infoLocation')}
                    value={
                      <>
                        {fullAddress && <span className="block">{fullAddress}</span>}
                        {mapsHref && (
                          <a
                            href={mapsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-violet hover:underline"
                          >
                            {t('communityEvents.openInMaps')} <ExternalLink size={12} />
                          </a>
                        )}
                      </>
                    }
                  />
                )}
                <InfoRow icon={<Tag size={16} />} label={t('communityEvents.infoType')} value={t(`communityEvents.type${event.eventType}`)} />
                <InfoRow icon={<Users size={16} />} label={t('communityEvents.infoOrganizer')} value={t('communityEvents.organizerName')} />
              </dl>
              {registerHref && (
                <div className="mt-5 border-t border-line pt-5">
                  <RegisterButton href={registerHref} block />
                  <div className="mt-2.5 space-y-1 text-center text-[12px] text-ink-soft">
                    {event.registrationDeadline && (
                      <p>{t('communityEvents.registerBy', { date: formatEventDateRange(event.registrationDeadline, null, tz, language, 'short') })}</p>
                    )}
                    {event.maxAttendees && <p>{t('communityEvents.maxAttendees', { count: event.maxAttendees })}</p>}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {event.highlights.length > 0 && (
          <DetailSection title={isPast ? t('communityEvents.highlightsPast') : t('communityEvents.highlightsUpcoming')} className="mt-14">
            <div className="grid gap-3 sm:grid-cols-2">
              {event.highlights.map((h, i) => (
                <div key={h.id ?? i} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
                  {h.imageUrl ? (
                    <img src={cldImage(h.imageUrl, 160, 160)} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet/15 to-brand-orange/15 font-serif text-[15px] font-medium text-violet">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{h.title}</p>
                    {h.description && <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{h.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        {event.speakers.length > 0 && (
          <DetailSection title={t('communityEvents.speakersTitle')} className="mt-14">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {event.speakers.map((s, i) => (
                <div key={s.id ?? i} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                  <div className="flex items-center gap-3.5">
                    <Avatar name={s.name} src={s.imageUrl ? cldImage(s.imageUrl, 160, 160) : null} size="lg" />
                    <div className="min-w-0">
                      <p className="font-serif text-[17px] font-medium leading-tight text-ink">{s.name}</p>
                      {s.role && <p className="mt-1 text-[13px] text-ink-soft">{s.role}</p>}
                    </div>
                  </div>
                  {s.organization && <p className="mt-3 text-[13px] font-medium text-violet">{s.organization}</p>}
                  {s.bio && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{s.bio}</p>}
                  {s.profileUrl && (
                    <a
                      href={s.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-3 inline-flex items-center gap-1 self-start text-[13px] font-semibold text-violet hover:underline"
                    >
                      {new URL(s.profileUrl).hostname.replace(/^www\./, '')} <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        {event.agenda.length > 0 && (
          <DetailSection title={t('communityEvents.agendaTitle')} className="mt-14">
            <ol className="relative max-w-2xl border-l border-line pl-6">
              {event.agenda.map((a, i) => (
                <li key={a.id ?? i} className="relative pb-6 last:pb-0">
                  <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet to-brand-orange ring-4 ring-paper" />
                  {a.time && <p className="text-[12px] font-semibold uppercase tracking-wide text-violet">{a.time}</p>}
                  <p className="mt-0.5 text-[15px] font-semibold text-ink">{a.title}</p>
                  {a.description && <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{a.description}</p>}
                </li>
              ))}
            </ol>
          </DetailSection>
        )}

        {event.images.length > 0 && (
          <DetailSection title={t('communityEvents.galleryTitle')} className="mt-14">
            <EventGallery images={event.images} title={event.title} />
          </DetailSection>
        )}

        {event.videoUrl && <VideoSection url={event.videoUrl} title={event.title} />}

        {event.partners.length > 0 && (
          <DetailSection title={t('communityEvents.partnersTitle')} className="mt-14">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {event.partners.map((p, i) => {
                const inner = p.logoUrl ? (
                  <img src={cldImage(p.logoUrl, 320)} alt={p.name} loading="lazy" className="max-h-12 w-auto max-w-full object-contain" />
                ) : (
                  <span className="text-center text-[14px] font-semibold text-ink">{p.name}</span>
                );
                // Logos sit on white (most are drawn for light backgrounds); a
                // name-only partner uses the themed surface so its text stays legible.
                const cls = cn('flex h-24 items-center justify-center rounded-2xl border border-line p-4 transition-colors', p.logoUrl ? 'bg-white' : 'bg-surface');
                return p.websiteUrl ? (
                  <a key={p.id ?? i} href={p.websiteUrl} target="_blank" rel="noopener noreferrer" title={p.name} className={cn(cls, 'hover:border-violet/40')}>
                    {inner}
                  </a>
                ) : (
                  <div key={p.id ?? i} title={p.name} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </DetailSection>
        )}

        <FinalCta />
      </div>
    </>
  );
}

function StatusPill({ event }: { event: CommunityEventDetail }) {
  const t = useT();
  if (event.status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-danger">
        <Ban size={12} /> {t('communityEvents.heroCancelled')}
      </span>
    );
  }
  if (event.status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center rounded-full border border-line bg-surface-dim px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
        {t('communityEvents.heroCompleted')}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide',
        event.status === 'ONGOING' ? 'bg-success/10 text-success' : 'border border-violet/20 bg-violet/[0.06] text-violet',
      )}
    >
      {event.status === 'ONGOING' && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
      {event.status === 'ONGOING' ? t('communityEvents.statusOngoing') : t('communityEvents.statusUpcoming')}
    </span>
  );
}

function RegisterButton({ href, block }: { href: string; block?: boolean }) {
  const t = useT();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet to-brand-orange px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90',
        block && 'w-full',
      )}
    >
      {t('communityEvents.registerNow')} <ArrowUpRight size={15} />
    </a>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-violet">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[12px] text-ink-soft">{label}</dt>
        <dd className="text-[14px] font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function VideoSection({ url, title }: { url: string; title: string }) {
  const t = useT();
  const embed = videoEmbed(url);
  return (
    <DetailSection title={t('communityEvents.videoTitle')} className="mt-14">
      {embed.kind === 'iframe' ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black">
          <iframe
            src={embed.src}
            title={title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : embed.kind === 'file' ? (
        <video src={embed.src} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl border border-line bg-black" />
      ) : (
        <a
          href={embed.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-semibold text-violet hover:border-violet/40"
        >
          {t('communityEvents.watchVideo')} <ArrowUpRight size={15} />
        </a>
      )}
    </DetailSection>
  );
}

/** Closing band — joins the community rather than registering (works for past events too). */
function FinalCta() {
  const t = useT();
  return (
    <div className="relative mt-16 overflow-hidden rounded-2xl border border-violet/20 bg-gradient-to-br from-violet to-violet-dark px-6 py-9 text-center text-white sm:px-10">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-orange/25 blur-3xl" />
      <p className="relative font-serif text-[26px] font-medium tracking-tight">{t('communityEvents.ctaTitle')}</p>
      <p className="relative mx-auto mt-2 max-w-md text-[15px] text-white/80">{t('communityEvents.ctaBody')}</p>
      <div className="relative mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/signup"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-violet-dark transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
        >
          {t('communityEvents.ctaPrimary')} <ArrowRight size={15} />
        </Link>
        <Link
          to={COMMUNITY_EVENTS_PATH}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
        >
          {t('communityEvents.ctaSecondary')} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

/** Defaults: "<title> | Kolab", short description + start of the body, cover image. */
function EventSeo({ event, noindex }: { event: CommunityEventDetail; noindex: boolean }) {
  const path = communityEventPath(event.slug);
  const description =
    event.metaDescription ??
    [event.shortDescription, event.description].filter(Boolean).join(' — ').replace(/\s+/g, ' ').slice(0, 158);
  const image = event.ogImageUrl ?? event.coverImageUrl ?? undefined;
  const statusMap = { CANCELLED: 'EventCancelled', UPCOMING: 'EventScheduled', ONGOING: 'EventScheduled', COMPLETED: 'EventScheduled' } as const;
  return (
    <SEO
      title={event.metaTitle ?? event.title}
      description={description}
      path={path}
      image={image}
      type="article"
      noindex={noindex}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description,
        startDate: event.startDateTime,
        ...(event.endDateTime && { endDate: event.endDateTime }),
        eventStatus: `https://schema.org/${statusMap[event.status]}`,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(image && { image: [image] }),
        url: absoluteUrl(path),
        organizer: { '@type': 'Organization', name: 'Kolab', url: absoluteUrl('/') },
        ...((event.venueName || event.city) && {
          location: {
            '@type': 'Place',
            name: event.venueName ?? event.city,
            address: {
              '@type': 'PostalAddress',
              streetAddress: event.address ?? undefined,
              addressLocality: event.city ?? undefined,
              addressCountry: event.country ?? 'NP',
            },
            ...(event.latitude != null && event.longitude != null && {
              geo: { '@type': 'GeoCoordinates', latitude: event.latitude, longitude: event.longitude },
            }),
          },
        }),
      }}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-6 h-10 w-3/4" />
      <Skeleton className="mt-3 h-5 w-1/2" />
      <Skeleton className="mt-8 aspect-[16/9] w-full rounded-2xl" />
      <SkeletonText lines={4} className="mt-8 max-w-2xl" />
    </div>
  );
}
