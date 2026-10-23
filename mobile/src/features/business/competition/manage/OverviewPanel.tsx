// Overview tab — mobile port of the Overview block in
// web/src/app/competitions/BusinessCompetitionManagePage.tsx.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { TFn } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { AppModal } from '@/components/AppModal';
import { useToast } from '@/components/Toast';
import { TabColors } from '@/utilities/tabColors';
import { F } from '@/utilities/constants';
import { competitionManageService as api, type ManageDetail, type PublicStage } from '@/services/competition';
import { Badge, InfoRow, PrizeList, Section } from '@/features/creator/competition/parts';
import { activityLabel, formatNpt, stageStatusBadge } from '@/features/creator/competition/format';
import { DeadlineSheet, Notice, ReasonSheet, StatTile, shared } from './shared';

type Confirm = { key: string; title: string; body: string; label: string; type: 'info' | 'warning' | 'danger'; fn: () => Promise<unknown>; done: string; after?: () => void };
type Sheet =
  | { kind: 'cancel' } | { kind: 'pause' } | { kind: 'close' } | { kind: 'reopenResults' }
  | { kind: 'extendRegistration' } | { kind: 'extendStage'; stage: PublicStage } | { kind: 'reopenStage'; stage: PublicStage }
  | null;

export function OverviewPanel({ c, onChanged, onGoTab }: { c: ManageDetail; onChanged: () => void; onGoTab: (tab: 'review' | 'results' | 'activity', stageId?: string) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const a = c.allowedActions;

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await confirm.fn();
      toast.success(confirm.done);
      confirm.after?.();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }
  // Sheets throw on failure so they can show the error inline.
  const after = (msg: string) => { toast.success(msg); onChanged(); };

  const statsByStage = new Map(c.stats.stages.map((s) => [s.stageId, s]));
  const nextStep = nextStepFor(c, t);

  return (
    <View style={{ gap: 14 }}>
      {!!nextStep && <Notice tone="info" text={nextStep} />}

      <View style={styles.stats}>
        <StatTile label={t('comp.statParticipants')} value={c.stats.participants} icon="users" color={TabColors.brand.color} />
        <StatTile label={t('comp.statAwaiting')} value={c.stats.awaitingReview} icon="inbox" color={TabColors.warning.color} />
        <StatTile label={t('comp.statStillIn')} value={c.stats.active} icon="trophy" color={TabColors.positive.color} />
      </View>

      <Section title={t('comp.controls')}>
        <View style={{ gap: 8 }}>
          {a.submitForReview && (
            <Button
              size="medium"
              label={c.status === 'DRAFT' ? t('comp.submitForReview') : t('comp.resubmit')}
              icon="paper-plane"
              onPress={() => setConfirm({ key: 'submit', title: t('comp.submitTitle'), body: t('comp.submitBody'), label: t('comp.submitForReview'), type: 'info', fn: () => api.submitForReview(c.id), done: t('comp.submittedToast') })}
            />
          )}
          {a.resume && <Button size="medium" label={t('comp.resume')} icon="play" onPress={() => setConfirm({ key: 'resume', title: t('comp.resume'), body: t('comp.resumeBody'), label: t('comp.resume'), type: 'info', fn: () => api.resume(c.id), done: t('comp.resumedToast') })} />}
          {a.withdraw && (
            <Button size="medium" label={t('comp.withdraw')} variant="secondary"
              onPress={() => setConfirm({ key: 'withdraw', title: t('comp.withdrawQ'), body: c.status === 'SCHEDULED' ? t('comp.withdrawScheduledBody') : t('comp.withdrawBody'), label: t('comp.withdraw'), type: 'warning', fn: () => api.withdraw(c.id), done: t('comp.movedToDraft') })} />
          )}
          {a.discardPendingChanges && (
            <Button size="medium" label={t('comp.discardChanges')} variant="secondary"
              onPress={() => setConfirm({ key: 'discard', title: t('comp.discardChangesQ'), body: t('comp.discardChangesBody'), label: t('comp.discardChanges'), type: 'warning', fn: () => api.discardChanges(c.id), done: t('comp.changesDiscarded') })} />
          )}
          {a.pause && <Button size="medium" label={t('comp.pause')} icon="pause" variant="secondary" onPress={() => setSheet({ kind: 'pause' })} />}
          {a.extendRegistration && <Button size="medium" label={t('comp.extendRegistration')} icon="calendar-alt" variant="secondary" onPress={() => setSheet({ kind: 'extendRegistration' })} />}
          {a.closeRegistration && (
            <Button size="medium" label={t('comp.closeRegistration')} icon="door-closed" variant="secondary"
              onPress={() => setConfirm({ key: 'closeReg', title: t('comp.closeRegistrationQ'), body: t('comp.closeRegistrationBody'), label: t('comp.closeRegistration'), type: 'warning', fn: () => api.closeRegistration(c.id), done: t('comp.registrationClosedToast') })} />
          )}
          {a.closeCompetition && <Button size="medium" label={t('comp.closeCompetition')} icon="flag-checkered" variant="secondary" onPress={() => setSheet({ kind: 'close' })} />}
          {a.reopenResults && <Button size="medium" label={t('comp.reopenResults')} icon="undo" variant="secondary" onPress={() => setSheet({ kind: 'reopenResults' })} />}
          {a.deleteDraft && (
            <Button size="medium" label={t('comp.deleteDraft')} icon="trash-alt" variant="danger"
              onPress={() => setConfirm({ key: 'delete', title: t('comp.deleteDraftQ'), body: t('comp.deleteDraftBody'), label: t('comp.deleteDraft'), type: 'danger', fn: () => api.deleteDraft(c.id), done: t('comp.draftDeleted'), after: () => router.back() })} />
          )}
          {a.cancel && !a.deleteDraft && <Button size="medium" label={t('comp.cancelCompetition')} icon="ban" variant="danger" onPress={() => setSheet({ kind: 'cancel' })} />}
        </View>
        {c.status === 'PAUSED' && <Text style={[shared.meta, { color: C.textSecondary }]}>{t('comp.pausedOrganizerNote')}</Text>}
      </Section>

      <Section title={t('comp.stages')}>
        {c.stages.map((s) => {
          const st = statsByStage.get(s.id);
          const badge = stageStatusBadge(s.status, t);
          const isFinal = s.order === c.stages.length;
          const prev = c.stages.find((x) => x.order === s.order - 1);
          // SINGLE mode: stage 2+ only shortlists entries already in — no window, no deadline controls.
          const reviewRound = c.submissionMode === 'SINGLE' && s.order > 1;
          const canOpen = !reviewRound && c.status === 'ACTIVE' && s.status === 'UPCOMING' && (!prev || prev.status === 'RESULTS_PUBLISHED');
          const canReview = ['OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING'].includes(s.status);
          return (
            <View key={s.id} style={[shared.card, { borderColor: C.border }]}>
              <View style={styles.stageHead}>
                <Text style={[shared.strong, { color: C.text, flex: 1 }]}>
                  {s.order}. {s.name}{s.advanceLimit ? <Text style={{ fontFamily: F.regular, color: C.textSecondary }}> · {t('comp.topN', { n: s.advanceLimit })}</Text> : null}
                </Text>
                <Badge label={badge.label} tone={badge.tone} />
              </View>
              <View style={{ gap: 4 }}>
                {reviewRound ? (
                  <Text style={[shared.small, { color: C.textSecondary }]}>
                    {s.status === 'UPCOMING' ? t('comp.reviewRoundStartsAfter', { name: prev?.name ?? '' }) : t('comp.reviewRoundLine')}
                  </Text>
                ) : (
                  <>
                    <InfoRow label={t('comp.opens')} value={formatNpt(s.opensAt)} />
                    <InfoRow label={t('comp.deadline')} value={formatNpt(s.deadline)} />
                  </>
                )}
                {st && <InfoRow label={t('comp.entries')} value={`${st.submissions} / ${st.eligible}`} />}
                {st && (st.advanced > 0 || st.notSelected > 0) && <InfoRow label={t('comp.published')} value={t('comp.advancedVsNot', { a: st.advanced, n: st.notSelected })} />}
                {st && s.status === 'SELECTION_PENDING' && <InfoRow label={t('comp.draft')} value={t('comp.draftSelected', { n: st.draftAdvance })} />}
              </View>
              {(canOpen || s.status === 'OPEN' || canReview || (!reviewRound && ['UPCOMING', 'OPEN'].includes(s.status) && a.edit)
                || (!reviewRound && ['UNDER_REVIEW', 'SELECTION_PENDING'].includes(s.status) && ['ACTIVE', 'AWAITING_RESULTS'].includes(c.status))) && (
                <View style={styles.stageActions}>
                  {canOpen && (
                    <Button size="small" fullWidth={false} label={t('comp.openNow')} icon="play"
                      onPress={() => setConfirm({ key: `open-${s.id}`, title: t('comp.openStageQ', { name: s.name }), body: t('comp.openStageBody'), label: t('comp.openNow'), type: 'info', fn: () => api.openStage(c.id, s.id), done: t('comp.stageOpenedToast') })} />
                  )}
                  {s.status === 'OPEN' && (
                    <Button size="small" fullWidth={false} variant="secondary" label={t('comp.closeSubmissions')}
                      onPress={() => setConfirm({ key: `close-${s.id}`, title: t('comp.closeStageQ', { name: s.name }), body: t('comp.closeStageBody'), label: t('comp.closeSubmissions'), type: 'warning', fn: () => api.closeStage(c.id, s.id), done: t('comp.stageClosedToast') })} />
                  )}
                  {!reviewRound && ['UPCOMING', 'OPEN'].includes(s.status) && a.edit && (
                    <Button size="small" fullWidth={false} variant="secondary" icon="calendar-alt" label={t('comp.extendDeadline')} onPress={() => setSheet({ kind: 'extendStage', stage: s })} />
                  )}
                  {!reviewRound && ['UNDER_REVIEW', 'SELECTION_PENDING'].includes(s.status) && ['ACTIVE', 'AWAITING_RESULTS'].includes(c.status) && (
                    <Button size="small" fullWidth={false} variant="secondary" label={t('comp.reopenSubmissions')} onPress={() => setSheet({ kind: 'reopenStage', stage: s })} />
                  )}
                  {canReview && (
                    <Button size="small" fullWidth={false} variant="link"
                      label={isFinal && s.status !== 'OPEN' ? t('comp.goFinalResults') : t('comp.reviewEntries')}
                      onPress={() => onGoTab(isFinal && s.status !== 'OPEN' ? 'results' : 'review', s.id)} />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </Section>

      <Section title={t('comp.keyDates')}>
        <InfoRow label={t('comp.registrationOpens')} value={formatNpt(c.registrationOpensAt)} />
        <InfoRow label={t('comp.registrationCloses2')} value={formatNpt(c.registrationDeadline)} />
        <InfoRow label={t('comp.runs')} value={`${formatNpt(c.startsAt, false)} – ${formatNpt(c.endsAt, false)}`} />
        {c.publishAt && c.status === 'SCHEDULED' && <InfoRow label={t('comp.goesLiveLabel')} value={formatNpt(c.publishAt)} />}
        {c.stats.upcomingDeadlines.length > 0 && (
          <View style={{ gap: 6, marginTop: 6 }}>
            <Text style={[styles.subhead, { color: C.textSecondary }]}>{t('comp.upcomingDeadlines')}</Text>
            {c.stats.upcomingDeadlines.map((d) => (
              <View key={d.label + d.at} style={shared.row}>
                <FontAwesome5 name="clock" size={12} color={C.textSecondary} />
                <Text style={[shared.small, { color: C.text, flex: 1 }]}>{d.label} <Text style={{ color: C.textSecondary }}>· {formatNpt(d.at)}</Text></Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title={t('comp.prizes')}>
        <PrizeList prizes={c.prizes} pool={c.prizePool} />
      </Section>

      {c.reviewHistory.length > 0 && (
        <Section title={t('comp.reviewHistory')}>
          {c.reviewHistory.slice(0, 6).map((h) => (
            <View key={h.id} style={{ gap: 2 }}>
              <Text style={[shared.small, { color: C.text }]}>{t(`comp.rev_${h.action}`)} <Text style={{ color: C.textSecondary, fontSize: 12 }}>· {formatNpt(h.createdAt)}</Text></Text>
              {!!h.feedback && <Text style={[shared.meta, { color: C.textSecondary }]}>“{h.feedback}”</Text>}
            </View>
          ))}
        </Section>
      )}

      <Section title={t('comp.latestActions')}>
        {c.recentActivity.length === 0 ? (
          <Text style={[shared.small, { color: C.textSecondary }]}>{t('comp.noActivity')}</Text>
        ) : (
          <>
            {c.recentActivity.map((r, i) => (
              <View key={i} style={{ gap: 1 }}>
                <Text style={[shared.small, { color: C.text }]}>{activityLabel(r.action, r.metadata, t)}</Text>
                <Text style={[shared.meta, { color: C.textSecondary }]}>{formatNpt(r.createdAt)}{r.actorType === 'SYSTEM' ? ` · ${t('comp.automatic')}` : ''}</Text>
              </View>
            ))}
            <Pressable onPress={() => onGoTab('activity')} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
              <Text style={[shared.strong, { color: C.brinjal1 }]}>{t('comp.viewAll')}</Text>
            </Pressable>
          </>
        )}
      </Section>

      {/* Confirm-only actions */}
      <AppModal
        visible={!!confirm}
        type={confirm?.type ?? 'info'}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel={confirm?.label ?? ''}
        cancelLabel={t('common.cancel')}
        loading={busy}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />

      {/* Reason / deadline sheets */}
      <ReasonSheet visible={sheet?.kind === 'cancel'} danger title={t('comp.cancelQ')} message={t('comp.cancelBody')} label={t('comp.reasonForParticipants')} confirmLabel={t('comp.cancelCompetition')}
        onClose={() => setSheet(null)} onConfirm={async (r) => { await api.cancel(c.id, r); after(t('comp.cancelledToast')); }} />
      <ReasonSheet visible={sheet?.kind === 'pause'} optional title={t('comp.pauseQ')} message={t('comp.pauseBody')} label={t('comp.reasonOptional')} confirmLabel={t('comp.pause')}
        onClose={() => setSheet(null)} onConfirm={async (r) => { await api.pause(c.id, r); after(t('comp.pausedToast')); }} />
      <ReasonSheet visible={sheet?.kind === 'close'} optional title={t('comp.closeQ')} message={t('comp.closeBody')} label={t('comp.reasonOptional')} confirmLabel={t('comp.closeCompetition')}
        onClose={() => setSheet(null)} onConfirm={async (r) => { await api.close(c.id, r); after(t('comp.closedToast')); }} />
      <ReasonSheet visible={sheet?.kind === 'reopenResults'} title={t('comp.reopenResultsQ')} message={t('comp.reopenResultsBody')} label={t('comp.reasonLabel')} confirmLabel={t('comp.reopenResults')}
        onClose={() => setSheet(null)} onConfirm={async (r) => { await api.reopenResults(c.id, r); after(t('comp.resultsReopenedToast')); }} />
      {sheet?.kind === 'extendRegistration' && (
        <DeadlineSheet visible title={t('comp.extendRegistration')} current={c.registrationDeadline} confirmLabel={t('comp.saveDeadline')}
          onClose={() => setSheet(null)} onConfirm={async (d) => { await api.extendRegistration(c.id, d); after(t('comp.deadlineSavedToast')); }} />
      )}
      {sheet?.kind === 'extendStage' && (
        <DeadlineSheet visible title={t('comp.extendStageTitle', { name: sheet.stage.name })} message={t('comp.extendStageBody')} current={sheet.stage.deadline} confirmLabel={t('comp.saveDeadline')}
          onClose={() => setSheet(null)} onConfirm={async (d) => { await api.extendStage(c.id, sheet.stage.id, d); after(t('comp.deadlineSavedToast')); }} />
      )}
      {sheet?.kind === 'reopenStage' && (
        <DeadlineSheet visible title={t('comp.reopenStageTitle', { name: sheet.stage.name })} message={t('comp.reopenStageBody')} confirmLabel={t('comp.reopenSubmissions')}
          onClose={() => setSheet(null)} onConfirm={async (d) => { await api.reopenStage(c.id, sheet.stage.id, d); after(t('comp.stageReopenedToast')); }} />
      )}
    </View>
  );
}

function nextStepFor(c: ManageDetail, t: TFn): string | null {
  if (c.suspended) return null;
  if (c.status === 'DRAFT') return t('comp.nextDraft');
  if (['PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(c.status)) return null; // review banner explains
  if (c.status === 'SCHEDULED') return t('comp.nextScheduled', { when: formatNpt(c.publishAt) });
  if (c.status === 'AWAITING_RESULTS') return t('comp.nextAwaiting');
  const reviewing = c.stages.find((s) => s.status === 'UNDER_REVIEW' || s.status === 'SELECTION_PENDING');
  if (reviewing && reviewing.order < c.stages.length) return t('comp.nextReview', { name: reviewing.name });
  const open = c.stages.find((s) => s.status === 'OPEN');
  if (open) return t('comp.nextOpen', { name: open.name, when: formatNpt(open.deadline) });
  return null;
}

const styles = StyleSheet.create({
  stats:        { flexDirection: 'row', gap: 10 },
  stageHead:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  subhead:      { fontSize: 11, fontFamily: F.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
});
