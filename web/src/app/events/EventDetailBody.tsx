import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, CalendarClock, MapPin, TrendingUp, ExternalLink } from 'lucide-react';
import { useT } from '../i18n';
import { perCreatorBudget, rupees } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { Avatar } from '../ui/Avatar';
import { CardHeader } from '../ui/Card';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import type { EventCard as EventData } from '../api/publicMarketplace';

/**
 * Shared visual layout for an event's detail page — image, title, per-creator
 * budget block, key facts, and the About / Goals / Platforms / Requirements /
 * Deliverables / About-the-business sections. The `cta` slot sits right under
 * the facts grid; each page (public vs creator) supplies its own action there
 * and wraps this with its own SEO + back link.
 */
export function EventDetailBody({
  event,
  backTo,
  backLabel,
  cta,
}: {
  event: EventData;
  backTo: string;
  backLabel: string;
  cta: ReactNode;
}) {
  const t = useT();
  const fmtDeadline = useDeadlineLabel();
  const budget = perCreatorBudget(event);
  const count = event.creatorsNeeded ?? 1;
  const deadline = fmtDeadline(event.deadline);
  const platforms = [...new Set(event.platforms)];
  const totalUpTo = event.budgetInputType === 'TOTAL' ? event.budgetMax : event.budgetMax * count;

  return (
    <>
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {backLabel}
      </Link>

      {event.featureImageUrl && (
        <img
          src={event.featureImageUrl}
          alt=""
          className="mt-4 aspect-[16/9] w-full rounded-2xl border border-line object-cover"
        />
      )}

      <div className="mt-5">
        <span className="rounded-full bg-surface-dim px-2.5 py-1 text-[12px] font-medium text-ink-soft">
          {event.category}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
        <div className="mt-3 flex items-center gap-2.5">
          <Avatar name={event.business.businessName} src={event.business.logoUrl} size="sm" />
          <span className="text-[14px] text-ink-soft">
            {t('public.postedBy', { name: event.business.businessName })}
          </span>
        </div>
      </div>

      {/* Budget — per creator (spec §13, §33) */}
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <p className="text-[13px] font-medium text-ink-soft">{t('public.budgetPerCreatorLabel')}</p>
        <p className="mt-1 text-2xl font-bold text-ink">{budget.amount}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">
          {count === 1 ? t('public.creatorNeeded') : t('public.creatorsNeeded', { count })}
          {count > 1 && ` · ${t('public.totalPayout', { amount: rupees(totalUpTo) })}`}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<Users size={15} />} label={t('public.navCreators')} value={String(count)} />
        <Fact
          icon={<CalendarClock size={15} />}
          label={t('public.deadlineLabel')}
          value={new Date(event.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          hint={deadline.urgent ? deadline.label : undefined}
        />
        <Fact
          icon={<MapPin size={15} />}
          label={t('public.location')}
          value={event.locationType === 'REMOTE' ? t('public.remote') : event.location || t('public.onsite')}
        />
        {event.minFollowers > 0 && (
          <Fact
            icon={<TrendingUp size={15} />}
            label={t('public.followers')}
            value={t('public.minFollowersLabel', { count: event.minFollowers.toLocaleString('en-IN') })}
          />
        )}
      </dl>

      <div className="mt-6">{cta}</div>

      <Section title={t('public.eventAboutHeading')}>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{event.description}</p>
      </Section>

      {event.goals && event.goals.length > 0 && (
        <Section title={t('public.goalsHeading')}>
          <ul className="flex flex-wrap gap-2">
            {event.goals.map((g) => (
              <li key={g} className="rounded-full bg-surface-dim px-3 py-1 text-[13px] text-ink-soft">
                {g}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {platforms.length > 0 && (
        <Section title={t('public.platformsLabel')}>
          <ul className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink"
              >
                <PlatformIcon platform={p} size={15} />
                {platformMeta(p).label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {event.requirements && event.requirements.length > 0 && (
        <Section title={t('public.requirementsHeading')}>
          <ul className="space-y-2.5">
            {event.requirements.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-ink">
                    {r.quantity}× {r.category.name}
                  </span>
                  <span className="text-[13px] font-semibold text-ink">
                    {r.budgetType === 'FIXED' && r.budgetFixed != null
                      ? rupees(r.budgetFixed)
                      : r.budgetMin != null && r.budgetMax != null
                        ? `${rupees(r.budgetMin)} – ${rupees(r.budgetMax)}`
                        : '—'}
                  </span>
                </div>
                {r.deliverables && <p className="mt-1 text-[13px] text-ink-soft">{r.deliverables}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {event.deliverables && (
        <Section title={t('public.deliverablesHeading')}>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{event.deliverables}</p>
        </Section>
      )}

      <Section title={t('public.aboutBusinessHeading')}>
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
          <Avatar name={event.business.businessName} src={event.business.logoUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">{event.business.businessName}</p>
            {event.business.description && (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{event.business.description}</p>
            )}
            {event.business.website && (
              <a
                href={event.business.website}
                target="_blank"
                rel="noreferrer nofollow"
                className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
              >
                {event.business.website.replace(/^https?:\/\//, '')}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <CardHeader title={title} />
      {children}
    </section>
  );
}

function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-soft">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[14px] font-semibold text-ink">{value}</p>
      {hint && <p className="text-[12px] font-medium text-warning">{hint}</p>}
    </div>
  );
}

export function EventDetailSkeleton() {
  return (
    <>
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <Skeleton className="mt-5 h-8 w-3/4" />
      <Skeleton className="mt-3 h-4 w-40" />
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-32" />
        <SkeletonText lines={4} />
      </div>
    </>
  );
}
