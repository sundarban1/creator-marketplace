import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, CalendarClock, MapPin, TrendingUp, ExternalLink, Gift } from 'lucide-react';
import { useT } from '../i18n';
import { perCreatorBudget, rupees } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import type { EventCard as EventData } from '../api/publicMarketplace';

/**
 * Shared visual layout for an event's detail page — a hero card (image, title,
 * budget, key facts) followed by the About / Requirements /
 * Deliverables / About-the-business sections. Carries the marketplace's
 * editorial language (Fraunces serif headings, violet/orange accents). The
 * `cta` slot renders centered at the very end, after every section; each page
 * (public vs creator) supplies its own action there and wraps this with its
 * own SEO + back link.
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
  cta?: ReactNode;
}) {
  const t = useT();
  const fmtDeadline = useDeadlineLabel();
  const budget = perCreatorBudget(event);
  const count = event.creatorsNeeded ?? 1;
  const deadline = fmtDeadline(event.deadline);
  const totalUpTo = event.budgetInputType === 'TOTAL' ? event.budgetMax : event.budgetMax * count;
  const isOpenEvent = event.campaignType === 'OPEN_EVENT';
  const perks = (event.benefits ?? []).filter(Boolean);

  return (
    <>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </Link>

      {/* Hero card */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-violet to-brand-orange"
        />
        {event.featureImageUrl && (
          <img
            src={event.featureImageUrl}
            alt=""
            className="aspect-[16/9] w-full border-b border-line object-cover"
          />
        )}

        <div className="bg-gradient-to-br from-violet/[0.05] to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet/20 bg-violet/[0.06] px-2.5 py-1 text-[12px] font-semibold text-violet">
              {event.category}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[12px] font-semibold',
                isOpenEvent ? 'bg-success-soft text-success' : 'bg-violet/15 text-violet',
              )}
            >
              {isOpenEvent ? t('public.badgeFree') : t('public.badgePaid')}
            </span>
          </div>

          <h1 className="mt-3 font-serif text-2xl font-medium leading-[1.12] tracking-tight text-ink sm:text-3xl">
            {event.title}
          </h1>

          <div className="mt-3 flex items-center gap-2.5">
            <span className="inline-flex flex-shrink-0 rounded-full bg-gradient-to-br from-violet/25 to-brand-orange/20 p-[2px]">
              <span className="rounded-full bg-surface p-0.5">
                <Avatar name={event.business.businessName} src={event.business.logoUrl} size="sm" />
              </span>
            </span>
            <span className="text-[14px] text-ink-soft">
              {t('public.postedBy', { name: event.business.businessName })}
            </span>
          </div>

          {/* Paid: per-creator budget (spec §13, §33). Free event: what the
              business offers in kind, never "Rs. 0". */}
          <div className="mt-5 rounded-xl border border-line bg-surface p-4">
            {isOpenEvent ? (
              <>
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
                  <Gift size={14} className="text-success" />
                  {t('public.whatsOfferedLabel')}
                </p>
                {perks.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {perks.map((p) => (
                      <li
                        key={p}
                        className="rounded-full bg-success-soft px-3 py-1 text-[13px] font-semibold text-success"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 font-serif text-2xl font-medium text-ink">
                    {t('public.freeEventPerks')}
                  </p>
                )}
                <p className="mt-2 text-[13px] text-ink-soft">
                  {count === 1 ? t('public.creatorNeeded') : t('public.creatorsNeeded', { count })}
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-medium text-ink-soft">{t('public.budgetPerCreatorLabel')}</p>
                <p className="mt-1 font-serif text-3xl font-medium tracking-tight text-ink">
                  {budget.amount}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-soft">
                  {count === 1 ? t('public.creatorNeeded') : t('public.creatorsNeeded', { count })}
                  {count > 1 && ` · ${t('public.totalPayout', { amount: rupees(totalUpTo) })}`}
                </p>
              </>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Fact icon={<Users size={15} />} label={t('public.navCreators')} value={String(count)} />
            <Fact
              icon={<CalendarClock size={15} />}
              label={t('public.deadlineLabel')}
              value={new Date(event.deadline).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
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
        </div>
      </div>

      <Section title={t('public.eventAboutHeading')}>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{event.description}</p>
      </Section>

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
        {event.business.id ? (
          <Link
            to={`/businesses/${encodeURIComponent(event.business.slug ?? event.business.id)}`}
            className={cn(
              'flex items-start gap-3 rounded-xl border border-line bg-surface p-4',
              'transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-[0_10px_28px_-16px_rgba(123,92,245,0.4)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
            )}
          >
            <Avatar name={event.business.businessName} src={event.business.logoUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-ink">{event.business.businessName}</p>
              {event.business.description && (
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{event.business.description}</p>
              )}
              {event.business.website && (
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-violet">
                  {event.business.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={12} />
                </span>
              )}
            </div>
          </Link>
        ) : (
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
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-violet hover:underline"
                >
                  {event.business.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}
      </Section>

      {cta && <div className="mt-10 flex justify-center">{cta}</div>}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="font-serif text-[19px] font-medium tracking-tight text-ink">{title}</h2>
        <span className="mt-2 block h-0.5 w-9 rounded-full bg-gradient-to-r from-violet to-brand-orange" />
      </div>
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
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3">
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
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 aspect-[16/9] w-full rounded-2xl" />
      <Skeleton className="mt-5 h-9 w-3/4" />
      <Skeleton className="mt-3 h-4 w-40" />
      <Skeleton className="mt-5 h-24 w-full rounded-2xl" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-32" />
        <SkeletonText lines={4} />
      </div>
    </>
  );
}
