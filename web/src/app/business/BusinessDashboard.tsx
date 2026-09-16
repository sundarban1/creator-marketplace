import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, FileText, Briefcase, PackageCheck, Plus, ArrowRight, Building2, AlertCircle, Users } from 'lucide-react';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useWelcomeToast } from '../lib/useWelcomeToast';
import { fetchNotifications } from '../api/creator';
import { fetchMyCampaigns, fetchBusinessApplications, fetchBusinessProfile, listBusinessCreators, fetchSavedCreatorIds, toggleSaveCreator } from '../api/business';
import { fetchCategories } from '../api/catalog';
import { engagementMeta } from '../lib/engagement';
import { perCreatorBudget } from '../lib/format';
import { PageHeader } from '../ui/PageHeader';
import { DashboardHero } from '../ui/DashboardHero';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { AttentionBanner } from '../ui/AttentionBanner';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { makeCategoryLookup } from '../public/categoryLookup';
import { cn } from '../ui/cn';
import { BizApplicationCard } from './BizApplicationCard';
import { BizCreatorCard } from './BizCreatorCard';

const CAMPAIGN_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

export function BusinessDashboard() {
  const { user } = useAppAuth();
  const t = useT();
  useWelcomeToast();

  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  const [saveOverrides, setSaveOverrides] = useState<Map<string, boolean>>(new Map());

  const campaigns = useAsync((s) => fetchMyCampaigns({ limit: 100 }, s), []);
  const apps = useAsync((s) => fetchBusinessApplications({ limit: 100 }, s), []);
  const activity = useAsync((s) => fetchNotifications(6, s), []);
  const profile = useAsync((s) => fetchBusinessProfile(s), []);
  const savedIds = useAsync((s) => fetchSavedCreatorIds(s), []);
  const categories = useAsync((s) => fetchCategories(s), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories.data ?? []), [categories.data]);
  // Recommended-for-you rail keys off what an INDIVIDUAL said they're looking
  // for during onboarding (`defaultCreatorCategories`) — NOT the business's own
  // industry (`categories`), which is a different question ("we are a
  // Restaurant" vs. "we need a Photographer"). Organizations don't set this, so
  // the rail stays hidden for them (matches mobile's business home).
  const recommendedCategory = profile.data?.defaultCreatorCategories?.[0];
  const discover = useAsync(
    (s) => listBusinessCreators({ categories: recommendedCategory ? [recommendedCategory] : undefined }, s),
    [recommendedCategory],
  );

  const activeEvents = (campaigns.data?.items ?? []).filter((c) => c.status === 'ACTIVE').length;

  const liveCampaigns = useMemo(() => {
    const items = campaigns.data?.items ?? [];
    return items
      .filter((c) => c.status === 'ACTIVE' || c.status === 'PENDING_APPROVAL' || c.status === 'PAUSED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [campaigns.data]);

  const { toReview, inProgress, toApprove, needsAction } = useMemo(() => {
    const list = apps.data?.items ?? [];
    const pending = list.filter((a) => a.engagementState === 'PROPOSAL_PENDING');
    const review = list.filter((a) => a.engagementState === 'BUSINESS_REVIEW');
    const progress = list.filter((a) => {
      const b = engagementMeta(a.engagementState).bucket;
      return b === 'active' && a.engagementState !== 'BUSINESS_REVIEW';
    });
    return {
      toReview: pending,
      inProgress: progress,
      toApprove: review,
      needsAction: [...review, ...pending].slice(0, 5),
    };
  }, [apps.data]);

  // Same ordering as the mobile business home's `missingFields` — logo and
  // about matter most for a creator deciding whether to apply.
  const missingFields = useMemo(() => {
    const p = profile.data;
    if (!p) return [];
    const out: string[] = [];
    if (!p.logoUrl) out.push(t('biz.fieldLogo'));
    if (!p.description) out.push(t('biz.fieldAbout'));
    if (!p.location) out.push(t('biz.fieldLocation'));
    if (!p.categories.length) out.push(t('biz.fieldIndustry'));
    if (!p.website) out.push(t('biz.fieldWebsite'));
    return out;
  }, [profile.data, t]);

  const isSaved = (id: string) => saveOverrides.get(id) ?? (savedIds.data ?? []).includes(id);
  const onToggleSave = async (id: string) => {
    const next = !isSaved(id);
    setSaveOverrides((prev) => new Map(prev).set(id, next));
    try {
      await toggleSaveCreator(id);
    } catch {
      setSaveOverrides((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
    }
  };

  const firstName = user?.name && !/^\+?\d+$/.test(user.name) ? user.name.split(' ')[0] : '';
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'biz.greetingMorning' : hour < 17 ? 'biz.greetingAfternoon' : 'biz.greetingEvening';

  return (
    <>
      <PageHeader
        title={firstName ? t(greetingKey, { name: firstName }) : t('biz.greetingGeneric')}
        actions={
          <Link to="/business/events/create">
            <Button size="sm">
              <Plus size={15} />
              {t('biz.createEvent')}
            </Button>
          </Link>
        }
      />

      {/* Attention banner — at most one, then the primary CTA below it. */}
      <div className="mb-6 flex flex-col gap-3">
        {needsAction.length > 0 ? (
          <AttentionBanner
            icon={AlertCircle}
            title={t('biz.actionNeeded')}
            subtitle={needsAction.length === 1 ? t('biz.actionNeededSingular') : t('biz.actionNeededPlural', { n: needsAction.length })}
            to="/business/applications"
          />
        ) : (
          !profileBannerDismissed &&
          missingFields.length > 0 && (
            <AttentionBanner
              icon={Building2}
              title={t('biz.completeProfileTitle')}
              subtitle={t('biz.completeProfileSubtitle', { fields: missingFields.join(' · ') })}
              to="/business/profile"
              onDismiss={() => setProfileBannerDismissed(true)}
            />
          )
        )}

        <DashboardHero
          title={t('biz.ctaTitle')}
          subtitle={t('biz.ctaSubtitle')}
          ctaLabel={t('biz.ctaBtn')}
          to="/business/events/create"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('biz.activeEvents')} compact value={campaigns.loading ? undefined : activeEvents} icon={CalendarDays} tone="brand" />
        <StatCard label={t('biz.toReview')} compact value={apps.loading ? undefined : toReview.length} icon={FileText} tone="orange" />
        <StatCard label={t('biz.inProgress')} compact value={apps.loading ? undefined : inProgress.length} icon={Briefcase} tone="blue" />
        <StatCard label={t('biz.toApprove')} compact value={apps.loading ? undefined : toApprove.length} icon={PackageCheck} tone="emerald" />
      </div>

      <Card className="mt-6">
        <CardHeader
          title={t('biz.activeCampaigns')}
          action={
            <Link to="/business/events" className="text-[13px] font-semibold text-brand hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          }
        />
        {campaigns.loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : campaigns.error ? (
          <EmptyState size="sm" variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: campaigns.reload }} />
        ) : liveCampaigns.length === 0 ? (
          <EmptyState
            size="sm"
            variant="empty"
            title={t('biz.noActiveCampaigns')}
            action={{ label: t('biz.createEvent'), href: '/business/events/create' }}
          />
        ) : (
          <motion.ul initial="hidden" animate="show" variants={stagger(0.05)} className="divide-y divide-line">
            {liveCampaigns.map((c) => {
              const budget = perCreatorBudget(c);
              const isOpenEvent = c.campaignType === 'OPEN_EVENT';
              return (
                <motion.li key={c.id} variants={fadeUp}>
                  <Link
                    to={`/business/events/${c.id}`}
                    className="group flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-surface-dim"
                  >
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-surface-dim">
                      {c.featureImageUrl ? (
                        <img src={c.featureImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Avatar name={c.business?.businessName ?? '—'} src={c.business?.logoUrl ?? null} size="sm" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{c.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} />
                          {t('biz.applicantsCount', { count: c._count?.applications ?? 0 })}
                        </span>
                        <span>
                          {isOpenEvent ? t('public.badgeFree') : t('public.budgetPerCreator', { amount: budget.amount })}
                        </span>
                      </p>
                    </div>
                    <StatusBadge label={c.status} tone={CAMPAIGN_STATUS_TONE[c.status] ?? 'neutral'} dot={false} />
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title={t('biz.needsAction')}
            action={
              <Link to="/business/applications" className="text-[13px] font-semibold text-brand hover:underline">
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
          ) : needsAction.length === 0 ? (
            <EmptyState size="sm" variant="empty" title={t('biz.nothingToReview')} />
          ) : (
            <motion.div initial="hidden" animate="show" variants={stagger(0.05)} className="space-y-3">
              {needsAction.map((a) => (
                <motion.div key={a.id} variants={fadeUp}>
                  <BizApplicationCard application={a} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </Card>

        <Card>
          <CardHeader title={t('biz.recentActivity')} />
          {activity.loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !activity.data || activity.data.length === 0 ? (
            <EmptyState size="sm" variant="empty" title={t('biz.noActivity')} />
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
        </Card>
      </div>

      {/* Discover creators */}
      {!discover.loading && discover.data && discover.data.creators.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">{t('biz.discoverCreators')}</h2>
            <Link to="/business/creators" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
              {t('dashboard.seeAll')}
              <ArrowRight size={13} />
            </Link>
          </div>
          {recommendedCategory && (
            <p className="-mt-2 mb-4 text-[12.5px] text-ink-soft">
              {t('biz.discoverCreatorsHint', { industry: recommendedCategory })}
            </p>
          )}
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger(0.05)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {discover.data.creators.slice(0, 4).map((c) => (
              <motion.div key={c.id} variants={fadeUp}>
                <BizCreatorCard
                  creator={c}
                  categoryMeta={categoryMeta}
                  saved={isSaved(c.id)}
                  onToggleSave={() => onToggleSave(c.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </>
  );
}
