import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, Trophy } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';
import { StatusBadge } from '../ui/StatusBadge';
import { fetchCompetitions, fetchJoinedCompetitions, type CompetitionCard as CardData, type JoinedCompetition } from '../api/competitions';
import { CompetitionCard, CompetitionTypeBadge } from './parts';
import { creatorStatusBadge, formatNpt, timeLeft } from './format';

type Tab = 'discover' | 'mine' | 'results';

export function CreatorCompetitionsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (['discover', 'mine', 'results'].includes(params.get('tab') ?? '') ? params.get('tab') : 'discover') as Tab;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={t('comp.typeBadge')} title={t('comp.creatorTitle')} description={t('comp.creatorSubtitle')} />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={(v) => setParams(v === 'discover' ? {} : { tab: v }, { replace: true })}
        tabs={[
          { value: 'discover', label: t('comp.tabDiscover') },
          { value: 'mine', label: t('comp.tabMine') },
          { value: 'results', label: t('comp.tabResults') },
        ]}
      />
      {tab === 'mine' ? <MyCompetitions /> : <Browse key={tab} tab={tab === 'results' ? 'results' : 'open'} />}
    </div>
  );
}

function Browse({ tab }: { tab: 'open' | 'results' }) {
  const t = useT();
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CardData[]>([]);
  const res = useAsync(async (signal) => {
    const r = await fetchCompetitions({ tab, q: query || undefined, page, limit: 12 }, signal);
    setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
    return r;
  }, [tab, query, page]);

  return (
    <div>
      <SearchInput className="mb-5 max-w-md" value={q} onChange={(v: string) => { setQ(v); setPage(1); }} placeholder={t('comp.searchPlaceholder')} />
      {res.loading && page === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
      ) : res.error ? (
        <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: res.reload }} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title={tab === 'results' ? t('comp.emptyResultsTitle') : t('comp.emptyDiscoverTitle')}
          description={tab === 'results' ? t('comp.emptyResultsBody') : t('comp.emptyDiscoverBody')}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => <CompetitionCard key={c.id} c={c} href={`/creator/competitions/${c.id}`} />)}
          </div>
          {res.data && page < res.data.pagination.totalPages && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" loading={res.loading} onClick={() => setPage((p) => p + 1)}>{t('comp.loadMore')}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MyCompetitions() {
  const t = useT();
  const res = useAsync((s) => fetchJoinedCompetitions(s), []);
  if (res.loading) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  if (res.error) return <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: res.reload }} />;
  if (!res.data?.length) {
    return <EmptyState icon={<Trophy size={28} />} title={t('comp.emptyMineTitle')} description={t('comp.emptyMineBody')} action={{ label: t('comp.tabDiscover'), href: '/creator/competitions' }} />;
  }
  return <ul className="space-y-3">{res.data.map((j) => <JoinedRow key={j.participantId} j={j} />)}</ul>;
}

function JoinedRow({ j }: { j: JoinedCompetition }) {
  const t = useT();
  const badge = creatorStatusBadge(j.status, t);
  const deadline = j.currentStage && ['OPEN', 'UPCOMING'].includes(j.currentStage.status) ? j.currentStage : null;
  const left = deadline ? timeLeft(deadline.status === 'UPCOMING' ? deadline.opensAt : deadline.deadline, t) : null;
  return (
    <Card as="li" interactive className="list-none">
      <Link to={`/creator/competitions/${j.competition.id}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CompetitionTypeBadge />
            <StatusBadge label={badge.label} tone={badge.tone} dot />
          </div>
          <p className="mt-1.5 text-[16px] font-semibold text-ink">{j.competition.title}</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {j.currentStage ? t('comp.stageOf', { name: j.currentStage.name, n: j.currentStage.order, total: j.competition.stageCount }) : null}
            {j.competition.organizer.name ? ` · ${j.competition.organizer.name}` : ''}
          </p>
          <p className="mt-1 text-[13px] text-ink">{badge.hint}</p>
          {deadline && left && !left.past && (
            <p className={`mt-1 inline-flex items-center gap-1 text-[12.5px] ${left.urgent ? 'font-semibold text-danger' : 'text-ink-soft'}`}>
              <Clock size={13} aria-hidden />
              {deadline.status === 'UPCOMING' ? t('comp.opensOn', { when: formatNpt(deadline.opensAt) }) : t('comp.deadlineOn', { when: formatNpt(deadline.deadline) })}
            </p>
          )}
          {j.latestResult?.decision && (
            <p className="mt-1 text-[12.5px] text-ink-soft">
              {t('comp.latestResult', { stage: j.latestResult.stageName, result: j.latestResult.decision === 'ADVANCE' ? t('comp.outcomeAdvanced') : t('comp.outcomeNotSelected') })}
            </p>
          )}
          {j.awards.length > 0 && <p className="mt-1 text-[13px] font-semibold text-brand-orange">🏆 {j.awards.map((a) => a.title).join(', ')}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand">
          {j.status === 'SUBMISSION_REQUIRED' ? t('comp.ctaSubmit') : t('comp.ctaViewProgress')} <ArrowRight size={14} aria-hidden />
        </span>
      </Link>
    </Card>
  );
}
