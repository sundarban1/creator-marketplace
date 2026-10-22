// Shared bits for the business "Manage competition" screen: tone notices,
// stat tiles, creator avatar, and the reason / deadline bottom sheets that back
// the pause / cancel / close / extend controls (web: ReasonDialog, DeadlineDialog).
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { FormErrorBanner } from '@/components/FieldError';
import { withAlpha } from '@/utilities/color';
import { F, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';
import { DateTimeField } from '@/features/business/competition/DateTimeField';

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';
const NOTICE: Record<NoticeTone, { color: string; icon: keyof typeof FontAwesome5.glyphMap }> = {
  info:    { color: TabColors.info.color,     icon: 'info-circle' },
  warning: { color: TabColors.warning.color,  icon: 'exclamation-triangle' },
  danger:  { color: TabColors.danger.color,   icon: 'times-circle' },
  success: { color: TabColors.positive.color, icon: 'check-circle' },
};

export function Notice({ tone, title, text, quote, quoteLabel }: { tone: NoticeTone; title?: string; text: string; quote?: string | null; quoteLabel?: string }) {
  const C = useAppColors();
  const n = NOTICE[tone];
  return (
    <View style={[s.notice, { borderColor: withAlpha(n.color, 0.3), backgroundColor: withAlpha(n.color, 0.07) }]} accessibilityRole="alert">
      <FontAwesome5 name={n.icon} solid size={15} color={n.color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 3 }}>
        {!!title && <Text style={[s.noticeTitle, { color: C.text }]}>{title}</Text>}
        <Text style={[s.noticeText, { color: title ? C.textSecondary : C.text }]}>{text}</Text>
        {!!quote && (
          <View style={[s.quote, { backgroundColor: C.surface, borderColor: C.border }]}>
            {!!quoteLabel && <Text style={[s.quoteLabel, { color: C.textSecondary }]}>{quoteLabel}</Text>}
            <Text style={[s.noticeText, { color: C.text }]}>{quote}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function StatTile({ label, value, icon, color }: { label: string; value: number; icon: keyof typeof FontAwesome5.glyphMap; color: string }) {
  const C = useAppColors();
  return (
    <View style={[s.stat, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[s.statIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
        <FontAwesome5 name={icon} solid size={13} color={color} />
      </View>
      <Text style={[s.statValue, { color: C.text }]}>{value}</Text>
      <Text style={[s.statLabel, { color: C.textSecondary }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export function CreatorAvatar({ uri, size = 36 }: { uri: string | null; size?: number }) {
  const C = useAppColors();
  return uri
    ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
    : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome5 name="user" solid size={size * 0.4} color={C.brinjal1} />
      </View>
    );
}

/** Reason prompt — required (cancel, reopen results) or optional (pause, close). */
export function ReasonSheet({ visible, title, message, label, confirmLabel, optional, danger, onClose, onConfirm }: {
  visible: boolean; title: string; message: string; label: string; confirmLabel: string;
  optional?: boolean; danger?: boolean;
  onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  const missing = !optional && !reason.trim();

  function close() { setReason(''); setError(''); setTried(false); onClose(); }
  async function confirm() {
    setTried(true);
    if (missing) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={title}
      footer={
        <View style={s.footer}>
          <View style={{ flex: 1 }}><Button label={t('common.cancel')} variant="secondary" onPress={close} disabled={busy} /></View>
          <View style={{ flex: 1 }}><Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={() => void confirm()} loading={busy} /></View>
        </View>
      }>
      <View style={{ gap: SPACING.md }}>
        <Text style={[s.body, { color: C.textSecondary }]}>{message}</Text>
        <TextInputWithLabel
          label={label}
          required={!optional}
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={500}
          error={tried && missing ? t('comp.reasonRequired') : undefined}
        />
        {!!error && <FormErrorBanner message={error} />}
      </View>
    </BottomSheet>
  );
}

/** New deadline picker (Nepal time) — extend registration / stage, reopen a stage. */
export function DeadlineSheet({ visible, title, message, current, confirmLabel, onClose, onConfirm }: {
  visible: boolean; title: string; message?: string; current?: string | null; confirmLabel: string;
  onClose: () => void; onConfirm: (iso: string) => Promise<void>;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  // Default: the current deadline if it's still ahead, else 3 days from now.
  const [value, setValue] = useState(() => (current && new Date(current) > new Date() ? current : new Date(Date.now() + 3 * 86_400_000).toISOString()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (new Date(value) <= new Date()) { setError(t('comp.scheduleFuture')); return; }
    setBusy(true);
    setError('');
    try {
      await onConfirm(value);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={s.footer}>
          <View style={{ flex: 1 }}><Button label={t('common.cancel')} variant="secondary" onPress={onClose} disabled={busy} /></View>
          <View style={{ flex: 1 }}><Button label={confirmLabel} onPress={() => void confirm()} loading={busy} /></View>
        </View>
      }>
      <View style={{ gap: SPACING.md }}>
        {!!message && <Text style={[s.body, { color: C.textSecondary }]}>{message}</Text>}
        <DateTimeField label={t('comp.deadline')} value={value} onChange={(v) => { setValue(v); setError(''); }} />
        {!!error && <FormErrorBanner message={error} />}
      </View>
    </BottomSheet>
  );
}

export const shared = StyleSheet.create({
  meta:   { fontSize: 12, fontFamily: F.regular, lineHeight: lineHeightFor(12) },
  small:  { fontSize: 13, fontFamily: F.regular, lineHeight: lineHeightFor(13) },
  strong: { fontSize: 14, fontFamily: F.semibold, lineHeight: lineHeightFor(14) },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card:   { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8 },
});

const s = StyleSheet.create({
  notice:      { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  noticeTitle: { fontSize: 14, fontFamily: F.semibold, lineHeight: lineHeightFor(14) },
  noticeText:  { fontSize: 13, fontFamily: F.regular, lineHeight: lineHeightFor(13) },
  quote:       { marginTop: 6, borderWidth: 1, borderRadius: RADIUS.md, padding: 10, gap: 2 },
  quoteLabel:  { fontSize: 11, fontFamily: F.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  stat:        { flex: 1, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: 4 },
  statIcon:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statValue:   { fontSize: 22, fontFamily: F.bold, lineHeight: lineHeightFor(22) },
  statLabel:   { fontSize: 12, fontFamily: F.medium, lineHeight: lineHeightFor(12) },
  footer:      { flexDirection: 'row', gap: 10 },
  body:        { fontSize: 14, fontFamily: F.regular, lineHeight: lineHeightFor(14) },
});
