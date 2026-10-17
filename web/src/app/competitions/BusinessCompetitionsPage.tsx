import { Link } from 'react-router-dom';
import { Plus, Trophy, Users, ArrowRight } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import { fetchManagedCompetitions } from '../api/competitions';
import { CompetitionStatusBadge, CompetitionTypeBadge } from './parts';
import { formatNpt, stageStatusBadge } from './format';

export function BusinessCompetitionsPage() {
  const t = useT();
  const list = useAsync((s) => fetchManagedCompetitions(s), []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={t('comp.typeBadge')}
        title={t('comp.organizerTitle')}
        description={t('comp.organizerSubtitle')}
        actions={<Link to="/business/competitions/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover"><Plus size={16} aria-hidden />{t('comp.newTitle')}</Link>}
      />
      {list.loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : list.error ? (
        <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: list.reload }} />
      ) : !list.data?.length ? (
        <EmptyState icon={<Trophy size={28} />} title={t('comp.emptyOrganizerTitle')} description={t('comp.emptyOrganizerBody')} action={{ label: t('comp.newTitle'), href: '/business/competitions/new' }} />
      ) : (
        <ul className="space-y-3">
          {list.data.map((c) => (
            <Card key={c.id} as="li" interactive className="list-none">
              <Link to={`/business/competitions/${c.id}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CompetitionTypeBadge />
                    <CompetitionStatusBadge status={c.status} />
                    {c.suspended && <StatusBadge label={t('comp.suspended')} tone="danger" />}
                  </div>
                  <p className="mt-1.5 truncate text-[16px] font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-soft">
                    <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden />{t('comp.participants', { n: c.participantCount })}</span>
                    {c.currentStage && <span>{c.currentStage.name} · {stageStatusBadge(c.currentStage.status, t).label}</span>}
                    {c.status === 'SCHEDULED' && c.publishAt && <span>{t('comp.goesLive', { when: formatNpt(c.publishAt) })}</span>}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand">{t('comp.manage')} <ArrowRight size={14} aria-hidden /></span>
              </Link>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
