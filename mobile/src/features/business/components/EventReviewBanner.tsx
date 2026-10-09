import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService, canResubmitEvent } from '@/services/campaign';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';
import type { Campaign } from '@/types';

// Business-side event review (admin moderation) banner — where the event
// stands, the admin's feedback/reason, and what to do next. Same states and
// copy as web's EventReviewBanner (web/src/app/business/EventReviewBanner.tsx).

const TONES = {
  warning: { bg: '#FEF3C7', border: '#FCD34D', fg: '#B45309' },
  success: { bg: '#DCFCE7', border: '#86EFAC', fg: '#15803D' },
  danger:  { bg: '#FEE2E2', border: '#FCA5A5', fg: '#B91C1C' },
} as const;

export function EventReviewBanner({ campaign, compact = false, onSubmitted }: {
  campaign: Campaign;
  /** Edit screen: just the feedback + "saving resubmits" hint, no actions. */
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const history = useQuery({
    queryKey: ['campaign-review-history', campaign.id],
    queryFn: () => campaignService.getReviewHistory(campaign.id),
    enabled: showHistory,
  });

  const { status, review } = campaign;
  let tone: keyof typeof TONES;
  let icon: string;
  let title: string;
  let body: string;
  if (status === 'pending_approval') {
    tone = 'warning'; icon = 'clock'; title = t('eventReview.pendingTitle'); body = t('eventReview.pendingBody');
  } else if (status === 'changes_requested') {
    tone = 'warning'; icon = 'edit'; title = t('eventReview.changesTitle'); body = t('eventReview.changesBody');
  } else if (status === 'rejected') {
    tone = 'danger'; icon = 'times-circle'; title = t('eventReview.rejectedTitle'); body = t('eventReview.rejectedBody');
  } else if (status === 'active' && review?.reviewedAt) {
    tone = 'success'; icon = 'check-circle'; title = t('eventReview.publishedTitle'); body = t('eventReview.publishedBody');
  } else {
    return null;
  }
  if (compact && status !== 'changes_requested' && status !== 'rejected') return null;

  const palette = TONES[tone];
  const resubmittable = canResubmitEvent(campaign);
  const permanent = status === 'rejected' && !resubmittable;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  function confirmResubmit() {
    Alert.alert(t('eventReview.resubmitConfirmTitle'), t('eventReview.resubmitConfirmBody'), [
      { text: t('eventReview.cancel'), style: 'cancel' },
      { text: t('eventReview.resubmitConfirm'), onPress: resubmit },
    ]);
  }

  async function resubmit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await campaignService.resubmitForReview(campaign.id);
      void queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      void queryClient.invalidateQueries({ queryKey: ['campaign-review-history', campaign.id] });
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const showFeedback = !!review?.feedback && (status === 'changes_requested' || status === 'rejected' || status === 'pending_approval');

  return (
    <View style={[s.wrap, { backgroundColor: palette.bg, borderColor: palette.border }]} accessibilityRole="summary">
      <View style={s.headRow}>
        <FontAwesome5 name={icon} solid size={16} color={palette.fg} />
        <Text style={[s.title, { color: palette.fg }]}>{title}</Text>
      </View>
      <Text style={[s.body, { color: '#1F2937' }]}>{compact ? t('eventReview.editingHint') : body}</Text>

      {showFeedback && (
        <View style={[s.feedbackCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.feedbackLabel, { color: C.textSecondary }]}>
            {status === 'rejected' ? t('eventReview.reasonLabel') : t('eventReview.feedbackLabel')}
          </Text>
          <Text style={[s.feedbackText, { color: C.text }]} selectable>{review!.feedback}</Text>
          {review?.reviewedAt && (
            <Text style={[s.meta, { color: C.textSecondary }]}>{t('eventReview.reviewedOn', { date: fmtDate(review.reviewedAt) })}</Text>
          )}
        </View>
      )}

      {permanent && <Text style={[s.note, { color: TONES.danger.fg }]}>{t('eventReview.permanent')}</Text>}
      {!!error && <Text style={[s.note, { color: TONES.danger.fg }]}>{error}</Text>}

      {!compact && resubmittable && (
        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.85 }]}
            onPress={() => router.push({ pathname: '/edit-campaign', params: { campaignId: campaign.id } })}
            accessibilityRole="button">
            <FontAwesome5 name="edit" size={13} color="#fff" />
            <Text style={s.primaryTxt}>{t('eventReview.editAndResubmit')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.secondaryBtn, { borderColor: C.border, backgroundColor: C.surface }, pressed && { opacity: 0.7 }]}
            onPress={confirmResubmit}
            disabled={busy}
            accessibilityRole="button">
            {busy ? <ActivityIndicator size="small" color={C.text} /> : (
              <Text style={[s.secondaryTxt, { color: C.text }]}>{t('eventReview.resubmitAsIs')}</Text>
            )}
          </Pressable>
        </View>
      )}

      {!compact && (review?.revision ?? 0) > 0 && (
        <Pressable onPress={() => setShowHistory((v) => !v)} hitSlop={8} style={s.historyToggle} accessibilityRole="button">
          <FontAwesome5 name="history" size={12} color={C.textSecondary} />
          <Text style={[s.historyToggleTxt, { color: C.textSecondary }]}>{t('eventReview.historyTitle')}</Text>
          <FontAwesome5 name={showHistory ? 'chevron-up' : 'chevron-down'} size={10} color={C.textSecondary} />
        </Pressable>
      )}
      {showHistory && history.data && (
        <View style={[s.historyList, { borderLeftColor: C.border }]}>
          {history.data.map((h) => (
            <View key={h.id} style={s.historyItem}>
              <Text style={[s.historyAction, { color: C.text }]}>
                {t(`eventReview.history${h.action}`)}
                <Text style={{ color: C.textSecondary, fontFamily: F.regular }}> · {fmtDate(h.createdAt)}</Text>
              </Text>
              {!!h.feedback && <Text style={[s.historyFeedback, { color: C.textSecondary }]}>{h.feedback}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { fontFamily: F.bold, fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md) },
  body: { fontFamily: F.regular, fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  feedbackCard: { borderWidth: 1, borderRadius: RADIUS.sm, padding: SPACING.md, gap: 6, marginTop: SPACING.xs },
  feedbackLabel: { fontFamily: F.semibold, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.4 },
  feedbackText: { fontFamily: F.regular, fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md) },
  meta: { fontFamily: F.regular, fontSize: FONT_SIZE.xs },
  note: { fontFamily: F.semibold, fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  primaryBtn: { minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full },
  primaryTxt: { color: '#fff', fontFamily: F.bold, fontSize: FONT_SIZE.sm },
  secondaryBtn: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full, borderWidth: 1 },
  secondaryTxt: { fontFamily: F.semibold, fontSize: FONT_SIZE.sm },
  historyToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs, alignSelf: 'flex-start' },
  historyToggleTxt: { fontFamily: F.semibold, fontSize: FONT_SIZE.xs },
  historyList: { borderLeftWidth: 1, paddingLeft: SPACING.md, gap: SPACING.sm },
  historyItem: { gap: 2 },
  historyAction: { fontFamily: F.semibold, fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  historyFeedback: { fontFamily: F.regular, fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm) },
});
