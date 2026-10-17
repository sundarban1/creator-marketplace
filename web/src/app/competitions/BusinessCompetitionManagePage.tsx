import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Inbox, Trophy, CalendarClock, Pencil } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { StatCard } from '../ui/StatCard';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { confirmDialog } from '../ui/confirmDialog';
import {
  fetchManagedCompetition, submitCompetitionForReview, withdrawCompetition, discardPendingChanges, pauseCompetition, resumeCompetition, cancelCompetition,
  closeCompetition, closeRegistration, extendRegistration, deleteCompetitionDraft, openStageNow, closeStageNow, extendStage, reopenStage,
  reopenResults, type ManagedCompetition, type Stage,
} from '../api/competitions';
import { CompetitionStatusBadge, CompetitionTypeBadge, Section, StageTimeline, PrizeList, ReasonDialog, DeadlineDialog, NptDateTimeField, InfoRow } from './parts';
import { formatNpt, stageStatusBadge, activityLabel } from './format';
import { ReviewPanel } from './ReviewPanel';
import { AwardsPanel } from './AwardsPanel';
import { ActivityPanel } from './ActivityPanel';
import { ReviewBanner } from './ReviewBanner';

type Tab = 'overview' | 'review' | 'results' | 'activity';

export function BusinessCompetitionManagePage() {
  const { id = '' } = useParams();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (['overview', 'review', 'results', 'activity'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  const res = useAsync((s) => fetchManagedCompetition(id, s), [id]);

  if (res.loading && !res.data) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>;
  if (res.error || !res.data) return <EmptyState variant="error" title={t('comp.notFoundTitle')} description={t('comp.notFoundBody')} action={{ label: t('comp.backToCompetitions'), href: '/business/competitions' }} />;
  const c = res.data;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/business/competitions" className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> {t('comp.backToCompetitions')}
      </Link>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><CompetitionTypeBadge /><CompetitionStatusBadge status={c.status} /></div>
          <h1 className="mt-1.5 text-[22px] font-semibold text-ink">{c.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.allowedActions.edit && <Link to={`/business/competitions/${c.id}/edit`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-line px-3 text-[13px] font-semibold text-ink hover:bg-surface-dim"><Pencil size={14} aria-hidden />{t('comp.edit')}</Link>}
        </div>
      </div>

      <div className="mb-4"><ReviewBanner c={c} /></div>
      {c.suspended && <Alert tone="error" className="mb-4">{t('comp.suspendedBanner')}{c.suspensionReason ? ` ${c.suspensionReason}` : ''}</Alert>}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(v) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })}
        tabs={[
          { value: 'overview', label: t('comp.tabOverview') },
          { value: 'review', label: t('comp.tabReview'), count: c.stats.awaitingReview || undefined },
          { value: 'results', label: t('comp.tabFinalResults') },
          { value: 'activity', label: t('comp.tabActivity') },
        ]}
      />

      {tab === 'overview' && <Overview c={c} onChanged={res.refresh} />}
      {tab === 'review' && <ReviewPanel c={c} onChanged={res.refresh} />}
      {tab === 'results' && <AwardsPanel key={c.awards.map((x) => `${x.prizeId}:${x.participantId}:${x.isPublished}`).join()} c={c} onChanged={res.refresh} />}
      {tab === 'activity' && <ActivityPanel competitionId={c.id} />}
    </div>
  );
}

// ── Overview: status, controls, stage management ────────────────────────────

type DialogState =
  | { kind: 'cancel' } | { kind: 'pause' } | { kind: 'close' } | { kind: 'reopenResults' } | { kind: 'publish' }
  | { kind: 'extendRegistration' } | { kind: 'extendStage'; stage: Stage } | { kind: 'reopenStage'; stage: Stage }
  | null;

function Overview({ c, onChanged }: { c: ManagedCompetition; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const a = c.allowedActions;

  async function run(key: string, fn: () => Promise<unknown>, done: string, confirm?: { title: string; message: string; tone?: 'danger' | 'warning' | 'default'; label: string }) {
    if (confirm && !(await confirmDialog({ title: confirm.title, message: confirm.message, tone: confirm.tone ?? 'default', confirmLabel: confirm.label }))) return;
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(null);
    }
  }

  const statsByStage = new Map(c.stats.stages.map((s) => [s.stageId, s]));
  const nextStep = nextStepFor(c, t);

  return (
    <div className="space-y-5">
      {nextStep && <Alert tone="info">{nextStep}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('comp.statParticipants')} value={c.stats.participants} icon={Users} />
        <StatCard label={t('comp.statAwaiting')} value={c.stats.awaitingReview} icon={Inbox} tone="amber" />
        <StatCard label={t('comp.statStillIn')} value={c.stats.active} icon={Trophy} tone="emerald" />
      </div>

      <Section title={t('comp.controls')}>
        <div className="flex flex-wrap gap-2">
          {a.submitForReview && <Button onClick={() => setDialog({ kind: 'publish' })}>{c.status === 'DRAFT' ? t('comp.submitForReview') : t('comp.resubmit')}</Button>}
          {a.withdraw && (
            <Button variant="secondary" loading={busy === 'withdraw'} onClick={() => run('withdraw', () => withdrawCompetition(c.id), t('comp.movedToDraft'), { title: t('comp.withdrawQ'), message: c.status === 'SCHEDULED' ? t('comp.withdrawScheduledBody') : t('comp.withdrawBody'), label: t('comp.withdraw'), tone: 'warning' })}>
              {t('comp.withdraw')}
            </Button>
          )}
          {a.discardPendingChanges && (
            <Button variant="secondary" loading={busy === 'discard'} onClick={() => run('discard', () => discardPendingChanges(c.id), t('comp.changesDiscarded'), { title: t('comp.discardChangesQ'), message: t('comp.discardChangesBody'), label: t('comp.discardChanges'), tone: 'warning' })}>
              {t('comp.discardChanges')}
            </Button>
          )}
          {a.resume && <Button loading={busy === 'resume'} onClick={() => run('resume', () => resumeCompetition(c.id), t('comp.resumedToast'))}>{t('comp.resume')}</Button>}
          {a.pause && <Button variant="secondary" onClick={() => setDialog({ kind: 'pause' })}>{t('comp.pause')}</Button>}
          {a.extendRegistration && <Button variant="secondary" onClick={() => setDialog({ kind: 'extendRegistration' })}>{t('comp.extendRegistration')}</Button>}
          {a.closeRegistration && (
            <Button variant="secondary" loading={busy === 'closeReg'} onClick={() => run('closeReg', () => closeRegistration(c.id), t('comp.registrationClosedToast'), { title: t('comp.closeRegistrationQ'), message: t('comp.closeRegistrationBody'), label: t('comp.closeRegistration'), tone: 'warning' })}>
              {t('comp.closeRegistration')}
            </Button>
          )}
          {a.closeCompetition && <Button variant="secondary" onClick={() => setDialog({ kind: 'close' })}>{t('comp.closeCompetition')}</Button>}
          {a.reopenResults && <Button variant="secondary" onClick={() => setDialog({ kind: 'reopenResults' })}>{t('comp.reopenResults')}</Button>}
          {a.deleteDraft && (
            <Button variant="danger" loading={busy === 'delete'} onClick={() => run('delete', async () => { await deleteCompetitionDraft(c.id); navigate('/business/competitions'); }, t('comp.draftDeleted'), { title: t('comp.deleteDraftQ'), message: t('comp.deleteDraftBody'), label: t('comp.deleteDraft'), tone: 'danger' })}>
              {t('comp.deleteDraft')}
            </Button>
          )}
          {a.cancel && !a.deleteDraft && <Button variant="danger" onClick={() => setDialog({ kind: 'cancel' })}>{t('comp.cancelCompetition')}</Button>}
        </div>
        {c.status === 'PAUSED' && <p className="mt-3 text-[12.5px] text-ink-soft">{t('comp.pausedOrganizerNote')}</p>}
      </Section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Section title={t('comp.stages')}>
          <ol className="space-y-3">
            {c.stages.map((s) => {
              const st = statsByStage.get(s.id);
              const badge = stageStatusBadge(s.status, t);
              const isFinal = s.order === c.stages.length;
              const prev = c.stages.find((x) => x.order === s.order - 1);
              const canOpen = c.status === 'ACTIVE' && s.status === 'UPCOMING' && (!prev || prev.status === 'RESULTS_PUBLISHED');
              return (
                <li key={s.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-ink">{s.order}. {s.name}{s.advanceLimit ? <span className="font-normal text-ink-soft"> · {t('comp.topN', { n: s.advanceLimit })}</span> : null}</p>
                    <span className="text-[12px] font-semibold text-ink-soft">{badge.label}</span>
                  </div>
                  <dl className="mt-2 grid gap-1 text-[12.5px] sm:grid-cols-2">
                    <InfoRow label={t('comp.opens')} value={formatNpt(s.opensAt)} />
                    <InfoRow label={t('comp.deadline')} value={formatNpt(s.deadline)} />
                    {st && <InfoRow label={t('comp.entries')} value={`${st.submissions} / ${st.eligible}`} />}
                    {st && (st.advanced > 0 || st.notSelected > 0) && <InfoRow label={t('comp.published')} value={t('comp.advancedVsNot', { a: st.advanced, n: st.notSelected })} />}
                    {st && s.status === 'SELECTION_PENDING' && <InfoRow label={t('comp.draft')} value={t('comp.draftSelected', { n: st.draftAdvance })} />}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canOpen && <Button size="sm" loading={busy === `open-${s.id}`} onClick={() => run(`open-${s.id}`, () => openStageNow(c.id, s.id), t('comp.stageOpenedToast'), { title: t('comp.openStageQ', { name: s.name }), message: t('comp.openStageBody'), label: t('comp.openNow') })}>{t('comp.openNow')}</Button>}
                    {s.status === 'OPEN' && <Button size="sm" variant="secondary" loading={busy === `close-${s.id}`} onClick={() => run(`close-${s.id}`, () => closeStageNow(c.id, s.id), t('comp.stageClosedToast'), { title: t('comp.closeStageQ', { name: s.name }), message: t('comp.closeStageBody'), label: t('comp.closeSubmissions'), tone: 'warning' })}>{t('comp.closeSubmissions')}</Button>}
                    {['UPCOMING', 'OPEN'].includes(s.status) && a.edit && <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'extendStage', stage: s })}><CalendarClock size={14} />{t('comp.extendDeadline')}</Button>}
                    {['UNDER_REVIEW', 'SELECTION_PENDING'].includes(s.status) && ['ACTIVE', 'AWAITING_RESULTS'].includes(c.status) && <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'reopenStage', stage: s })}>{t('comp.reopenSubmissions')}</Button>}
                    {['OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING'].includes(s.status) && (
                      <Link to={`?tab=${isFinal ? 'results' : 'review'}&stage=${s.id}`} className="inline-flex min-h-[36px] items-center rounded-xl px-3 text-[13px] font-semibold text-brand hover:bg-brand/5">
                        {isFinal && s.status !== 'OPEN' ? t('comp.goFinalResults') : t('comp.reviewEntries')}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        <div className="space-y-5">
          <Section title={t('comp.keyDates')}>
            <dl className="space-y-1.5 text-[13px]">
              <InfoRow label={t('comp.registrationOpens')} value={formatNpt(c.registrationOpensAt)} />
              <InfoRow label={t('comp.registrationCloses2')} value={formatNpt(c.registrationDeadline)} />
              <InfoRow label={t('comp.runs')} value={`${formatNpt(c.startsAt, { time: false })} – ${formatNpt(c.endsAt, { time: false })}`} />
              {c.publishAt && c.status === 'SCHEDULED' && <InfoRow label={t('comp.goesLiveLabel')} value={formatNpt(c.publishAt)} />}
            </dl>
            {c.stats.upcomingDeadlines.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('comp.upcomingDeadlines')}</h3>
                <ul className="space-y-1 text-[13px]">{c.stats.upcomingDeadlines.map((d) => <li key={d.label + d.at}><span className="text-ink">{d.label}</span> <span className="text-ink-soft">· {formatNpt(d.at)}</span></li>)}</ul>
              </>
            )}
          </Section>
          <Section title={t('comp.prizes')}><PrizeList prizes={c.prizes} pool={c.prizePool} compact /></Section>
          {c.reviewHistory.length > 0 && (
            <Section title={t('comp.reviewHistory')}>
              <ul className="space-y-2 text-[13px]">
                {c.reviewHistory.slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <span className="text-ink">{t(`comp.rev_${h.action}`)}</span>
                    <span className="text-[12px] text-ink-soft"> · {formatNpt(h.createdAt)}</span>
                    {h.feedback && <p className="mt-0.5 whitespace-pre-line text-[12.5px] text-ink-soft">“{h.feedback}”</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title={t('comp.latestActions')} action={<Link to="?tab=activity" className="text-[12px] font-semibold text-brand">{t('comp.viewAll')}</Link>}>
            {c.recentActivity.length === 0 ? <p className="text-[13px] text-ink-soft">{t('comp.noActivity')}</p> : (
              <ul className="space-y-2 text-[13px]">
                {c.recentActivity.map((r, i) => <li key={i}><span className="text-ink">{activityLabel(r.action, r.metadata, t)}</span><br /><span className="text-[12px] text-ink-soft">{formatNpt(r.createdAt)}{r.actorType === 'SYSTEM' ? ` · ${t('comp.automatic')}` : ''}</span></li>)}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Dialogs */}
      <PublishDialog open={dialog?.kind === 'publish'} c={c} onClose={() => setDialog(null)} onDone={onChanged} />
      <ReasonDialog open={dialog?.kind === 'cancel'} title={t('comp.cancelQ')} message={t('comp.cancelBody')} label={t('comp.reasonForParticipants')} confirmLabel={t('comp.cancelCompetition')} onClose={() => setDialog(null)} onConfirm={async (r) => { await cancelCompetition(c.id, r); toast.success(t('comp.cancelledToast')); onChanged(); }} />
      <ReasonDialog open={dialog?.kind === 'pause'} optional tone="primary" title={t('comp.pauseQ')} message={t('comp.pauseBody')} label={t('comp.reasonOptional')} confirmLabel={t('comp.pause')} onClose={() => setDialog(null)} onConfirm={async (r) => { await pauseCompetition(c.id, r); toast.success(t('comp.pausedToast')); onChanged(); }} />
      <ReasonDialog open={dialog?.kind === 'close'} optional tone="primary" title={t('comp.closeQ')} message={t('comp.closeBody')} label={t('comp.reasonOptional')} confirmLabel={t('comp.closeCompetition')} onClose={() => setDialog(null)} onConfirm={async (r) => { await closeCompetition(c.id, r); toast.success(t('comp.closedToast')); onChanged(); }} />
      <ReasonDialog open={dialog?.kind === 'reopenResults'} title={t('comp.reopenResultsQ')} message={t('comp.reopenResultsBody')} label={t('comp.reasonLabel')} confirmLabel={t('comp.reopenResults')} onClose={() => setDialog(null)} onConfirm={async (r) => { await reopenResults(c.id, r); toast.success(t('comp.resultsReopenedToast')); onChanged(); }} />
      {dialog?.kind === 'extendRegistration' && <DeadlineDialog open title={t('comp.extendRegistration')} current={c.registrationDeadline} confirmLabel={t('comp.saveDeadline')} onClose={() => setDialog(null)} onConfirm={async (d) => { await extendRegistration(c.id, d); toast.success(t('comp.deadlineSavedToast')); onChanged(); }} />}
      {dialog?.kind === 'extendStage' && <DeadlineDialog open title={t('comp.extendStageTitle', { name: dialog.stage.name })} message={t('comp.extendStageBody')} current={dialog.stage.deadline} confirmLabel={t('comp.saveDeadline')} onClose={() => setDialog(null)} onConfirm={async (d) => { await extendStage(c.id, dialog.stage.id, d); toast.success(t('comp.deadlineSavedToast')); onChanged(); }} />}
      {dialog?.kind === 'reopenStage' && <DeadlineDialog open title={t('comp.reopenStageTitle', { name: dialog.stage.name })} message={t('comp.reopenStageBody')} confirmLabel={t('comp.reopenSubmissions')} onClose={() => setDialog(null)} onConfirm={async (d) => { await reopenStage(c.id, dialog.stage.id, d); toast.success(t('comp.stageReopenedToast')); onChanged(); }} />}
    </div>
  );
}

function nextStepFor(c: ManagedCompetition, t: ReturnType<typeof useT>): string | null {
  if (c.suspended) return null;
  if (c.status === 'DRAFT') return t('comp.nextDraft');
  if (['PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(c.status)) return null; // ReviewBanner explains
  if (c.status === 'SCHEDULED') return t('comp.nextScheduled', { when: formatNpt(c.publishAt) });
  if (c.status === 'AWAITING_RESULTS') return t('comp.nextAwaiting');
  const reviewing = c.stages.find((s) => s.status === 'UNDER_REVIEW' || s.status === 'SELECTION_PENDING');
  if (reviewing && reviewing.order < c.stages.length) return t('comp.nextReview', { name: reviewing.name });
  const open = c.stages.find((s) => s.status === 'OPEN');
  if (open) return t('comp.nextOpen', { name: open.name, when: formatNpt(open.deadline) });
  return null;
}

function PublishDialog({ open, c, onClose, onDone }: { open: boolean; c: ManagedCompetition; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [mode, setMode] = useState<'now' | 'schedule'>(c.publishAt && new Date(c.publishAt) > new Date() ? 'schedule' : 'now');
  const [at, setAt] = useState(c.publishAt ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (mode === 'schedule' && (!at || new Date(at) <= new Date())) { setError(t('comp.scheduleFuture')); return; }
    setBusy(true);
    setError('');
    try {
      await submitCompetitionForReview(c.id, mode === 'schedule' ? at : null);
      toast.success(t('comp.submittedToast'));
      onClose();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={t('comp.submitTitle')} footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={busy}>{t('comp.submitForReview')}</Button></>}>
      <p className="mb-3 text-[14px] text-ink-soft">{t('comp.submitBody')}</p>
      <StageTimeline stages={c.stages} />
      <fieldset className="mt-4 space-y-2">
        <legend className="mb-1 text-[13px] font-semibold text-ink">{t('comp.whenLive')}</legend>
        <label className="flex items-center gap-2 text-[14px] text-ink"><input type="radio" name="pub" checked={mode === 'now'} onChange={() => setMode('now')} />{t('comp.liveOnApproval')}</label>
        <label className="flex items-center gap-2 text-[14px] text-ink"><input type="radio" name="pub" checked={mode === 'schedule'} onChange={() => setMode('schedule')} />{t('comp.scheduleFor')}</label>
        {mode === 'schedule' && <NptDateTimeField label={t('comp.publishAt')} value={at} onChange={setAt} />}
      </fieldset>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}
    </Modal>
  );
}
