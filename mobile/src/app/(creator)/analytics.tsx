import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BarChart } from '@/components/charts/BarChart';
import {
  analyticsService, type ApiCreatorAnalytics, type AnalyticsRange,
} from '@/services/analytics';
import { F } from '@/utilities/constants';

const RANGES: { value: AnalyticsRange; labelKey: string }[] = [
  { value: '7d',   labelKey: 'analytics.range7d' },
  { value: '30d',  labelKey: 'analytics.range30d' },
  { value: '90d',  labelKey: 'analytics.range90d' },
  { value: '12mo', labelKey: 'analytics.range12mo' },
  { value: 'all',  labelKey: 'analytics.rangeAll' },
];

function fmtCurrency(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString()}`;
}

function fmtBucket(bucket: string): string {
  const parts = bucket.split('-');
  if (parts.length === 3) {
    return new Date(bucket).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const [y, m] = parts;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

function StatTile({ icon, label, value, sub, C }: {
  icon: string; label: string; value: string; sub?: string;
  C: ReturnType<typeof useAppColors>;
}) {
  return (
    <View style={[s.tile, { backgroundColor: C.surface }]}>
      <View style={[s.tileIconWrap, { backgroundColor: C.primaryLight }]}>
        <Ionicons name={icon as never} size={16} color={C.brinjal1} />
      </View>
      <Text style={[s.tileValue, { color: C.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[s.tileLabel, { color: C.textSecondary }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[s.tileSub, { color: C.active }]}>{sub}</Text> : null}
    </View>
  );
}

export default function CreatorAnalyticsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();

  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<ApiCreatorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((r: AnalyticsRange, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    return analyticsService.getCreatorAnalytics(r)
      .then(setData)
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(range); }, [range, load]));

  function handleRangeChange(r: AnalyticsRange) {
    setRange(r);
    load(r);
  }

  const totals = data?.totals;
  const breakdown = data?.campaignBreakdown;
  const referrals = data?.referrals;
  const earningsChart = (data?.charts.earningsTrend ?? []).map((row) => ({ label: fmtBucket(row.bucket), value: row.amount }));
  const activityChart = breakdown ? [
    { label: t('analytics.invited'),   value: breakdown.invitationsReceived },
    { label: t('analytics.submitted'), value: breakdown.applicationsSubmitted },
    { label: t('analytics.accepted'),  value: breakdown.accepted },
    { label: t('analytics.active'),    value: breakdown.active },
    { label: t('analytics.completed'), value: breakdown.completed },
  ] : [];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradientTopBar}>
        <View style={s.topBar}>
          <BackButton fallback="/(creator)/" />
          <Text style={[s.topTitle, { color: '#fff' }]}>{t('analytics.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <View style={s.rangeRow}>
        {RANGES.map((r) => {
          const active = range === r.value;
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={r.value}
              style={[s.rangeChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}
              onPress={() => handleRangeChange(r.value)}>
              <Text style={[s.rangeChipText, { color: active ? C.brinjal1 : C.textSecondary, fontWeight: active ? '700' : '500' }]}>
                {t(r.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading || !data || !totals || !breakdown || !referrals ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(range, true)} tintColor={C.brinjal1} />}
        >
          {/* Stat grid */}
          <View style={s.grid}>
            <StatTile icon="wallet-outline" label={t('analytics.totalEarnings')} value={fmtCurrency(totals.totalEarnings)} C={C} />
            <StatTile icon="hourglass-outline" label={t('analytics.pendingEarnings')} value={fmtCurrency(totals.pendingEarnings)} C={C} />
            <StatTile
              icon="eye-outline"
              label={t('analytics.profileViews')}
              value={totals.profileViewsLast30Days.toLocaleString()}
              sub={`${totals.profileViewsTrendPct >= 0 ? '+' : ''}${totals.profileViewsTrendPct}%`}
              C={C}
            />
            <StatTile icon="checkmark-circle-outline" label={t('analytics.profileCompletion')} value={`${totals.profileCompletion.percent}%`} C={C} />
            <StatTile icon="star-outline" label={t('analytics.averageRating')} value={totals.averageRating.toFixed(1)} C={C} />
            <StatTile icon="time-outline" label={t('analytics.responseTime')} value={`${totals.responseTimeAvgMins} min`} C={C} />
            <StatTile icon="trending-up-outline" label={t('analytics.completionRate')} value={`${totals.completionRate}%`} C={C} />
            <StatTile icon="send-outline" label={t('analytics.applicationsSubmitted')} value={totals.applicationsSubmitted.toLocaleString()} C={C} />
          </View>

          {/* Earnings trend */}
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.earningsTrend')}</Text>
            <BarChart data={earningsChart} valueFormatter={(v) => `Rs.${Math.round(v / 1000)}k`} />
          </View>

          {/* Campaign activity */}
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.campaignActivity')}</Text>
            <BarChart data={activityChart} barColor={C.active} />
          </View>

          {/* Referrals */}
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.referralProgram')}</Text>
            <View style={s.referralGrid}>
              <View style={s.referralItem}>
                <Text style={[s.referralValue, { color: C.text }]}>{referrals.totalInvites}</Text>
                <Text style={[s.referralLabel, { color: C.textSecondary }]}>{t('analytics.totalInvites')}</Text>
              </View>
              <View style={s.referralItem}>
                <Text style={[s.referralValue, { color: C.text }]}>{referrals.successfulReferrals}</Text>
                <Text style={[s.referralLabel, { color: C.textSecondary }]}>{t('analytics.successfulReferrals')}</Text>
              </View>
              <View style={s.referralItem}>
                <Text style={[s.referralValue, { color: C.text }]}>{referrals.pendingRewards}</Text>
                <Text style={[s.referralLabel, { color: C.textSecondary }]}>{t('analytics.pendingRewards')}</Text>
              </View>
              <View style={s.referralItem}>
                <Text style={[s.referralValue, { color: C.text }]}>{fmtCurrency(referrals.rewardsEarned)}</Text>
                <Text style={[s.referralLabel, { color: C.textSecondary }]}>{t('analytics.rewardsEarned')}</Text>
              </View>
            </View>
          </View>

          {totals.profileCompletion.missing.length > 0 && (
            <View style={[s.card, { backgroundColor: C.surface }]}>
              <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.missingSections')}</Text>
              <View style={s.missingWrap}>
                {totals.profileCompletion.missing.map((m) => (
                  <View key={m} style={[s.missingChip, { backgroundColor: C.accentLight }]}>
                    <Text style={[s.missingChipText, { color: C.accent }]}>{m}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:  { fontSize: 16, fontWeight: '700', fontFamily: F.bold },

  rangeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  rangeChip:     { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  rangeChipText: { fontSize: 12, fontFamily: F.regular },

  content: { padding: 16, paddingTop: 0, paddingBottom: 32, gap: 12 },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile:        { width: '47%', borderRadius: 14, padding: 12, gap: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tileIconWrap:{ width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tileValue:   { fontSize: 17, fontWeight: '700', fontFamily: F.bold },
  tileLabel:   { fontSize: 11, fontFamily: F.medium },
  tileSub:     { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  card:      { borderRadius: 16, padding: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },

  referralGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  referralItem:  { width: '47%', gap: 2 },
  referralValue: { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  referralLabel: { fontSize: 11, fontFamily: F.medium },

  missingWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  missingChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  missingChipText: { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
});
