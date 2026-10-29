import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheet } from '@/components/BottomSheet';
import { AppModal } from '@/components/AppModal';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { campaignService, type DeliverableDeadlineInfo, type DeliverableExtension } from '@/services/campaign';
import { F, MIN_TOUCH_TARGET, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';

// Missed-deadline card for the activity timeline (creator + business).
// The deliverable's status (overdue / deadline missed) is shown separately
// from the proposal (still accepted) and from the refund's own status — a
// refund is never described as done until its transfer is confirmed.

const EXTENSION_CHOICES = [12, 24, 36, 48]; // hours from now; backend caps at 48

export type DeadlineCardApp = DeliverableDeadlineInfo & {
  id: string;
  engagementState: string | null;
  contentDeadline: string | null;
  contentGraceDeadline: string | null;
};

export function isDeadlineCardState(app: Pick<DeadlineCardApp, 'engagementState' | 'deliverableClosedAt'>): boolean {
  const s = app.engagementState;
  if (s === 'CONTENT_OVERDUE' || s === 'CREATOR_FAILED') return true;
  return !!app.deliverableClosedAt && ['REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(s ?? '');
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function DeliverableDeadlineCard({
  app,
  isCreator,
  counterpartName,
  onChanged,
}: {
  app: DeadlineCardApp;
  isCreator: boolean;
  counterpartName: string;
  onChanged: (message: string) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [sheet, setSheet] = useState<'none' | 'request' | 'reject'>('none');
  const [confirm, setConfirm] = useState<'none' | 'approve' | 'cancel'>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState('');
  const [hours, setHours] = useState(24);
  // "Now" captured when the request sheet opens, so the preview time is stable.
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  const overdue = app.engagementState === 'CONTENT_OVERDUE';
  const pending: DeliverableExtension | null = app.extensions.find((e) => e.status === 'PENDING') ?? null;
  const usedStandard = app.extensions.some((e) => e.kind === 'STANDARD') || app.extensionCount > 0;
  const decisionDue = app.contentGraceDeadline ?? pending?.decisionDueAt ?? null;
  const original = app.originalContentDeadline ?? app.contentDeadline;
  const refund = app.refundRequest;

  async function run(fn: () => Promise<void>, okMsg: string, close: () => void) {
    setBusy(true);
    setError('');
    try {
      await fn();
      close();
      setReason('');
      setPreview('');
      onChanged(okMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('deadlineCard.genericError'));
    } finally {
      setBusy(false);
    }
  }

  const title = overdue
    ? (isCreator ? t('deadlineCard.overdueTitleCreator') : t('deadlineCard.overdueTitleBiz'))
    : (isCreator ? t('deadlineCard.closedTitleCreator') : t('deadlineCard.closedTitleBiz'));
  const body = overdue
    ? (isCreator ? t('deadlineCard.overdueBodyCreator') : t('deadlineCard.overdueBodyBiz', { date: fmt(original), due: fmt(decisionDue) }))
    : (isCreator ? t('deadlineCard.closedBodyCreator') : t('deadlineCard.closedBodyBiz', { name: counterpartName }));

  return (
    <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={s.headerRow}>
        <View style={[s.iconBg, { backgroundColor: '#FEF2F2' }]}>
          <FontAwesome5 name="calendar-times" solid size={18} color="#DC2626" />
        </View>
        <Text style={[s.title, { color: C.text }]}>{title}</Text>
      </View>
      <Text style={[s.body, { color: C.textSecondary }]}>{body}</Text>
      {isCreator && overdue && <Text style={[s.small, { color: C.textSecondary }]}>{t('deadlineCard.originalDeadline', { date: fmt(original) })}</Text>}
      {isCreator && !overdue && <Text style={[s.small, { color: C.textSecondary }]}>{t('deadlineCard.newAgreementNote')}</Text>}

      {!!error && sheet === 'none' && confirm === 'none' && <Text style={s.error}>{error}</Text>}

      {/* ── Overdue: extension request / decision ── */}
      {overdue && pending && (
        <View style={[s.box, { borderColor: C.border }]}>
          <Text style={[s.boxTitle, { color: C.text }]}>{t('deadlineCard.extRequestTitle')}</Text>
          {isCreator ? (
            <Text style={[s.body, { color: C.textSecondary }]}>
              {t('deadlineCard.extensionPendingCreator', { date: fmt(pending.proposedDeadline), due: fmt(pending.decisionDueAt) })}
            </Text>
          ) : (
            <>
              <Text style={[s.body, { color: C.text }]}>{t('deadlineCard.extRequestedUntil', { date: fmt(pending.proposedDeadline) })}</Text>
              <Text style={[s.body, { color: C.textSecondary }]}>{t('deadlineCard.extReason')}: {pending.reason}</Text>
              {!!pending.previewUrl && (
                <Pressable onPress={() => Linking.openURL(pending.previewUrl!)} hitSlop={10} accessibilityRole="link">
                  <Text style={[s.link, { color: C.brinjal1 }]}>{t('deadlineCard.extPreview')} ›</Text>
                </Pressable>
              )}
              <Text style={[s.small, { color: '#DC2626', fontFamily: F.semibold }]}>{t('deadlineCard.decideBy', { date: fmt(pending.decisionDueAt) })}</Text>
              <View style={s.row}>
                <Btn label={t('deadlineCard.approve')} color={C.brinjal1} onPress={() => { setError(''); setConfirm('approve'); }} disabled={busy} />
                <Btn label={t('deadlineCard.reject')} color="#DC2626" outline onPress={() => { setError(''); setSheet('reject'); }} disabled={busy} />
              </View>
            </>
          )}
        </View>
      )}

      {overdue && !pending && isCreator && (
        usedStandard ? (
          <Text style={[s.small, { color: C.textSecondary, marginTop: SPACING.md }]}>{t('deadlineCard.extensionUsed')}</Text>
        ) : (
          <View style={{ marginTop: SPACING.md }}>
            <Btn label={t('deadlineCard.requestExtension')} color={C.brinjal1} onPress={() => { setError(''); setOpenedAt(Date.now()); setSheet('request'); }} />
            {!!decisionDue && <Text style={[s.small, { color: '#DC2626', fontFamily: F.semibold }]}>{t('deadlineCard.requestBy', { date: fmt(decisionDue) })}</Text>}
          </View>
        )
      )}

      {overdue && !isCreator && (
        <View style={{ marginTop: SPACING.md }}>
          <Btn label={t('deadlineCard.cancelRefund')} color="#DC2626" outline onPress={() => { setError(''); setConfirm('cancel'); }} disabled={busy} />
        </View>
      )}

      {/* ── Refund status (business) ── */}
      {!isCreator && !overdue && refund && (
        <View style={[s.box, { borderColor: C.border, backgroundColor: refund.status === 'COMPLETED' ? '#ECFDF5' : '#EFF6FF' }]}>
          <Text style={[s.body, { color: '#111827' }]}>
            {t(`deadlineCard.refund${refund.status}`, { ref: refund.referenceCode, amount: `Rs. ${refund.amount.toLocaleString()}` })}
          </Text>
        </View>
      )}

      {/* ── History ── */}
      <View style={[s.history, { borderTopColor: C.border }]}>
        <Text style={[s.boxTitle, { color: C.text }]}>{t('deadlineCard.history')}</Text>
        <HistoryRow label={t('deadlineCard.histOriginal')} value={fmt(original)} />
        {!!app.contentOverdueAt && <HistoryRow label={t('deadlineCard.histOverdue')} value={fmt(app.contentOverdueAt)} />}
        {[...app.extensions].reverse().map((e) => (
          <HistoryRow
            key={e.id}
            label={t('deadlineCard.histExtension', { status: t(`deadlineCard.extStatus${e.status}`) })}
            value={fmt(e.approvedDeadline ?? e.proposedDeadline)}
          />
        ))}
      </View>

      {/* ── Creator: request extension ── */}
      <BottomSheet visible={sheet === 'request'} onClose={() => setSheet('none')} title={t('deadlineCard.modalTitle')}>
        <Text style={[s.body, { color: C.textSecondary, marginBottom: SPACING.md }]}>{t('deadlineCard.modalHint', { hours: 48 })}</Text>
        <TextInputWithLabel label={t('deadlineCard.fieldReason')} value={reason} onChangeText={setReason} multiline placeholder={t('deadlineCard.fieldReasonPlaceholder')} />
        <Text style={[s.boxTitle, { color: C.text, marginTop: SPACING.lg }]}>{t('deadlineCard.fieldNewDate')}</Text>
        <View style={s.chips}>
          {EXTENSION_CHOICES.map((h) => {
            const on = h === hours;
            return (
              <Pressable
                key={h}
                onPress={() => setHours(h)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[s.chip, { borderColor: on ? C.brinjal1 : C.border, backgroundColor: on ? C.primaryLight : 'transparent' }]}
              >
                <Text style={[s.chipText, { color: on ? C.brinjal1 : C.text }]}>{t('deadlineCard.hoursChip', { hours: h })}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[s.small, { color: C.textSecondary }]}>{t('deadlineCard.submitBy', { date: fmt(new Date(openedAt + hours * 3_600_000).toISOString()) })}</Text>
        <View style={{ marginTop: SPACING.lg }}>
          <TextInputWithLabel label={t('deadlineCard.fieldPreview')} value={preview} onChangeText={setPreview} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        </View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <View style={{ marginTop: SPACING.lg }}>
          <Btn
            label={t('deadlineCard.submitRequest')}
            color={C.brinjal1}
            loading={busy}
            disabled={reason.trim().length < 10}
            onPress={() => run(
              () => campaignService.requestExtension(app.id, {
                reason: reason.trim(),
                proposedDeadline: new Date(Date.now() + hours * 3_600_000).toISOString(),
                previewUrl: preview.trim() || undefined,
              }),
              t('deadlineCard.requestSent'),
              () => setSheet('none'),
            )}
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && <Text style={[s.small, { color: C.textSecondary }]}>{t('deadlineCard.reasonTooShort')}</Text>}
        </View>
      </BottomSheet>

      {/* ── Business: reject extension ── */}
      <BottomSheet visible={sheet === 'reject'} onClose={() => setSheet('none')} title={t('deadlineCard.rejectTitle')}>
        <Text style={[s.body, { color: C.textSecondary, marginBottom: SPACING.md }]}>{t('deadlineCard.rejectBody')}</Text>
        <TextInputWithLabel label={t('deadlineCard.rejectReason')} value={reason} onChangeText={setReason} multiline />
        {!!error && <Text style={s.error}>{error}</Text>}
        <View style={{ marginTop: SPACING.lg }}>
          <Btn
            label={t('deadlineCard.reject')}
            color="#DC2626"
            loading={busy}
            disabled={reason.trim().length < 3 || !pending}
            onPress={() => pending && run(() => campaignService.rejectExtension(app.id, pending.id, reason.trim()), t('deadlineCard.rejected'), () => setSheet('none'))}
          />
        </View>
      </BottomSheet>

      <AppModal
        visible={confirm === 'approve'}
        type="info"
        icon="calendar-check"
        title={t('deadlineCard.approveConfirmTitle')}
        body={t('deadlineCard.approveConfirmBody', { date: fmt(pending?.proposedDeadline) })}
        warning={error || undefined}
        confirmLabel={t('deadlineCard.approve')}
        loading={busy}
        onConfirm={() => pending && run(() => campaignService.approveExtension(app.id, pending.id), t('deadlineCard.approved'), () => setConfirm('none'))}
        onCancel={() => setConfirm('none')}
      />
      <AppModal
        visible={confirm === 'cancel'}
        type="danger"
        icon="calendar-times"
        title={t('deadlineCard.cancelConfirmTitle')}
        body={t('deadlineCard.cancelConfirmBody')}
        warning={error || undefined}
        confirmLabel={t('deadlineCard.cancelRefund')}
        loading={busy}
        onConfirm={() => run(() => campaignService.cancelOverdue(app.id), t('deadlineCard.cancelled'), () => setConfirm('none'))}
        onCancel={() => setConfirm('none')}
      />
    </View>
  );
}

/** Small notice above the upload step once an extension is in force. */
export function ExtendedDeadlineNotice({ extensionCount, contentDeadline }: { extensionCount: number; contentDeadline: string | null }) {
  const { t } = useLanguage();
  if (extensionCount < 1 || !contentDeadline) return null;
  return (
    <View style={[s.notice]}>
      <FontAwesome5 name="exclamation-triangle" size={12} color="#B45309" />
      <Text style={s.noticeText}>{t('deadlineCard.extendedFinal', { date: fmt(contentDeadline) })}</Text>
    </View>
  );
}

function HistoryRow({ label, value }: { label: string; value: string }) {
  const C = useAppColors();
  return (
    <View style={s.historyRow}>
      <Text style={[s.small, { color: C.text, flex: 1 }]}>{label}</Text>
      <Text style={[s.small, { color: C.textSecondary }]}>{value}</Text>
    </View>
  );
}

function Btn({ label, color, onPress, disabled, loading, outline }: {
  label: string; color: string; onPress: () => void; disabled?: boolean; loading?: boolean; outline?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [
        s.btn,
        outline ? { borderWidth: 1.5, borderColor: color, backgroundColor: 'transparent' } : { backgroundColor: color },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading
        ? <ActivityIndicator color={outline ? color : '#FFFFFF'} />
        : <Text style={[s.btnText, { color: outline ? color : '#FFFFFF' }]}>{label}</Text>}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card:       { borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, padding: SPACING.lg, marginTop: SPACING.md },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  iconBg:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title:      { flex: 1, fontFamily: F.semibold, fontSize: 16, lineHeight: lineHeightFor(16) },
  body:       { fontFamily: F.regular, fontSize: 14, lineHeight: lineHeightFor(14), marginTop: 2 },
  small:      { fontFamily: F.regular, fontSize: 12, lineHeight: lineHeightFor(12), marginTop: SPACING.xs },
  link:       { fontFamily: F.semibold, fontSize: 14, lineHeight: lineHeightFor(14), marginTop: SPACING.xs },
  box:        { borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  boxTitle:   { fontFamily: F.semibold, fontSize: 13, lineHeight: lineHeightFor(13), marginBottom: SPACING.xs },
  row:        { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn:        { flex: 1, minHeight: MIN_TOUCH_TARGET, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  btnText:    { fontFamily: F.semibold, fontSize: 14, lineHeight: lineHeightFor(14) },
  error:      { color: '#DC2626', fontFamily: F.medium, fontSize: 13, lineHeight: lineHeightFor(13), marginTop: SPACING.sm },
  history:    { borderTopWidth: StyleSheet.hairlineWidth, marginTop: SPACING.lg, paddingTop: SPACING.md },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  chip:       { minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full, borderWidth: 1.5, justifyContent: 'center' },
  chipText:   { fontFamily: F.semibold, fontSize: 13, lineHeight: lineHeightFor(13) },
  notice:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#FFF7ED', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  noticeText: { flex: 1, color: '#9A3412', fontFamily: F.medium, fontSize: 13, lineHeight: lineHeightFor(13) },
});
