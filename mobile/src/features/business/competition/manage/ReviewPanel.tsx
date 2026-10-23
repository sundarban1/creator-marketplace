// Participants & review tab — mobile port of web/src/app/competitions/ReviewPanel.tsx.
// Pick a stage, filter/search entrants, mark Advance / Not selected (kept as a
// private draft until saved), open an entry to add notes/scores, then publish.
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { SearchInput } from '@/components/SearchInput';
import { TabSlider } from '@/components/TabSlider';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { FormErrorBanner } from '@/components/FieldError';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { withAlpha } from '@/utilities/color';
import { TabColors } from '@/utilities/tabColors';
import { F, RADIUS, SPACING } from '@/utilities/constants';
import {
  competitionManageService as api, type Decision, type ManageDetail, type ParticipantFilter, type ParticipantRow,
} from '@/services/competition';
import { Badge, SubmissionPreview } from '@/features/creator/competition/parts';
import { formatNpt, stageStatusBadge } from '@/features/creator/competition/format';
import { Notice, shared } from './shared';
import { PersonAvatar, ProfileRow } from '@/features/creator/competition/ProfileAvatar';

interface Pending { decision?: Decision; before?: Decision; notes?: string | null; scores?: Record<string, number> | null }
const PAGE = 25;
const FILTERS: ParticipantFilter[] = ['ALL', 'SUBMITTED', 'NOT_SUBMITTED', 'UNDER_REVIEW', 'ADVANCED', 'NOT_SELECTED', 'FINALISTS'];
const FILTER_KEY: Record<ParticipantFilter, string> = {
  ALL: 'fAll', SUBMITTED: 'fSubmitted', NOT_SUBMITTED: 'fNotSubmitted', UNDER_REVIEW: 'fUnderReview', ADVANCED: 'fAdvanced', NOT_SELECTED: 'fNotSelected', FINALISTS: 'fFinalists',
};

export function ReviewPanel({ c, stageId, onSelectStage, onChanged }: { c: ManageDetail; stageId: string; onSelectStage: (id: string) => void; onChanged: () => void }) {
  const C = useAppColors();
  return (
    <View style={{ gap: 14 }}>
      {/* Stage picker — horizontal chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {c.stages.map((s) => {
          const on = s.id === stageId;
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelectStage(s.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.stageChip, { borderColor: on ? C.brinjal1 : C.border, backgroundColor: on ? withAlpha(C.brinjal1, 0.08) : C.surface }]}>
              <Text style={[shared.strong, { color: on ? C.brinjal1 : C.text }]}>{s.order}. {s.name}</Text>
              <StageBadge status={s.status} />
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Keyed by stage: switching stages starts with a clean filter/page/draft state. */}
      <StageReview key={stageId} c={c} stageId={stageId} onChanged={onChanged} />
    </View>
  );
}

function StageBadge({ status }: { status: ManageDetail['stages'][number]['status'] }) {
  const { t } = useLanguage();
  const b = stageStatusBadge(status, t);
  return <Badge label={b.label} tone={b.tone} />;
}

function StageReview({ c, stageId, onChanged }: { c: ManageDetail; stageId: string; onChanged: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const stage = c.stages.find((s) => s.id === stageId)!;
  const isFinal = stage.order === c.stages.length;
  const editable = !c.suspended && !['COMPLETED', 'CANCELLED'].includes(c.status) && ['OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING'].includes(stage.status);

  const [filter, setFilter] = useState<ParticipantFilter>('ALL');
  const [q, setQ] = useState('');
  const [query] = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [viewing, setViewing] = useState<ParticipantRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const rows = useQuery({
    queryKey: ['competition', 'manage', c.id, 'participants', stageId, filter, query, page],
    queryFn: () => api.participants(c.id, { stageId, filter, q: query.trim() || undefined, page, limit: PAGE }),
    placeholderData: (prev) => prev,
  });
  const summary = useQuery({
    queryKey: ['competition', 'manage', c.id, 'summary', stageId],
    queryFn: () => api.decisionSummary(c.id, stageId),
  });
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

  function refetch() { void rows.refetch(); void summary.refetch(); }

  async function saveDraft(silent = false) {
    if (!dirty) return true;
    setSaving(true);
    try {
      await api.saveDecisions(c.id, stageId, Object.entries(pending).map(([participantId, { before: _before, ...v }]) => { void _before; return { participantId, ...v }; }));
      setPending({});
      refetch();
      if (!silent) toast.success(t('comp.draftSavedToast'));
      onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.somethingWentWrong'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function startPublish() {
    if (!(await saveDraft(true))) return;
    setConfirm(true);
  }

  const data = rows.data;
  const canDecideRow = (r: ParticipantRow) => !isFinal && editable && !r.decision?.isPublished && r.status === 'ACTIVE' && r.currentStageOrder === stage.order;

  return (
    <View style={{ gap: 12 }}>
      {!editable && stage.status === 'UPCOMING' && <Notice tone="info" text={t('comp.reviewNotOpenYet', { when: formatNpt(stage.opensAt) })} />}
      {stage.status === 'RESULTS_PUBLISHED' && <Notice tone="success" text={t('comp.reviewPublished')} />}
      {isFinal && editable && <Notice tone="info" text={t('comp.finalStageReviewNote')} />}
      {stage.status === 'OPEN' && <Notice tone="info" text={t('comp.reviewWhileOpen', { when: formatNpt(stage.deadline) })} />}

      {/* Selection bar */}
      {!isFinal && editable && (
        <View style={[styles.selectionBar, { backgroundColor: C.surface, borderColor: overLimit ? withAlpha(TabColors.danger.color, 0.5) : C.border }]}>
          <View style={{ gap: 2 }}>
            <Text style={[shared.strong, { color: C.text }]}>
              {limit != null ? t('comp.selectedOfLimit', { n: liveAdvance, limit }) : t('comp.selectedCount', { n: liveAdvance })}
            </Text>
            <Text style={[shared.meta, { color: overLimit ? TabColors.danger.color : C.textSecondary }]}>
              {overLimit ? t('comp.overLimit', { n: liveAdvance - limit! }) : dirty ? t('comp.unsavedChanges') : t('comp.draftPrivate')}
            </Text>
          </View>
          <View style={styles.barButtons}>
            <View style={{ flex: 1 }}><Button size="medium" variant="secondary" label={t('comp.saveDraft')} disabled={!dirty} loading={saving} onPress={() => void saveDraft()} /></View>
            <View style={{ flex: 1 }}><Button size="medium" label={t('comp.publishResults')} disabled={overLimit || liveAdvance < 1 || stage.status === 'OPEN'} onPress={() => void startPublish()} /></View>
          </View>
        </View>
      )}

      <TabSlider
        tabs={FILTERS.map((f) => ({ key: f, label: t(`comp.${FILTER_KEY[f]}`) }))}
        active={filter}
        onChange={(k) => { setFilter(k as ParticipantFilter); setPage(1); }}
      />
      <SearchInput value={q} onChangeText={(v) => { setQ(v); setPage(1); }} placeholder={t('comp.searchCreators')} autoCorrect={false} />

      {rows.isPending ? (
        <View style={{ gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={84} radius={RADIUS.lg} />)}</View>
      ) : rows.isError ? (
        <Notice tone="danger" text={t('common.somethingWentWrong')} />
      ) : !data?.items.length ? (
        <View style={[styles.empty, { borderColor: C.border, backgroundColor: C.surface }]}>
          <FontAwesome5 name="inbox" size={26} color={C.textSecondary} />
          <Text style={[shared.strong, { color: C.text, textAlign: 'center' }]}>{t(`comp.emptyFilter_${filter}`)}</Text>
          <Text style={[shared.small, { color: C.textSecondary, textAlign: 'center' }]}>{query ? t('comp.emptySearchBody') : t(`comp.emptyFilterBody_${filter}`)}</Text>
        </View>
      ) : (
        <>
          {data.items.map((r) => {
            const d = effective(r);
            return (
              <View key={r.participantId} style={[shared.card, { borderColor: C.border, backgroundColor: C.surface }]}>
                <ProfileRow
                  label={r.creator.fullName ?? r.creator.username ?? ''}
                  onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: r.creator.id } })}>
                  <PersonAvatar uri={r.creator.avatarUrl} name={r.creator.fullName ?? r.creator.username} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[shared.strong, { color: C.text }]} numberOfLines={1}>
                      {r.creator.fullName ?? r.creator.username}
                      {r.creator.isVerified ? <Text>  <FontAwesome5 name="check-circle" solid size={12} color={C.brinjal1} /></Text> : null}
                    </Text>
                    <Text style={[shared.meta, { color: C.textSecondary }]} numberOfLines={1}>
                      {r.submission ? t('comp.submittedAt', { when: formatNpt(r.submission.submittedAt) }) : t('comp.noEntryYet')}
                      {r.submission && r.submission.version > 1 ? ` · v${r.submission.version}` : ''}
                      {r.decision?.totalScore != null ? ` · ${t('comp.scoreN', { n: r.decision.totalScore })}` : ''}
                    </Text>
                  </View>
                </ProfileRow>
                <View style={styles.rowActions}>
                  {r.status === 'NOT_SELECTED' && r.eliminatedAtOrder === stage.order && <Badge label={t('comp.outcomeNotSelected')} tone="closed" />}
                  {r.currentStageOrder > stage.order && <Badge label={t('comp.outcomeAdvanced')} tone="positive" />}
                  {!!r.submission && (
                    <DecisionChip label={t('comp.viewEntry')} icon="eye" onPress={() => setViewing(r)} />
                  )}
                  {canDecideRow(r) && (
                    <>
                      <DecisionChip label={t('comp.advance')} icon="check" active={d === 'ADVANCE'} color={TabColors.positive.color} onPress={() => toggle(r, 'ADVANCE')} />
                      <DecisionChip label={t('comp.notSelectedShort')} icon="times" active={d === 'NOT_SELECTED'} color={TabColors.danger.color} onPress={() => toggle(r, 'NOT_SELECTED')} />
                    </>
                  )}
                </View>
              </View>
            );
          })}
          {data.pagination.totalPages > 1 && (
            <View style={styles.pager}>
              <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.pageOf', { page, total: data.pagination.totalPages, count: data.pagination.total })}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button size="small" fullWidth={false} variant="secondary" label={t('comp.prev')} disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
                <Button size="small" fullWidth={false} variant="secondary" label={t('comp.next')} disabled={page >= data.pagination.totalPages} onPress={() => setPage((p) => p + 1)} />
              </View>
            </View>
          )}
          {rows.isFetching && <ActivityIndicator color={C.brinjal1} />}
        </>
      )}

      {viewing && (
        <EntrySheet
          c={c}
          stageId={stageId}
          row={viewing}
          editable={editable}
          canDecide={canDecideRow(viewing)}
          pending={pending[viewing.participantId]}
          onClose={() => setViewing(null)}
          onApply={(p) => {
            setPending((cur) => ({ ...cur, [viewing.participantId]: { ...cur[viewing.participantId], ...(p.decision !== undefined ? { before: viewing.decision?.decision ?? null } : {}), ...p } }));
            setViewing(null);
          }}
        />
      )}

      {confirm && (
        <PublishSheet c={c} stageId={stageId} onClose={() => setConfirm(false)} onPublished={() => { setConfirm(false); refetch(); onChanged(); }} />
      )}
    </View>
  );
}

function DecisionChip({ label, icon, active, color, onPress }: { label: string; icon: keyof typeof FontAwesome5.glyphMap; active?: boolean; color?: string; onPress: () => void }) {
  const C = useAppColors();
  const tint = color ?? C.brinjal1;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      hitSlop={4}
      style={[styles.chip, { borderColor: active ? tint : C.border, backgroundColor: active ? tint : C.surface }]}>
      <FontAwesome5 name={icon} solid size={11} color={active ? '#fff' : color ?? C.text} />
      <Text style={[styles.chipText, { color: active ? '#fff' : C.text }]}>{label}</Text>
    </Pressable>
  );
}

function EntrySheet({ c, stageId, row, editable, canDecide, pending, onClose, onApply }: {
  c: ManageDetail; stageId: string; row: ParticipantRow; editable: boolean; canDecide: boolean;
  pending?: Pending; onClose: () => void; onApply: (p: Pending) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const detail = useQuery({
    queryKey: ['competition', 'manage', c.id, 'submission', stageId, row.participantId],
    queryFn: () => api.submission(c.id, stageId, row.participantId),
  });
  const [notes, setNotes] = useState<string>(pending?.notes ?? row.decision?.notes ?? '');
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const src = (pending?.scores ?? row.decision?.scores ?? {}) as Record<string, number>;
    return Object.fromEntries(Object.entries(src).map(([k, v]) => [k, String(v)]));
  });
  const [decision, setDecision] = useState<Decision>(pending?.decision !== undefined ? pending.decision! : row.decision?.decision ?? null);

  function apply() {
    const p: Pending = { notes: notes.trim() || null };
    const parsed = Object.fromEntries(Object.entries(scores).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Math.min(10, Math.max(0, Number(v) || 0))]));
    if (c.scoringEnabled && Object.keys(parsed).length) p.scores = parsed;
    if (canDecide) p.decision = decision;
    onApply(p);
  }

  const d = detail.data;
  const name = row.creator.fullName ?? row.creator.username ?? t('comp.entry');
  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={name}
      footer={editable ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button label={t('common.cancel')} variant="secondary" onPress={onClose} /></View>
          <View style={{ flex: 1 }}><Button label={t('comp.applyToDraft')} onPress={apply} /></View>
        </View>
      ) : <Button label={t('common.close')} variant="secondary" onPress={onClose} />}>
      <View style={{ gap: SPACING.md }}>
        <Pressable
          onPress={() => { onClose(); router.push({ pathname: '/(business)/creator-detail', params: { id: row.creator.id } }); }}
          accessibilityRole="link"
          style={[shared.row, styles.profileLink, { borderColor: C.border }]}>
          <PersonAvatar uri={row.creator.avatarUrl} name={name} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[shared.strong, { color: C.text }]} numberOfLines={1}>{name}</Text>
            {!!row.creator.username && <Text style={[shared.meta, { color: C.textSecondary }]}>@{row.creator.username}</Text>}
          </View>
          <Text style={[shared.meta, { color: C.brinjal1, fontFamily: F.semibold }]}>{t('comp.viewCreatorProfile')}</Text>
        </Pressable>

        {detail.isPending ? <Skeleton width="100%" height={120} radius={RADIUS.lg} /> : !d?.submission ? (
          <Text style={[shared.small, { color: C.textSecondary }]}>{t('comp.noEntryYet')}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            <SubmissionPreview sub={d.submission} />
            <Text style={[shared.meta, { color: C.textSecondary }]}>
              {t('comp.submittedAt', { when: formatNpt(d.submission.submittedAt) })}{d.creator.location ? ` · ${d.creator.location}` : ''}
            </Text>
            {d.submission.history.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text style={[shared.strong, { color: C.text }]}>{t('comp.history', { n: d.submission.history.length })}</Text>
                {d.submission.history.map((h) => (
                  <Pressable key={h.version} onPress={() => { const u = h.videoUrl ?? h.externalUrl; if (u) void Linking.openURL(u); }}>
                    <Text style={[shared.meta, { color: C.textSecondary }]}>
                      v{h.version} · {formatNpt(h.submittedAt)} · <Text style={{ color: C.brinjal1 }}>{t('comp.open')}</Text>
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {editable && (
          <View style={[styles.editBlock, { borderTopColor: C.border }]}>
            {c.scoringEnabled && c.judgingCriteria.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={[shared.strong, { color: C.text }]}>{t('comp.scoresTitle')}</Text>
                {c.judgingCriteria.map((cr) => (
                  <TextInputWithLabel
                    key={cr.key}
                    label={`${cr.label} (${cr.weight}%)`}
                    keyboardType="decimal-pad"
                    value={scores[cr.key] ?? ''}
                    onChangeText={(v) => setScores((s) => ({ ...s, [cr.key]: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="0 – 10"
                  />
                ))}
                <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.scoresHint')}</Text>
              </View>
            )}
            <TextInputWithLabel label={t('comp.privateNotes')} hint={t('comp.privateNotesHint')} value={notes} onChangeText={setNotes} multiline maxLength={2000} />
            {canDecide && (
              <View style={styles.rowActions}>
                <DecisionChip label={t('comp.advance')} icon="check" active={decision === 'ADVANCE'} color={TabColors.positive.color} onPress={() => setDecision(decision === 'ADVANCE' ? null : 'ADVANCE')} />
                <DecisionChip label={t('comp.notSelectedShort')} icon="times" active={decision === 'NOT_SELECTED'} color={TabColors.danger.color} onPress={() => setDecision(decision === 'NOT_SELECTED' ? null : 'NOT_SELECTED')} />
              </View>
            )}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

function PublishSheet({ c, stageId, onClose, onPublished }: { c: ManageDetail; stageId: string; onClose: () => void; onPublished: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const stage = c.stages.find((s) => s.id === stageId)!;
  const summary = useQuery({ queryKey: ['competition', 'manage', c.id, 'summary', stageId, 'publish'], queryFn: () => api.decisionSummary(c.id, stageId) });
  const selected = useQuery({
    queryKey: ['competition', 'manage', c.id, 'publish-list', stageId],
    queryFn: () => api.participants(c.id, { stageId, filter: 'UNDER_REVIEW', page: 1, limit: 100 }),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const advancing = (selected.data?.items ?? []).filter((r) => r.decision?.decision === 'ADVANCE');

  async function publish() {
    if (!summary.data) return;
    setBusy(true);
    setError('');
    try {
      await api.publishDecisions(c.id, stageId, summary.data.advance);
      toast.success(t('comp.stageResultsPublishedToast'));
      onPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  }

  const s = summary.data;
  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={t('comp.publishStageTitle', { name: stage.name })}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button label={t('common.cancel')} variant="secondary" onPress={onClose} disabled={busy} /></View>
          <View style={{ flex: 1 }}><Button label={t('comp.publishResults')} onPress={() => void publish()} loading={busy} disabled={!s} /></View>
        </View>
      }>
      {!s ? <Skeleton width="100%" height={120} radius={RADIUS.lg} /> : (
        <View style={{ gap: SPACING.md }}>
          <Text style={[shared.strong, { color: C.text }]}>{t('comp.publishSummary', { a: s.advance, n: s.inStage - s.advance })}</Text>
          {s.advanceLimit != null && s.advance < s.advanceLimit && <Notice tone="warning" text={t('comp.underLimitWarning', { n: s.advance, limit: s.advanceLimit })} />}
          {s.undecided > 0 && <Notice tone="info" text={t('comp.undecidedWarning', { n: s.undecided })} />}
          {advancing.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={[shared.strong, { color: C.text }]}>{t('comp.advancingList')}</Text>
              {advancing.map((r) => <Text key={r.participantId} style={[shared.small, { color: C.textSecondary }]}>• {r.creator.fullName ?? r.creator.username}</Text>)}
              {s.advance > advancing.length && <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.andMore', { n: s.advance - advancing.length })}</Text>}
            </View>
          )}
          <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.publishIrreversible')}</Text>
          {!!error && <FormErrorBanner message={error} />}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stageChip:    { borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, gap: 6, minWidth: 140 },
  selectionBar: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 10 },
  barButtons:   { flexDirection: 'row', gap: 8 },
  rowActions:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, minHeight: 34 },
  chipText:     { fontSize: 13, fontFamily: F.semibold },
  pager:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  empty:        { alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.lg, padding: SPACING.xl },
  profileLink:  { borderWidth: 1, borderRadius: RADIUS.md, padding: 10 },
  editBlock:    { gap: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.md },
});
