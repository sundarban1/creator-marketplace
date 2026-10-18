import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, Eye, ExternalLink, Inbox } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { cn } from '../ui/cn';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';
import { StatusBadge } from '../ui/StatusBadge';
import { Textarea } from '../ui/Textarea';
import { TextField } from '../ui/TextField';
import { VerifiedTick } from '../ui/VerifiedTick';
import { useToast } from '../ui/Toast';
import {
  fetchParticipants, fetchSubmissionDetail, fetchDecisionSummary, saveDecisions, publishDecisions,
  type ManagedCompetition, type ParticipantFilter, type ParticipantRow,
} from '../api/competitions';
import { StageTimeline, SubmissionPreview, Section, CreatorProfileLink } from './parts';
import { formatNpt } from './format';

type Decision = 'ADVANCE' | 'NOT_SELECTED' | null;
// `before` = the saved decision when the toggle started, so unsaved toggles on
// other pages still adjust the live selection count correctly.
interface Pending { decision?: Decision; before?: Decision; notes?: string | null; scores?: Record<string, number> | null }

const PAGE = 25;

export function ReviewPanel({ c, onChanged }: { c: ManagedCompetition; onChanged: () => void }) {
  const [params, setParams] = useSearchParams();
  const defaultStage = c.stages.find((s) => ['UNDER_REVIEW', 'SELECTION_PENDING', 'OPEN'].includes(s.status)) ?? c.stages[0];
  const stageId = params.get('stage') && c.stages.some((s) => s.id === params.get('stage')) ? params.get('stage')! : defaultStage.id;
  // Keyed by stage: switching stages starts with a clean filter/page/draft state.
  return <StageReview key={stageId} c={c} stageId={stageId} onSelectStage={(id) => setParams({ tab: 'review', stage: id }, { replace: true })} onChanged={onChanged} />;
}

function StageReview({ c, stageId, onSelectStage, onChanged }: { c: ManagedCompetition; stageId: string; onSelectStage: (id: string) => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const stage = c.stages.find((s) => s.id === stageId)!;
  const isFinal = stage.order === c.stages.length;
  const editable = !c.suspended && !['COMPLETED', 'CANCELLED'].includes(c.status) && ['OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING'].includes(stage.status);

  const [filter, setFilter] = useState<ParticipantFilter>('ALL');
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [viewing, setViewing] = useState<ParticipantRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [nonce, setNonce] = useState(0);

  const rows = useAsync((s) => fetchParticipants(c.id, { stageId, filter, q: query || undefined, page, limit: PAGE }, s), [c.id, stageId, filter, query, page, nonce]);
  const summary = useAsync((s) => fetchDecisionSummary(c.id, stageId, s), [c.id, stageId, nonce]);
  const dirty = Object.keys(pending).length > 0;

  const effective = (r: ParticipantRow): Decision => (pending[r.participantId]?.decision !== undefined ? pending[r.participantId].decision! : r.decision?.decision ?? null);

  // Live count = saved draft count adjusted by every unsaved toggle.
  const liveAdvance = (summary.data?.advance ?? 0) + Object.values(pending).reduce(
    (n, p) => (p.decision === undefined ? n : n + Number(p.decision === 'ADVANCE') - Number(p.before === 'ADVANCE')), 0,
  );
  const limit = stage.advanceLimit;
  const overLimit = limit != null && liveAdvance > limit;

  function toggle(r: ParticipantRow, d: Decision) {
    const cur = effective(r);
    setPending((p) => ({ ...p, [r.participantId]: { ...p[r.participantId], before: r.decision?.decision ?? null, decision: cur === d ? null : d } }));
  }

  async function saveDraft(silent = false) {
    if (!dirty) return true;
    setSaving(true);
    try {
      await saveDecisions(c.id, stageId, Object.entries(pending).map(([participantId, { before: _before, ...v }]) => { void _before; return { participantId, ...v }; }));
      setPending({});
      setNonce((n) => n + 1);
      if (!silent) toast.success(t('comp.draftSavedToast'));
      onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.somethingWrong'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startPublish() {
    if (!(await saveDraft(true))) return;
    setConfirm(true);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Section title={t('comp.stages')}>
          <StageTimeline stages={c.stages} selectedId={stageId} onSelect={onSelectStage} />
        </Section>
      </aside>

      <div className="min-w-0 space-y-4">
        {!editable && stage.status === 'UPCOMING' && <Alert tone="info">{t('comp.reviewNotOpenYet', { when: formatNpt(stage.opensAt) })}</Alert>}
        {stage.status === 'RESULTS_PUBLISHED' && <Alert tone="success">{t('comp.reviewPublished')}</Alert>}
        {isFinal && editable && <Alert tone="info">{t('comp.finalStageReviewNote')}</Alert>}
        {stage.status === 'OPEN' && <Alert tone="info">{t('comp.reviewWhileOpen', { when: formatNpt(stage.deadline) })}</Alert>}

        {/* Selection bar */}
        {!isFinal && editable && (
          <div className={cn('sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-3 shadow-sm', overLimit ? 'border-danger/40' : 'border-line')}>
            <div>
              <p className="text-[14px] font-semibold text-ink">
                {limit != null ? t('comp.selectedOfLimit', { n: liveAdvance, limit }) : t('comp.selectedCount', { n: liveAdvance })}
              </p>
              <p className={cn('text-[12px]', overLimit ? 'text-danger' : 'text-ink-soft')}>
                {overLimit ? t('comp.overLimit', { n: liveAdvance - limit! }) : dirty ? t('comp.unsavedChanges') : t('comp.draftPrivate')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!dirty} loading={saving} onClick={() => saveDraft()}>{t('comp.saveDraft')}</Button>
              <Button size="sm" disabled={overLimit || liveAdvance < 1 || stage.status === 'OPEN'} onClick={startPublish}>{t('comp.publishResults')}</Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={filter}
            onChange={(v) => { setFilter(v as ParticipantFilter); setPage(1); }}
            tabs={[
              { value: 'ALL', label: t('comp.fAll') },
              { value: 'SUBMITTED', label: t('comp.fSubmitted') },
              { value: 'NOT_SUBMITTED', label: t('comp.fNotSubmitted') },
              { value: 'UNDER_REVIEW', label: t('comp.fUnderReview') },
              { value: 'ADVANCED', label: t('comp.fAdvanced') },
              { value: 'NOT_SELECTED', label: t('comp.fNotSelected') },
              { value: 'FINALISTS', label: t('comp.fFinalists') },
            ]}
          />
          <SearchInput className="sm:max-w-[240px]" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t('comp.searchCreators')} />
        </div>

        {rows.loading && !rows.data ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : rows.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: rows.reload }} />
        ) : !rows.data?.items.length ? (
          <EmptyState icon={<Inbox size={26} />} title={t(`comp.emptyFilter_${filter}`)} description={query ? t('comp.emptySearchBody') : t(`comp.emptyFilterBody_${filter}`)} />
        ) : (
          <>
            <ul className="space-y-2">
              {rows.data.items.map((r) => {
                const d = effective(r);
                const published = r.decision?.isPublished;
                return (
                  <li key={r.participantId} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
                    <CreatorProfileLink creatorId={r.creator.id} className="flex-1">
                      <Avatar name={r.creator.fullName ?? ''} src={r.creator.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-[14px] font-semibold text-ink group-hover/creator:text-violet-dark group-hover/creator:underline">{r.creator.fullName ?? r.creator.username}<VerifiedTick entity={r.creator} /></p>
                        <p className="truncate text-[12px] text-ink-soft">
                          {r.submission ? t('comp.submittedAt', { when: formatNpt(r.submission.submittedAt) }) : t('comp.noEntryYet')}
                          {r.submission && r.submission.version > 1 ? ` · v${r.submission.version}` : ''}
                          {r.decision?.totalScore != null ? ` · ${t('comp.scoreN', { n: r.decision.totalScore })}` : ''}
                        </p>
                      </div>
                    </CreatorProfileLink>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.status === 'NOT_SELECTED' && r.eliminatedAtOrder === stage.order && <StatusBadge label={t('comp.outcomeNotSelected')} tone="neutral" />}
                      {r.currentStageOrder > stage.order && <StatusBadge label={t('comp.outcomeAdvanced')} tone="success" />}
                      {r.submission && <Button size="sm" variant="ghost" onClick={() => setViewing(r)}><Eye size={14} />{t('comp.viewEntry')}</Button>}
                      {!isFinal && editable && !published && r.status === 'ACTIVE' && r.currentStageOrder === stage.order && (
                        <>
                          <Button size="sm" variant={d === 'ADVANCE' ? 'primary' : 'secondary'} aria-pressed={d === 'ADVANCE'} onClick={() => toggle(r, 'ADVANCE')}><Check size={14} />{t('comp.advance')}</Button>
                          <Button size="sm" variant={d === 'NOT_SELECTED' ? 'danger' : 'ghost'} aria-pressed={d === 'NOT_SELECTED'} onClick={() => toggle(r, 'NOT_SELECTED')}><X size={14} />{t('comp.notSelectedShort')}</Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {rows.data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-[13px] text-ink-soft">
                <span>{t('comp.pageOf', { page, total: rows.data.pagination.totalPages, count: rows.data.pagination.total })}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('comp.prev')}</Button>
                  <Button size="sm" variant="secondary" disabled={page >= rows.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>{t('comp.next')}</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {viewing && (
        <EntryModal
          c={c}
          stageId={stageId}
          row={viewing}
          editable={editable}
          canDecide={!isFinal && editable && !viewing.decision?.isPublished && viewing.status === 'ACTIVE' && viewing.currentStageOrder === stage.order}
          pending={pending[viewing.participantId]}
          onClose={() => setViewing(null)}
          onApply={(p) => { setPending((cur) => ({ ...cur, [viewing.participantId]: { ...cur[viewing.participantId], ...(p.decision !== undefined ? { before: viewing.decision?.decision ?? null } : {}), ...p } })); setViewing(null); }}
        />
      )}

      {confirm && (
        <PublishConfirm
          c={c}
          stageId={stageId}
          onClose={() => setConfirm(false)}
          onPublished={() => { setConfirm(false); setNonce((n) => n + 1); onChanged(); }}
        />
      )}
    </div>
  );
}

function EntryModal({ c, stageId, row, editable, canDecide, pending, onClose, onApply }: {
  c: ManagedCompetition; stageId: string; row: ParticipantRow; editable: boolean; canDecide: boolean;
  pending?: Pending; onClose: () => void; onApply: (p: Pending) => void;
}) {
  const t = useT();
  const detail = useAsync((s) => fetchSubmissionDetail(c.id, stageId, row.participantId, s), [c.id, stageId, row.participantId]);
  const [notes, setNotes] = useState<string>(pending?.notes ?? row.decision?.notes ?? '');
  const [scores, setScores] = useState<Record<string, number>>((pending?.scores ?? row.decision?.scores ?? {}) as Record<string, number>);
  const [decision, setDecision] = useState<Decision>(pending?.decision !== undefined ? pending.decision! : row.decision?.decision ?? null);

  function apply() {
    const p: Pending = { notes: notes.trim() || null };
    if (c.scoringEnabled && Object.keys(scores).length) p.scores = scores;
    if (canDecide) p.decision = decision;
    onApply(p);
  }

  const d = detail.data;
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={row.creator.fullName ?? row.creator.username ?? t('comp.entry')}
      footer={editable ? <><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={apply}>{t('comp.applyToDraft')}</Button></> : <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>}
    >
      {/* New tab: scores/decision typed here aren't applied until "Apply", so don't navigate away. */}
      <Link
        to={`/business/creators/${row.creator.id}`}
        target="_blank"
        rel="noopener"
        className="group mb-4 flex items-center gap-3 rounded-xl border border-line p-2.5 transition-colors hover:border-violet/40 hover:bg-violet/[0.04]"
      >
        <Avatar name={row.creator.fullName ?? ''} src={row.creator.avatarUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-[14px] font-semibold text-ink">{row.creator.fullName ?? row.creator.username}<VerifiedTick entity={row.creator} /></span>
          {row.creator.username && <span className="block truncate text-[12px] text-ink-soft">@{row.creator.username}</span>}
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark group-hover:underline">{t('comp.viewCreatorProfile')}<ExternalLink size={13} aria-hidden /></span>
      </Link>
      {detail.loading ? <Skeleton className="h-64 rounded-xl" /> : !d?.submission ? <p className="text-[14px] text-ink-soft">{t('comp.noEntryYet')}</p> : (
        <div className="space-y-4">
          <SubmissionPreview s={d.submission} />
          <p className="text-[12.5px] text-ink-soft">{t('comp.submittedAt', { when: formatNpt(d.submission.submittedAt) })}{d.creator.location ? ` · ${d.creator.location}` : ''}</p>
          {d.submission.history.length > 0 && (
            <details className="rounded-xl border border-line px-3 py-2">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink">{t('comp.history', { n: d.submission.history.length })}</summary>
              <ul className="mt-2 space-y-1 text-[12.5px] text-ink-soft">
                {d.submission.history.map((h) => (
                  <li key={h.version}>v{h.version} · {formatNpt(h.submittedAt)} · <a className="text-brand hover:underline" href={h.videoUrl ?? h.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer">{t('comp.open')}</a></li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {editable && (
        <div className="mt-5 space-y-4 border-t border-line pt-4">
          {c.scoringEnabled && c.judgingCriteria.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">{t('comp.scoresTitle')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {c.judgingCriteria.map((cr) => (
                  <TextField
                    key={cr.key}
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    label={`${cr.label} (${cr.weight}%)`}
                    value={scores[cr.key] ?? ''}
                    onChange={(e) => setScores((s) => { const n = { ...s }; if (e.target.value === '') delete n[cr.key]; else n[cr.key] = Math.min(10, Math.max(0, Number(e.target.value))); return n; })}
                  />
                ))}
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">{t('comp.scoresHint')}</p>
            </div>
          )}
          <Textarea label={t('comp.privateNotes')} hint={t('comp.privateNotesHint')} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          {canDecide && (
            <div className="flex flex-wrap gap-2">
              <Button variant={decision === 'ADVANCE' ? 'primary' : 'secondary'} aria-pressed={decision === 'ADVANCE'} onClick={() => setDecision(decision === 'ADVANCE' ? null : 'ADVANCE')}><Check size={14} />{t('comp.advance')}</Button>
              <Button variant={decision === 'NOT_SELECTED' ? 'danger' : 'ghost'} aria-pressed={decision === 'NOT_SELECTED'} onClick={() => setDecision(decision === 'NOT_SELECTED' ? null : 'NOT_SELECTED')}><X size={14} />{t('comp.notSelectedShort')}</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PublishConfirm({ c, stageId, onClose, onPublished }: { c: ManagedCompetition; stageId: string; onClose: () => void; onPublished: () => void }) {
  const t = useT();
  const toast = useToast();
  const stage = c.stages.find((s) => s.id === stageId)!;
  const summary = useAsync((s) => fetchDecisionSummary(c.id, stageId, s), [c.id, stageId]);
  const selected = useAsync((s) => fetchParticipants(c.id, { stageId, filter: 'UNDER_REVIEW', page: 1, limit: 100 }, s), [c.id, stageId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const advancing = (selected.data?.items ?? []).filter((r) => r.decision?.decision === 'ADVANCE');

  async function publish() {
    if (!summary.data) return;
    setBusy(true);
    setError('');
    try {
      await publishDecisions(c.id, stageId, summary.data.advance);
      toast.success(t('comp.stageResultsPublishedToast'));
      onPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const s = summary.data;
  return (
    <Modal open onClose={onClose} title={t('comp.publishStageTitle', { name: stage.name })} footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button onClick={publish} loading={busy} disabled={!s}>{t('comp.publishResults')}</Button></>}>
      {!s ? <Skeleton className="h-32 rounded-xl" /> : (
        <div className="space-y-3 text-[14px]">
          <p className="text-ink">{t('comp.publishSummary', { a: s.advance, n: s.inStage - s.advance })}</p>
          {s.advanceLimit != null && s.advance < s.advanceLimit && <Alert tone="warning">{t('comp.underLimitWarning', { n: s.advance, limit: s.advanceLimit })}</Alert>}
          {s.undecided > 0 && <Alert tone="info">{t('comp.undecidedWarning', { n: s.undecided })}</Alert>}
          {advancing.length > 0 && (
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('comp.advancingList')}</p>
              <ul className="max-h-48 space-y-1 overflow-auto text-[13px] text-ink-soft">{advancing.map((r) => <li key={r.participantId}>• {r.creator.fullName ?? r.creator.username}</li>)}</ul>
              {s.advance > advancing.length && <p className="mt-1 text-[12px] text-ink-soft">{t('comp.andMore', { n: s.advance - advancing.length })}</p>}
            </div>
          )}
          <p className="text-[12.5px] text-ink-soft">{t('comp.publishIrreversible')}</p>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      )}
    </Modal>
  );
}
