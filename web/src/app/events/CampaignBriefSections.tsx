import type { ReactNode } from 'react';
import { MapPin, Globe2, Flag, Clapperboard, CalendarDays, Check, X as XIcon } from 'lucide-react';
import { useT } from '../i18n';
import type { CampaignBrief, CampaignLocation, DeliverableItem, LocationScope } from '../api/business';
import { BRIEF_SECTIONS, sectionFilled, shownPlatform, type BriefFieldDef } from '../business/guided/briefSections';

/**
 * Everything the guided creator captures beyond the basics, rendered for
 * reading: where creators should be, deliverables per creator, the campaign
 * timeline and the advanced brief (content guidelines, creator requirements,
 * audience, commercial terms, approval). Used by the creator/public event
 * page and the business's own event page, so both show the same data.
 * Renders nothing for older campaigns that have none of it.
 */
export interface BriefSource {
  locations?: CampaignLocation[];
  locationScope?: LocationScope;
  locationType?: 'ONSITE' | 'REMOTE' | null;
  location?: string | null;
  deliverableItems?: DeliverableItem[];
  brief?: CampaignBrief;
  startDate?: string | null;
  applicationDeadline?: string | null;
  deadline?: string;
  hashtags?: string[];
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function CampaignBriefSections({ c, Section }: {
  c: BriefSource;
  // Each page passes its own section shell so headings match its design.
  Section: (p: { title: string; children: ReactNode }) => ReactNode;
}) {
  const t = useT();
  const items = c.deliverableItems ?? [];
  const brief = c.brief ?? {};
  const locations = c.locations?.length ? c.locations : c.location && c.locationType === 'ONSITE' ? [{ name: c.location }] : [];
  const hasTimeline = !!(c.startDate || c.applicationDeadline);
  const sections = BRIEF_SECTIONS.filter((s) => sectionFilled(brief, s.key));
  const hasWhere = locations.length > 0 || c.locationScope === 'NATIONWIDE' || (c.locationScope === 'ANYWHERE' && c.locationType === 'REMOTE');

  return (
    <>
      {hasWhere && (
        <Section title={t('guided.dWhere')}>
          {locations.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {locations.map((l) => (
                <li key={l.name} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[14px] font-medium text-ink">
                  <MapPin size={14} className="text-violet" />
                  {l.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="inline-flex items-center gap-2 text-[15px] text-ink">
              {c.locationScope === 'NATIONWIDE' ? <Flag size={15} className="text-violet" /> : <Globe2 size={15} className="text-violet" />}
              {c.locationScope === 'NATIONWIDE' ? t('guided.scopeNationwide') : t('guided.scopeAnywhere')}
            </p>
          )}
          <p className="mt-2 text-[13px] text-ink-soft">
            {c.locationType === 'ONSITE' ? t('guided.creatorsVisitYou') : t('guided.dRemoteOk')}
          </p>
        </Section>
      )}

      {items.length > 0 && (
        <Section title={t('guided.dDeliverables')}>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {items.map((d, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <Clapperboard size={16} className="flex-shrink-0 text-violet" />
                <span className="min-w-0 flex-1 text-[15px] text-ink">
                  <span className="font-semibold">{d.quantity}×</span> {t(`guided.deliv_${d.type}`)}
                  {d.notes && <span className="block text-[13px] text-ink-soft">{d.notes}</span>}
                </span>
                {shownPlatform(d.type, d.platform) && <span className="rounded-full bg-violet/[0.07] px-2.5 py-0.5 text-[12px] font-semibold text-violet-dark">{d.platform}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-soft">{t('guided.dPerCreator')}</p>
        </Section>
      )}

      {hasTimeline && (
        <Section title={t('guided.dTimeline')}>
          <dl className="grid gap-2.5 sm:grid-cols-3">
            {c.startDate && <TimelineItem label={t('guided.startOn')} value={fmt(c.startDate)} />}
            {c.applicationDeadline && <TimelineItem label={t('guided.applyBy')} value={fmt(c.applicationDeadline)} />}
            {c.deadline && <TimelineItem label={t('guided.finishBy')} value={fmt(c.deadline)} />}
          </dl>
        </Section>
      )}

      {sections.map((s) => (
        <Section key={s.key} title={t(s.title)}>
          <dl className="space-y-4">
            {s.fields.map((f) => {
              const v = (brief[s.key] as Record<string, unknown> | undefined)?.[f.key];
              if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
              return (
                <div key={f.key}>
                  <dt className="text-[13px] font-semibold text-ink">{t(f.label)}</dt>
                  <dd className="mt-1 text-[15px] text-ink-soft"><FieldValue def={f} value={v} /></dd>
                </div>
              );
            })}
          </dl>
        </Section>
      ))}
    </>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <dt className="flex items-center gap-1.5 text-[12px] text-ink-soft"><CalendarDays size={13} />{label}</dt>
      <dd className="mt-1 text-[14px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

function FieldValue({ def, value }: { def: BriefFieldDef; value: unknown }) {
  const t = useT();
  if (def.kind === 'list') {
    const isDont = def.key === 'donts';
    const isDo = def.key === 'dos';
    return (
      <ul className="space-y-1">
        {(value as string[]).map((v) => (
          <li key={v} className="flex gap-2">
            {isDo ? <Check size={15} className="mt-1 flex-shrink-0 text-success" /> : isDont ? <XIcon size={15} className="mt-1 flex-shrink-0 text-danger" /> : <span aria-hidden className="mt-2.5 h-1 w-1 flex-shrink-0 rounded-full bg-ink-soft" />}
            <span>{def.key === 'mentions' && !v.startsWith('@') ? `@${v}` : v}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (def.kind === 'bool') return <>{value ? t('guided.yes') : t('guided.no')}</>;
  if (def.kind === 'tiers') return <>{(value as string[]).map((tier) => t(`guided.tier_${tier}`)).join(', ')}</>;
  if (def.kind === 'date') return <>{fmt(value as string)}</>;
  if (def.key === 'minEngagementRate') return <>{String(value)}%</>;
  if (def.key === 'licensingDays' || def.key === 'exclusivityDays') return <>{t('guided.daysCount', { count: Number(value) })}</>;
  return <span className="whitespace-pre-line">{String(value)}</span>;
}
