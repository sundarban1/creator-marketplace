import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { StatusBadge } from '../ui/StatusBadge';
import { ReportButton } from '../ui/ReportButton';
import { useToast } from '../ui/Toast';
import { confirmDialog } from '../ui/confirmDialog';
import { fetchCompetition, fetchMyProgress, joinCompetition, type CompetitionDetail, type MyProgress } from '../api/competitions';
import { CompetitionOverview } from './CompetitionOverview';
import { SubmissionPanel } from './SubmissionPanel';
import { Section, type TimelineStage } from './parts';
import { creatorStatusBadge, formatNpt } from './format';

export function CreatorCompetitionDetailPage() {
  const { id = '' } = useParams();
  const t = useT();
  const toast = useToast();
  const detail = useAsync((s) => fetchCompetition(id, s), [id]);
  const joined = !!detail.data?.viewer.joined;
  const progress = useAsync((s) => (joined ? fetchMyProgress(id, s) : Promise.resolve(null)), [id, joined]);
  const [joining, setJoining] = useState(false);

  async function join(c: CompetitionDetail) {
    const ok = await confirmDialog({ title: t('comp.joinConfirmTitle'), message: t('comp.joinConfirmBody', { title: c.title }), confirmLabel: t('comp.ctaJoin'), tone: 'default' });
    if (!ok) return;
    setJoining(true);
    try {
      await joinCompetition(c.id);
      toast.success(t('comp.joinedToast'));
      detail.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setJoining(false);
    }
  }

  if (detail.loading) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>;
  if (detail.error || !detail.data) {
    return <EmptyState variant="error" title={t('comp.notFoundTitle')} description={t('comp.notFoundBody')} action={{ label: t('comp.backToCompetitions'), href: '/creator/competitions' }} />;
  }
  const c = detail.data;
  const p = progress.data;

  const headerAction = c.viewer.joined ? (
    p ? <MyStatus p={p} /> : null
  ) : c.viewer.canJoin ? (
    <Button size="lg" onClick={() => join(c)} loading={joining}>{t('comp.ctaJoin')}</Button>
  ) : (
    <p className="max-w-xs text-[13px] text-ink-soft">{c.registrationClosedReason}</p>
  );

  const timeline: TimelineStage[] | undefined = p
    ? c.stages.map((s) => {
      const mine = p.stages.find((x) => x.stageId === s.id);
      return { ...s, outcome: mine?.outcome ?? null, submitted: !!mine?.submission, locked: s.order > p.currentStageOrder };
    })
    : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/creator/competitions" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-soft hover:text-ink">
          <ArrowLeft size={14} aria-hidden /> {t('comp.backToCompetitions')}
        </Link>
        <ReportButton targetType="COMPETITION" targetId={c.id} />
      </div>
      <CompetitionOverview
        c={c}
        headerAction={headerAction}
        timelineStages={timeline}
        currentStageId={p ? p.stages.find((s) => s.order === p.currentStageOrder)?.stageId : c.currentStageId}
        progress={p ? <ProgressBlock c={c} p={p} onChanged={() => { progress.refresh(); }} /> : null}
      />
    </div>
  );
}

function MyStatus({ p }: { p: MyProgress }) {
  const t = useT();
  const b = creatorStatusBadge(p.status, t);
  return (
    <div className="flex max-w-xs flex-col items-start gap-1 sm:items-end sm:text-right">
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success"><CheckCircle2 size={13} aria-hidden />{t('comp.youAreIn')}</span>
      <StatusBadge label={b.label} tone={b.tone} dot />
    </div>
  );
}

/** "Your progress" — what to do next and the entry form for the current stage. */
function ProgressBlock({ c, p, onChanged }: { c: CompetitionDetail; p: MyProgress; onChanged: () => void }) {
  const t = useT();
  const b = creatorStatusBadge(p.status, t);
  const current = p.stages.find((s) => s.order === p.currentStageOrder);
  const pastWithEntries = p.stages.filter((s) => s.order < p.currentStageOrder && s.submission);

  return (
    <Section title={t('comp.yourProgress')}>
      <div className="mb-4 rounded-xl bg-surface-dim px-4 py-3">
        <StatusBadge label={b.label} tone={b.tone} dot />
        <p className="mt-1.5 text-[14px] text-ink">{b.hint}</p>
        {p.awards.length > 0 && (
          <p className="mt-2 text-[14px] font-semibold text-brand-orange">🏆 {t('comp.youWon', { prizes: p.awards.map((a) => a.title).join(', ') })}</p>
        )}
      </div>

      {current && p.participantStatus === 'ACTIVE' && !['COMPLETED', 'CANCELLED'].includes(c.status) && (
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-ink">{current.name}</h3>
          {current.status === 'UPCOMING' ? (
            <p className="text-[13.5px] text-ink-soft">{t('comp.stageOpensAt', { when: formatNpt(current.opensAt) })}</p>
          ) : (
            <>
              {c.stages.find((s) => s.id === current.stageId)?.brief && (
                <p className="mb-3 whitespace-pre-line text-[14px] text-ink-soft">{c.stages.find((s) => s.id === current.stageId)!.brief}</p>
              )}
              <SubmissionPanel key={current.stageId} competitionId={c.id} stage={current} allowEdits={c.allowSubmissionEdits} onSaved={onChanged} />
            </>
          )}
        </div>
      )}

      {pastWithEntries.length > 0 && (
        <details className="mt-4 rounded-xl border border-line px-3 py-2">
          <summary className="cursor-pointer text-[13px] font-semibold text-ink">{t('comp.previousEntries')}</summary>
          <ul className="mt-2 space-y-1 text-[13px] text-ink-soft">
            {pastWithEntries.map((s) => (
              <li key={s.stageId}>
                {s.name} — {formatNpt(s.submission!.submittedAt)}
                {s.outcome && ` · ${s.outcome === 'ADVANCE' ? t('comp.outcomeAdvanced') : t('comp.outcomeNotSelected')}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Section>
  );
}
