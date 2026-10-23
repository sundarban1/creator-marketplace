import { useMemo, useState } from 'react';
import { Award, Trophy } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { fetchParticipants, saveAwards, publishResults, type ManagedCompetition } from '../api/competitions';
import { Section, CreatorProfileLink } from './parts';
import { npr } from './format';

/** Final results: assign finalists to prize slots, save as draft, preview, publish. */
export function AwardsPanel({ c, onChanged }: { c: ManagedCompetition; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const finalStage = c.stages[c.stages.length - 1];
  const finalists = useAsync((s) => fetchParticipants(c.id, { stageId: finalStage.id, filter: 'FINALISTS', page: 1, limit: 100 }, s), [c.id, finalStage.id]);
  const editable = !c.suspended && ['ACTIVE', 'AWAITING_RESULTS'].includes(c.status);

  // slot key `${prizeId}:${index}` → participantId
  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    const used: Record<string, number> = {};
    for (const a of c.awards) {
      const i = used[a.prizeId] ?? 0;
      m[`${a.prizeId}:${i}`] = a.participantId;
      used[a.prizeId] = i + 1;
    }
    return m;
  }, [c.awards]);
  // Re-seeded by the parent's `key` whenever saved awards change.
  const [slots, setSlots] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const assignments = Object.entries(slots).filter(([, p]) => p).map(([k, participantId]) => ({ prizeId: k.split(':')[0], participantId }));
  const dirty = JSON.stringify(slots) !== JSON.stringify(initial);
  const nameOf = (pid: string) => {
    const r = finalists.data?.items.find((x) => x.participantId === pid) ?? null;
    return r?.creator.fullName ?? r?.creator.username ?? c.awards.find((a) => a.participantId === pid)?.creator.fullName ?? '—';
  };

  // Client mirror of the server's award rules, for instant feedback.
  const clientErrors = (() => {
    const e: string[] = [];
    const perCreator = new Map<string, string[]>();
    for (const a of assignments) {
      const prize = c.prizes.find((p) => p.id === a.prizeId);
      if (!prize) continue;
      perCreator.set(a.participantId, [...(perCreator.get(a.participantId) ?? []), prize.kind]);
    }
    for (const [pid, kinds] of perCreator) {
      if (kinds.filter((k) => k === 'PLACEMENT').length > 1) e.push(t('comp.awardConflictRank', { name: nameOf(pid) }));
      else if (c.onePrizePerCreator && kinds.length > 1) e.push(t('comp.awardOnePrize', { name: nameOf(pid) }));
    }
    return e;
  })();

  async function save(silent = false) {
    setSaving(true);
    setError('');
    try {
      await saveAwards(c.id, assignments);
      if (!silent) toast.success(t('comp.draftSavedToast'));
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError('');
    try {
      await publishResults(c.id, assignments.length);
      toast.success(t('comp.resultsPublishedToast'));
      setPreview(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setPublishing(false);
    }
  }

  if (c.status === 'DRAFT' || c.status === 'SCHEDULED') {
    return <EmptyState icon={<Trophy size={28} />} title={t('comp.resultsNotYetTitle')} description={t('comp.resultsNotYetDraft')} />;
  }
  if (c.status === 'CANCELLED') return <EmptyState icon={<Trophy size={28} />} title={t('comp.cancelledTitle')} description={t('comp.cancelledResultsBody')} />;
  if (!c.prizes.length && c.status !== 'COMPLETED') {
    return <EmptyState icon={<Award size={28} />} title={t('comp.noPrizesTitle')} description={t('comp.noPrizesBody')} action={{ label: t('comp.edit'), href: `/business/competitions/${c.id}/edit` }} />;
  }

  if (c.status === 'COMPLETED') {
    const published = c.awards.filter((a) => a.isPublished);
    return (
      <Section title={t('comp.publishedResults')}>
        {published.length === 0 ? <p className="text-[13px] text-ink-soft">{t('comp.completedNoAwards')}</p> : (
          <ul className="divide-y divide-line">
            {published.map((a) => (
              <li key={a.prizeId + a.participantId} className="flex items-center gap-3 py-2.5">
                <Award size={16} aria-hidden className={a.prize.kind === 'PLACEMENT' ? 'text-brand-orange' : 'text-violet'} />
                <CreatorProfileLink creatorId={a.creator.id} username={a.creator.username} className="flex-1">
                  <Avatar name={a.creator.fullName ?? a.creator.username ?? ''} src={a.creator.avatarUrl} size="sm" />
                  <span className="truncate text-[14px] font-semibold text-ink group-hover/creator:text-violet-dark group-hover/creator:underline">{a.creator.fullName ?? a.creator.username}</span>
                </CreatorProfileLink>
                <span className="text-[13px] text-ink-soft">{a.prize.title}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-ink-soft">{t('comp.reopenHint')}</p>
      </Section>
    );
  }

  return (
    <div className="space-y-5">
      {c.status === 'ACTIVE' && <Alert tone="info">{t('comp.awardsDraftWhileActive')}</Alert>}
      {finalists.loading ? <Skeleton className="h-64 rounded-2xl" /> : !finalists.data?.items.length ? (
        <EmptyState icon={<Trophy size={28} />} title={t('comp.noFinalistsTitle')} description={t('comp.noFinalistsBody')} />
      ) : (
        <Section title={t('comp.assignPrizes')}>
          <p className="mb-4 text-[13px] text-ink-soft">{t('comp.assignHelp', { n: finalists.data.pagination.total })}</p>
          <div className="space-y-4">
            {c.prizes.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-4">
                <p className="mb-2 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                  <Award size={16} aria-hidden className={p.kind === 'PLACEMENT' ? 'text-brand-orange' : 'text-violet'} />
                  {p.title}
                  {p.amount != null && <span className="font-normal text-ink-soft">· {npr(p.amount)}</span>}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: p.recipientCount }, (_, i) => {
                    const key = `${p.id}:${i}`;
                    return (
                      <Select
                        key={key}
                        aria-label={`${p.title} ${i + 1}`}
                        disabled={!editable}
                        value={slots[key] ?? ''}
                        placeholder={t('comp.unassigned')}
                        onChange={(e) => setSlots((s) => ({ ...s, [key]: e.target.value }))}
                        options={[{ value: '', label: t('comp.unassigned') }, ...finalists.data!.items.map((r) => ({ value: r.participantId, label: `${r.creator.fullName ?? r.creator.username}${r.submission ? '' : ` (${t('comp.noEntryShort')})`}` }))]}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {clientErrors.length > 0 && <Alert tone="warning" className="mt-4"><ul className="list-disc pl-4">{clientErrors.map((e) => <li key={e}>{e}</li>)}</ul></Alert>}
          {error && <Alert tone="error" className="mt-4">{error}</Alert>}
          {editable && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" disabled={!dirty || clientErrors.length > 0} loading={saving} onClick={() => save()}>{t('comp.saveDraft')}</Button>
              <Button
                disabled={c.status !== 'AWAITING_RESULTS' || clientErrors.length > 0 || assignments.length === 0}
                onClick={async () => { if (!dirty || (await save(true))) setPreview(true); }}
              >
                {t('comp.previewPublish')}
              </Button>
            </div>
          )}
        </Section>
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title={t('comp.publishFinalTitle')} footer={<><Button variant="ghost" onClick={() => setPreview(false)} disabled={publishing}>{t('common.cancel')}</Button><Button onClick={publish} loading={publishing}>{t('comp.publishFinal')}</Button></>}>
        <ul className="divide-y divide-line">
          {assignments.map((a) => {
            const prize = c.prizes.find((p) => p.id === a.prizeId);
            return <li key={a.prizeId + a.participantId} className="flex justify-between gap-3 py-2 text-[14px]"><span className="font-semibold text-ink">{nameOf(a.participantId)}</span><span className="text-ink-soft">{prize?.title}</span></li>;
          })}
        </ul>
        <p className="mt-3 text-[12.5px] text-ink-soft">{t('comp.publishFinalBody')}</p>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </Modal>
    </div>
  );
}
