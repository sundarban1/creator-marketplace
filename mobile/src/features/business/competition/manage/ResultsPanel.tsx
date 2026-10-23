// Final results tab — mobile port of web/src/app/competitions/AwardsPanel.tsx.
// Assign finalists to prize slots (tap a slot → pick a finalist), save as a
// draft, then preview & publish once the competition is awaiting results.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { FormErrorBanner } from '@/components/FieldError';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { withAlpha } from '@/utilities/color';
import { F, RADIUS, SPACING } from '@/utilities/constants';
import { competitionManageService as api, type ManageDetail, type ParticipantRow } from '@/services/competition';
import { Section } from '@/features/creator/competition/parts';
import { npr } from '@/features/creator/competition/format';
import { Notice, shared } from './shared';
import { PersonAvatar } from '@/features/creator/competition/ProfileAvatar';

const ORANGE = '#EA580C';
const VIOLET = '#7C3AED';

function seedSlots(c: ManageDetail): Record<string, string> {
  const m: Record<string, string> = {};
  const used: Record<string, number> = {};
  for (const a of c.awards) {
    const i = used[a.prizeId] ?? 0;
    m[`${a.prizeId}:${i}`] = a.participantId;
    used[a.prizeId] = i + 1;
  }
  return m;
}

export function ResultsPanel({ c, onChanged }: { c: ManageDetail; onChanged: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const finalStage = c.stages[c.stages.length - 1];
  const finalists = useQuery({
    queryKey: ['competition', 'manage', c.id, 'finalists', finalStage?.id],
    queryFn: () => api.participants(c.id, { stageId: finalStage.id, filter: 'FINALISTS', page: 1, limit: 100 }),
    enabled: !!finalStage,
  });
  const editable = !c.suspended && ['ACTIVE', 'AWAITING_RESULTS'].includes(c.status);

  // slot key `${prizeId}:${index}` → participantId. Parent re-keys this panel when saved awards change.
  const [initial] = useState(() => seedSlots(c));
  const [slots, setSlots] = useState<Record<string, string>>(initial);
  const [picking, setPicking] = useState<{ key: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const assignments = Object.entries(slots).filter(([, p]) => p).map(([k, participantId]) => ({ prizeId: k.split(':')[0], participantId }));
  const dirty = JSON.stringify(slots) !== JSON.stringify(initial);
  const rowOf = (pid: string): ParticipantRow | undefined => finalists.data?.items.find((x) => x.participantId === pid);
  const nameOf = (pid: string) => {
    const r = rowOf(pid);
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
      await api.saveAwards(c.id, assignments);
      if (!silent) toast.success(t('comp.draftSavedToast'));
      onChanged();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError('');
    try {
      await api.publishResults(c.id, assignments.length);
      toast.success(t('comp.resultsPublishedToast'));
      setPreview(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setPublishing(false);
    }
  }

  if (c.status === 'DRAFT' || c.status === 'SCHEDULED') return <Empty icon="trophy" title={t('comp.resultsNotYetTitle')} body={t('comp.resultsNotYetDraft')} />;
  if (c.status === 'CANCELLED') return <Empty icon="trophy" title={t('comp.cancelledTitle')} body={t('comp.cancelledResultsBody')} />;
  if (!c.prizes.length && c.status !== 'COMPLETED') return <Empty icon="award" title={t('comp.noPrizesTitle')} body={t('comp.noPrizesBody')} />;

  if (c.status === 'COMPLETED') {
    const published = c.awards.filter((a) => a.isPublished);
    return (
      <Section title={t('comp.publishedResults')}>
        {published.length === 0 ? <Text style={[shared.small, { color: C.textSecondary }]}>{t('comp.completedNoAwards')}</Text> : published.map((a) => (
          <Pressable key={a.prizeId + a.participantId} style={shared.row} accessibilityRole="link"
            onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: a.creator.id } })}>
            <FontAwesome5 name="award" size={16} color={a.prize.kind === 'PLACEMENT' ? ORANGE : VIOLET} />
            <PersonAvatar uri={a.creator.avatarUrl} name={a.creator.fullName ?? a.creator.username} size={32} />
            <Text style={[shared.strong, { color: C.text, flex: 1 }]} numberOfLines={1}>{a.creator.fullName ?? a.creator.username}</Text>
            <Text style={[shared.meta, { color: C.textSecondary }]}>{a.prize.title}</Text>
          </Pressable>
        ))}
        <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.reopenHint')}</Text>
      </Section>
    );
  }

  const finalistRows = finalists.data?.items ?? [];

  return (
    <View style={{ gap: 14 }}>
      {c.status === 'ACTIVE' && <Notice tone="info" text={t('comp.awardsDraftWhileActive')} />}
      {finalists.isPending ? <Skeleton width="100%" height={220} radius={RADIUS.lg} /> : !finalistRows.length ? (
        <Empty icon="trophy" title={t('comp.noFinalistsTitle')} body={t('comp.noFinalistsBody')} />
      ) : (
        <Section title={t('comp.assignPrizes')}>
          <Text style={[shared.small, { color: C.textSecondary }]}>{t('comp.assignHelp', { n: finalists.data!.pagination.total })}</Text>
          {c.prizes.map((p) => (
            <View key={p.id} style={[shared.card, { borderColor: C.border }]}>
              <View style={shared.row}>
                <FontAwesome5 name="award" size={15} color={p.kind === 'PLACEMENT' ? ORANGE : VIOLET} />
                <Text style={[shared.strong, { color: C.text, flex: 1 }]}>
                  {p.title}{p.amount != null ? <Text style={{ fontFamily: F.regular, color: C.textSecondary }}> · {npr(p.amount)}</Text> : null}
                </Text>
              </View>
              {Array.from({ length: p.recipientCount }, (_, i) => {
                const key = `${p.id}:${i}`;
                const pid = slots[key];
                const r = pid ? rowOf(pid) : undefined;
                return (
                  <Pressable
                    key={key}
                    disabled={!editable}
                    onPress={() => setPicking({ key, title: p.recipientCount > 1 ? `${p.title} ${i + 1}` : p.title })}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.title} ${i + 1}: ${pid ? nameOf(pid) : t('comp.unassigned')}`}
                    style={[styles.slot, { borderColor: pid ? withAlpha(C.brinjal1, 0.4) : C.border, backgroundColor: pid ? withAlpha(C.brinjal1, 0.05) : C.background, opacity: editable ? 1 : 0.7 }]}>
                    {pid ? <PersonAvatar uri={r?.creator.avatarUrl} name={nameOf(pid)} size={28} /> : <FontAwesome5 name="user-plus" size={13} color={C.textSecondary} />}
                    <Text style={[shared.small, { flex: 1, color: pid ? C.text : C.textSecondary, fontFamily: pid ? F.semibold : F.regular }]} numberOfLines={1}>
                      {pid ? nameOf(pid) : t('comp.unassigned')}
                    </Text>
                    {editable && <FontAwesome5 name="chevron-down" size={11} color={C.textSecondary} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
          {clientErrors.length > 0 && <Notice tone="warning" text={clientErrors.join('\n')} />}
          {!!error && <FormErrorBanner message={error} />}
          {editable && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" size="medium" label={t('comp.saveDraft')} disabled={!dirty || clientErrors.length > 0} loading={saving} onPress={() => void save()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button size="medium" label={t('comp.previewPublish')}
                  disabled={c.status !== 'AWAITING_RESULTS' || clientErrors.length > 0 || assignments.length === 0}
                  onPress={async () => { if (!dirty || (await save(true))) setPreview(true); }} />
              </View>
            </View>
          )}
        </Section>
      )}

      {/* Finalist picker for one prize slot */}
      <BottomSheet visible={!!picking} onClose={() => setPicking(null)} title={picking?.title ?? ''}>
        <View style={{ gap: 4 }}>
          <PickRow label={t('comp.unassigned')} selected={!picking || !slots[picking.key]} onPress={() => { setSlots((s) => ({ ...s, [picking!.key]: '' })); setPicking(null); }} />
          {finalistRows.map((r) => (
            <PickRow
              key={r.participantId}
              avatar={r.creator.avatarUrl}
              name={r.creator.fullName ?? r.creator.username}
              label={`${r.creator.fullName ?? r.creator.username}${r.submission ? '' : ` (${t('comp.noEntryShort')})`}`}
              selected={!!picking && slots[picking.key] === r.participantId}
              onPress={() => { setSlots((s) => ({ ...s, [picking!.key]: r.participantId })); setPicking(null); }}
            />
          ))}
        </View>
      </BottomSheet>

      {/* Preview & publish */}
      <BottomSheet
        visible={preview}
        onClose={() => setPreview(false)}
        title={t('comp.publishFinalTitle')}
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button label={t('common.cancel')} variant="secondary" onPress={() => setPreview(false)} disabled={publishing} /></View>
            <View style={{ flex: 1 }}><Button label={t('comp.publishFinal')} onPress={() => void publish()} loading={publishing} /></View>
          </View>
        }>
        <View style={{ gap: SPACING.sm }}>
          {assignments.map((a) => (
            <View key={a.prizeId + a.participantId} style={[styles.previewRow, { borderBottomColor: C.border }]}>
              <Text style={[shared.strong, { color: C.text, flex: 1 }]} numberOfLines={1}>{nameOf(a.participantId)}</Text>
              <Text style={[shared.small, { color: C.textSecondary }]}>{c.prizes.find((p) => p.id === a.prizeId)?.title}</Text>
            </View>
          ))}
          <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.publishFinalBody')}</Text>
          {!!error && <FormErrorBanner message={error} />}
        </View>
      </BottomSheet>
    </View>
  );
}

function PickRow({ label, avatar, name, selected, onPress }: { label: string; avatar?: string | null; name?: string | null; selected: boolean; onPress: () => void }) {
  const C = useAppColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
      style={[styles.pickRow, selected && { backgroundColor: withAlpha(C.brinjal1, 0.08) }]}>
      {avatar !== undefined ? <PersonAvatar uri={avatar} name={name} size={32} /> : <FontAwesome5 name="minus-circle" size={16} color={C.textSecondary} style={{ width: 32, textAlign: 'center' }} />}
      <Text style={[shared.small, { color: C.text, flex: 1 }]} numberOfLines={1}>{label}</Text>
      {selected && <FontAwesome5 name="check" size={13} color={C.brinjal1} />}
    </Pressable>
  );
}

function Empty({ icon, title, body }: { icon: keyof typeof FontAwesome5.glyphMap; title: string; body: string }) {
  const C = useAppColors();
  return (
    <View style={[styles.empty, { borderColor: C.border, backgroundColor: C.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(ORANGE, 0.1) }]}>
        <FontAwesome5 name={icon} solid size={24} color={ORANGE} />
      </View>
      <Text style={[shared.strong, { color: C.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[shared.small, { color: C.textSecondary, textAlign: 'center' }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, minHeight: 46 },
  pickRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 10, borderRadius: RADIUS.md, minHeight: 48 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  empty:      { alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.lg, padding: SPACING.xl },
  emptyIcon:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
