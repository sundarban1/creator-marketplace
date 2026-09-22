import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, FileText, Wallet, CalendarClock, ArrowRight, UserRound, AlertCircle } from 'lucide-react';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useWelcomeToast } from '../lib/useWelcomeToast';
import { rupees, isFuture, byDateAsc } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { isActiveWork } from '../lib/engagement';
import { fetchWalletSummary, fetchMyApplications, fetchNotifications, fetchCreatorFullProfile } from '../api/creator';
import { fetchPublicEvents } from '../api/publicMarketplace';
import { fetchOpenMeetups } from '../api/meetup';
import { cn } from '../ui/cn';
import { PageHeader } from '../ui/PageHeader';
import { DashboardHero } from '../ui/DashboardHero';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { AttentionBanner } from '../ui/AttentionBanner';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { DashStatCard } from './dash-ui/DashStatCard';
import { DashApplicationCard } from './dash-ui/DashApplicationCard';
import { DashEventCard } from './dash-ui/DashEventCard';

// States where an already-accepted, paid engagement is waiting on the
// creator's next move — mirrors the mobile home screen's `pendingActions`
// derivation (start work once escrow is funded, submit once it's underway).
const START_WORK_STATES = new Set(['ESCROW_FUNDED']);
const SUBMIT_WORK_STATES = new Set(['IN_PROGRESS', 'REVISION_REQUESTED', 'CONTENT_OVERDUE']);

export function CreatorDashboard() {
  const { user } = useAppAuth();
  const t = useT();
  const fmtDeadline = useDeadlineLabel();
  useWelcomeToast();

  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);

  const wallet = useAsync((s) => fetchWalletSummary(s), []);
  const apps = useAsync((s) => fetchMyApplications({ limit: 50 }, s), []);
  const activity = useAsync((s) => fetchNotifications(6, s), []);
  const recommended = useAsync((s) => fetchPublicEvents({ limit: 3 }, s), []);
  const profile = useAsync((s) => fetchCreatorFullProfile(s), []);
  const meetups = useAsync((s) => fetchOpenMeetups(s), []);

  const { activeWork, pending, upcoming } = useMemo(() => {
    const list = apps.data?.items ?? [];
    const active = list.filter((a) => isActiveWork(a.engagementState));
    return {
      activeWork: active,
      pending: list.filter((a) => a.engagementState === 'PROPOSAL_PENDING'),
      upcoming: active
        .filter((a) => isFuture(a.contentDeadline))
        .sort((x, y) => byDateAsc(x.contentDeadline!, y.contentDeadline!)),
    };
  }, [apps.data]);

  // Photo and social links matter most for discoverability, so they lead —
  // same ordering the mobile home screen uses.
  const missingFields = useMemo(() => {
    const p = profile.data;
    if (!p) return [];
    const out: string[] = [];
    if (!p.avatarUrl) out.push(t('dashboard.fieldPhoto'));
    if (!Object.values(p.socialLinks ?? {}).some(Boolean)) out.push(t('dashboard.fieldSocial'));
    if (!p.bio) out.push(t('dashboard.fieldBio'));
    if (!p.location) out.push(t('dashboard.fieldLocation'));
    if (!p.categories?.length) out.push(t('dashboard.fieldCategories'));
    return out;
  }, [profile.data, t]);

  // One "needs your attention" banner at most — pending work always wins
  // over the profile nudge since it's the more time-sensitive of the two.
  const pendingActions = useMemo(() => {
    const list = apps.data?.items ?? [];
    return list.filter(
      (a) => START_WORK_STATES.has(a.engagementState) || SUBMIT_WORK_STATES.has(a.engagementState),
    );
  }, [apps.data]);

  const firstName = user?.name && !/^\+?\d+$/.test(user.name) ? user.name.split(' ')[0] : '';
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'dashboard.greetingMorning' : hour < 17 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening';

  return (
    <>
      <PageHeader
        title={`${firstName ? t(greetingKey, { name: firstName }) : t('dashboard.greetingGeneric')}${firstName ? ' 👋' : ''}`}
      />

      {/* Attention banner — at most one, then the primary CTA below it. */}
      <div className="mb-6 flex flex-col gap-3">
        {pendingActions.length > 0 ? (
          <AttentionBanner
            icon={AlertCircle}
            title={t('dashboard.actionNeeded')}
            subtitle={
              pendingActions.length === 1
                ? START_WORK_STATES.has(pendingActions[0]!.engagementState)
                  ? t('dashboard.actionStartWork', { title: pendingActions[0]!.campaign?.title ?? '' })
                  : t('dashboard.actionSubmitWork', { title: pendingActions[0]!.campaign?.title ?? '' })
                : t('dashboard.actionMultiple', { n: pendingActions.length })
            }
            to="/creator/work"
          />
        ) : (
          !profileBannerDismissed &&
          missingFields.length > 0 && (
            <AttentionBanner
              icon={UserRound}
              title={t('dashboard.completeProfileTitle')}
              subtitle={t('dashboard.completeProfileSubtitle', { fields: missingFields.join(' · ') })}
              to="/creator/profile"
              onDismiss={() => setProfileBannerDismissed(true)}
            />
          )
        )}

        <DashboardHero
          title={t('dashboard.ctaTitle')}
          subtitle={t('dashboard.ctaSubtitle')}
          ctaLabel={t('dashboard.ctaBtn')}
          to="/creator/events"
        />

        {/* Meetup CTA — every city-facing string comes from the meetup record
            itself (title/city), never hard-coded, so a second city opening
            registration needs no code change here (spec §6/§25). Renders
            nothing while loading/empty, a single-meetup hero when exactly one
            is open, or a compact multi-meetup card when several are. */}
        {!meetups.loading && meetups.data && meetups.data.length === 1 && (
          <DashboardHero
            title={`🎉 ${meetups.data[0]!.title}`}
            subtitle={t('meetup.dashboardCtaSubtitle', { city: meetups.data[0]!.city })}
            ctaLabel={t('meetup.dashboardCtaBtn')}
            to={`/creator/meetups/${meetups.data[0]!.id}`}
          />
        )}
        {!meetups.loading && meetups.data && meetups.data.length > 1 && (
          <Link
            to="/creator/meetups"
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
          >
            <div>
              <p className="text-[14px] font-semibold text-ink">🎉 {t('meetup.ctaMultipleTitle')}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{t('meetup.dashboardCtaMultipleSubtitle', { n: meetups.data.length })}</p>
            </div>
            <ArrowRight size={16} className="flex-shrink-0 text-ink-soft" />
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashStatCard
          label={t('dashboard.activeWork')}
          compact
          value={apps.loading ? undefined : activeWork.length}
          icon={Briefcase}
          tone="brand"
        />
        <DashStatCard
          label={t('dashboard.pendingApplications')}
          compact
          value={apps.loading ? undefined : pending.length}
          icon={FileText}
          tone="orange"
        />
        <DashStatCard
          label={t('dashboard.walletBalance')}
          compact
          value={wallet.loading ? undefined : rupees(wallet.data?.withdrawableBalance ?? 0)}
          icon={Wallet}
          tone="emerald"
          hint={
            wallet.data && wallet.data.pendingEarnings > 0
              ? `+ ${rupees(wallet.data.pendingEarnings)} pending`
              : undefined
          }
        />
        <DashStatCard
          label={t('dashboard.upcomingDeadlines')}
          compact
          value={apps.loading ? undefined : upcoming.length}
          icon={CalendarClock}
          tone="blue"
          hint={
            upcoming[0]?.contentDeadline
              ? fmtDeadline(upcoming[0].contentDeadline).label
              : undefined
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Active work */}
        <DashCard>
          <DashCardHeader
            title={t('dashboard.activeWorkHeading')}
            action={
              <Link to="/creator/work" className="text-[13px] font-semibold text-brand hover:underline">
                {t('dashboard.viewAll')}
              </Link>
            }
          />
          {apps.loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : apps.error ? (
            <EmptyState size="sm" variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: apps.reload }} />
          ) : activeWork.length === 0 ? (
            <EmptyState
              size="sm"
              variant="empty"
              title={t('dashboard.noActiveWork')}
              action={{ label: t('dashboard.exploreEvents'), href: '/creator/events' }}
            />
          ) : (
            <motion.div initial="hidden" animate="show" variants={stagger(0.05)} className="space-y-3">
              {activeWork.slice(0, 4).map((a) => (
                <motion.div key={a.id} variants={fadeUp}>
                  <DashApplicationCard application={a} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </DashCard>

        {/* Recent activity */}
        <DashCard>
          <DashCardHeader
            title={t('dashboard.recentActivity')}
            action={
              <Link to="/creator/settings" className="text-[13px] font-semibold text-brand hover:underline">
                {t('dashboard.seeAll')}
              </Link>
            }
          />
          {activity.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !activity.data || activity.data.length === 0 ? (
            <EmptyState size="sm" variant="empty" title={t('dashboard.noActivity')} />
          ) : (
            <ul className="divide-y divide-line">
              {activity.data.map((n) => (
                <li key={n.id} className="flex gap-3 py-3">
                  <span className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', n.isRead ? 'bg-line-strong' : 'bg-brand')} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-soft">{n.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashCard>
      </div>

      {/* Recommended events */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">{t('dashboard.recommendedHeading')}</h2>
          <Link to="/creator/events" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
            {t('dashboard.seeAll')}
            <ArrowRight size={13} />
          </Link>
        </div>
        {profile.data && profile.data.categories.length > 0 && !recommended.loading && recommended.data && recommended.data.items.length > 0 && (
          <p className="-mt-2 mb-4 text-[12.5px] text-ink-soft">
            {t('dashboard.recommendedHint', { categories: profile.data.categories.slice(0, 3).join(', ') })}
          </p>
        )}
        {recommended.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : !recommended.data || recommended.data.items.length === 0 ? (
          <EmptyState size="sm" variant="no-events" title={t('public.noEventsTitle')} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger(0.05)}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {recommended.data.items.map((e) => (
              <motion.div key={e.id} variants={fadeUp}>
                <DashEventCard event={e} hrefBase="/creator/events" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </>
  );
}
