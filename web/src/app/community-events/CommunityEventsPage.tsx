import { Link } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import { ArrowRight, CalendarPlus } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { SEO } from '../../lib/seo/SEO';
import { webPageSchema } from '../../lib/seo/schema';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { SectionHeading } from '../public/detailKit';
import { CommunityEventCard } from './CommunityEventCard';
import { fetchCommunityEvents } from './api';
import { COMMUNITY_EVENTS_PATH } from './format';

/** Public community hub — Upcoming + Past, both derived server-side from dates/status. */
export function CommunityEventsPage() {
  const t = useT();
  const { data, loading, error, reload } = useAsync((s) => fetchCommunityEvents(s), []);

  return (
    <MotionConfig reducedMotion="user">
      <SEO
        title={t('communityEvents.seoTitle')}
        description={t('communityEvents.seoDescription')}
        path={COMMUNITY_EVENTS_PATH}
        jsonLd={webPageSchema({
          path: COMMUNITY_EVENTS_PATH,
          title: t('communityEvents.seoTitle'),
          description: t('communityEvents.seoDescription'),
        })}
      />

      {/* Compact hero — same editorial treatment as BrowseHero, minus search. */}
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="mesh-blob absolute left-[6%] top-[-30%] h-[380px] w-[380px] rounded-full bg-violet/[0.10] blur-[110px]" />
          <div
            className="mesh-blob absolute right-[-4%] top-[-10%] h-[320px] w-[320px] rounded-full bg-brand-orange/[0.09] blur-[110px]"
            style={{ animationDelay: '3s' }}
          />
        </div>
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger()}
          className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 lg:pb-12 lg:pt-16"
        >
          <motion.span
            variants={fadeUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/[0.06] px-3.5 py-1.5 font-serif text-[13px] italic text-violet"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
            {t('communityEvents.eyebrow')}
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="text-balance max-w-3xl font-serif text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl"
          >
            {t('communityEvents.heroTitle')}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
            {t('communityEvents.heroSub')}
          </motion.p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        {error ? (
          <EmptyState
            variant="error"
            title={t('communityEvents.loadError')}
            action={{ label: t('common.retry'), onClick: reload }}
          />
        ) : (
          <>
            <section aria-labelledby="upcoming-heading">
              <SectionHeading>
                <span id="upcoming-heading">{t('communityEvents.upcomingTitle')}</span>
              </SectionHeading>
              {loading ? (
                <CardGridSkeleton count={3} />
              ) : data && data.upcoming.length > 0 ? (
                <CardGrid>
                  {data.upcoming.map((e) => (
                    <CommunityEventCard key={e.id} event={e} />
                  ))}
                </CardGrid>
              ) : (
                <EmptyUpcoming />
              )}
            </section>

            {(loading || (data && data.past.length > 0)) && (
              <section aria-labelledby="past-heading" className="mt-14">
                <SectionHeading>
                  <span id="past-heading">{t('communityEvents.pastTitle')}</span>
                </SectionHeading>
                <p className="-mt-1 mb-6 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{t('communityEvents.pastSub')}</p>
                {loading ? (
                  <CardGridSkeleton count={3} />
                ) : (
                  <CardGrid>
                    {data!.past.map((e) => (
                      <CommunityEventCard key={e.id} event={e} />
                    ))}
                  </CardGrid>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </MotionConfig>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <CardGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2.5 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </CardGrid>
  );
}

/** Compact one-row empty state — never a large blank area. */
function EmptyUpcoming() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-violet/25 bg-violet/[0.03] p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet/10 text-violet">
        <CalendarPlus size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[17px] font-medium text-ink">{t('communityEvents.emptyUpcomingTitle')}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{t('communityEvents.emptyUpcomingBody')}</p>
      </div>
      <Link
        to="/signup"
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-violet to-brand-orange px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 sm:self-center"
      >
        {t('communityEvents.joinKolab')}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
