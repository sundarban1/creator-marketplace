import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, FONT_SIZE, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';
import { formatNpr, type PaymentBreakdown } from './paymentBreakdown';

const GREEN = '#16A34A';

/**
 * Business "Confirm payment" breakdown — one layout whether Kolab charges the
 * platform fee or waives it:
 *   creator → creator's rate → Kolab fee (always shown; struck through when
 *   waived) → VAT on the fee → prominent total → what the creator receives.
 * All amounts come from the backend breakdown; nothing is computed here.
 */
export function PaymentBreakdownCard({
  breakdown,
  creatorName,
  creatorAvatar,
}: {
  breakdown: PaymentBreakdown;
  creatorName?: string | null;
  creatorAvatar?: string | null;
}) {
  const C = useAppColors();
  const dark = useIsDark();
  const { t } = useLanguage();
  const b = breakdown;
  const muted = C.textPlaceholder;
  const greenTint = dark ? 'rgba(22,163,74,0.16)' : '#F0FDF4';
  const totalTint = dark ? 'rgba(255,255,255,0.05)' : '#F8FAFC';
  const initial = (creatorName ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={{ gap: SPACING.md }}>
      {/* Creator + waiver pill */}
      <View style={s.creatorRow}>
        {creatorAvatar ? (
          <Image source={{ uri: creatorAvatar }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={[s.avatar, s.avatarFallback, { backgroundColor: C.primaryLight }]}>
            <Text style={[s.avatarTxt, { color: C.brinjal1 }]}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.creatorName, { color: C.text }]} numberOfLines={1}>{creatorName || '—'}</Text>
          <Text style={[s.caption, { color: muted }]}>{t('payBreakdown.selectedCreator')}</Text>
        </View>
        {b.feeWaived && (
          <View style={[s.pill, { backgroundColor: greenTint }]}>
            <FontAwesome5 name="tag" solid size={10} color={GREEN} />
            <Text style={[s.pillTxt, { color: GREEN }]}>{t('payBreakdown.noPlatformFee')}</Text>
          </View>
        )}
      </View>

      {/* Breakdown */}
      <View style={[s.box, { borderColor: C.border }]}>
        <Text style={[s.boxTitle, { color: C.text }]}>{t('payBreakdown.title')}</Text>

        <Row
          label={t('payBreakdown.creatorRate')}
          sub={t('payBreakdown.creatorRateSub')}
          value={<Text style={[s.value, { color: C.text }]}>{formatNpr(b.creatorRate)}</Text>}
        />

        <Row
          label={t('payBreakdown.platformFee')}
          sub={t('payBreakdown.platformFeeSub', { pct: b.standardFeePercent })}
          subStruck={b.feeWaived}
          value={b.feeWaived ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.struck, { color: muted }]}>{formatNpr(b.standardFee)}</Text>
              <Text style={[s.value, { color: GREEN }]}>{formatNpr(0)}</Text>
            </View>
          ) : (
            <Text style={[s.value, { color: C.text }]}>{formatNpr(b.platformFee)}</Text>
          )}
        />

        <Row
          label={t('payBreakdown.vat')}
          sub={b.taxApplicable ? t('payBreakdown.vatSub', { pct: b.taxPercent }) : t('payBreakdown.notApplicable')}
          value={<Text style={[s.value, { color: b.taxApplicable ? C.text : muted }]}>{formatNpr(b.tax)}</Text>}
          last
        />

        {/* Total — the most prominent figure */}
        <View style={[s.totalBox, { backgroundColor: totalTint }]}>
          <View style={s.rowBetween}>
            <Text style={[s.totalLabel, { color: C.text }]}>{t('payBreakdown.total')}</Text>
            <Text style={[s.totalValue, { color: C.text }]}>{formatNpr(b.total)}</Text>
          </View>
          {b.feeWaived && (
            <View style={s.waivedNote}>
              <FontAwesome5 name="check-circle" solid size={11} color={GREEN} />
              <Text style={[s.caption, { color: GREEN, fontFamily: F.semibold }]}>{t('payBreakdown.notCharged')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Creator earnings — kept apart from Kolab's charges */}
      <View style={[s.receiveBox, { backgroundColor: greenTint }]}>
        <View style={s.rowBetween}>
          <View style={s.receiveHead}>
            <View style={[s.receiveIcon, { backgroundColor: dark ? 'rgba(22,163,74,0.25)' : '#DCFCE7' }]}>
              <FontAwesome5 name="user-check" solid size={11} color={GREEN} />
            </View>
            <Text style={[s.rowLabel, { color: C.text }]}>{t('payBreakdown.creatorReceives')}</Text>
          </View>
          <Text style={[s.value, { color: GREEN, fontSize: FONT_SIZE.md }]}>{formatNpr(b.creatorReceives)}</Text>
        </View>
        <Text style={[s.receiveNote, { color: C.textSecondary }]}>{t('payBreakdown.creatorReceivesNote')}</Text>
      </View>
    </View>
  );
}

function Row({ label, sub, subStruck, value, last }: { label: string; sub: string; subStruck?: boolean; value: React.ReactNode; last?: boolean }) {
  const C = useAppColors();
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
      <View style={{ flex: 1, paddingRight: SPACING.md }}>
        <Text style={[s.rowLabel, { color: C.text }]}>{label}</Text>
        <Text style={[s.caption, { color: C.textPlaceholder }, subStruck && s.strikeLine]}>{sub}</Text>
      </View>
      {value}
    </View>
  );
}

const s = StyleSheet.create({
  creatorRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar:         { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarTxt:      { fontFamily: F.bold, fontSize: FONT_SIZE.lg },
  creatorName:    { fontFamily: F.bold, fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md) },
  caption:        { fontFamily: F.regular, fontSize: 12, lineHeight: lineHeightFor(12) },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  pillTxt:        { fontFamily: F.bold, fontSize: FONT_SIZE.xs },
  box:            { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  boxTitle:       { fontFamily: F.bold, fontSize: FONT_SIZE.sm, marginBottom: 2 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  rowBetween:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel:       { fontFamily: F.semibold, fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  value:          { fontFamily: F.bold, fontSize: FONT_SIZE.sm },
  struck:         { fontFamily: F.regular, fontSize: 12, textDecorationLine: 'line-through' },
  strikeLine:     { textDecorationLine: 'line-through' },
  totalBox:       { borderRadius: RADIUS.sm, padding: SPACING.md, marginTop: SPACING.xs },
  totalLabel:     { fontFamily: F.bold, fontSize: FONT_SIZE.md },
  totalValue:     { fontFamily: F.extrabold, fontSize: FONT_SIZE.xl },
  waivedNote:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  receiveBox:     { borderRadius: RADIUS.md, padding: SPACING.lg, gap: 6 },
  receiveHead:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  receiveIcon:    { width: 24, height: 24, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  receiveNote:    { fontFamily: F.regular, fontSize: 12, lineHeight: lineHeightFor(12) },
});
