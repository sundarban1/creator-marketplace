import { useState } from 'react';
import { History } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { fetchCompetitionActivity } from '../api/competitions';
import { Section } from './parts';
import { formatNpt, activityLabel } from './format';

export function ActivityPanel({ competitionId }: { competitionId: string }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const res = useAsync((s) => fetchCompetitionActivity(competitionId, page, s), [competitionId, page]);

  if (res.loading && !res.data) return <Skeleton className="h-64 rounded-2xl" />;
  if (res.error) return <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: res.reload }} />;
  if (!res.data?.items.length) return <EmptyState icon={<History size={26} />} title={t('comp.noActivity')} description={t('comp.noActivityBody')} />;

  return (
    <Section title={t('comp.tabActivity')}>
      <ol className="relative space-y-4 border-l border-line pl-5">
        {res.data.items.map((r) => (
          <li key={r.id}>
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand-orange" aria-hidden />
            <p className="text-[14px] text-ink">{activityLabel(r.action, r.metadata, t)}</p>
            <p className="text-[12px] text-ink-soft">
              {formatNpt(r.createdAt)} · {r.actorType === 'SYSTEM' ? t('comp.automatic') : r.actorType === 'ADMIN' ? t('comp.kolabTeam') : t('comp.you')}
              {typeof r.metadata?.reason === 'string' ? ` · ${t('comp.reasonLabel')}: ${r.metadata.reason}` : ''}
            </p>
          </li>
        ))}
      </ol>
      {res.data.pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('comp.prev')}</Button>
          <Button size="sm" variant="secondary" disabled={page >= res.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>{t('comp.next')}</Button>
        </div>
      )}
    </Section>
  );
}
