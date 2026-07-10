import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { RangeDropdown } from '@/components/RangeDropdown';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BarChart } from '@/components/charts/BarChart';
import { StackedBar } from '@/components/charts/StackedBar';
import {
  analyticsService, type ApiBrandAnalytics, type AnalyticsRange,
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

function StatTile({ icon, label, value, C }: {
  icon: string; label: string; value: string;
  C: ReturnType<typeof useAppColors>;
}) {
  return (
    <View style={[s.tile, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[s.tileIconWrap, { backgroundColor: C.primaryLight }]}>
        <Ionicons name={icon as never} size={17} color={C.brinjal1} />
      </View>
      <Text style={[s.tileValue, { color: C.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[s.tileLabel, { color: C.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function BusinessAnalyticsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();

  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<ApiBrandAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((r: AnalyticsRange, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    return analyticsService.getBusinessAnalytics(r)
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
  const status = data?.campaignStatus;
  const spendingChart = (data?.charts.monthlySpending ?? []).map((row) => ({ label: fmtBucket(row.bucket), value: row.amount }));
  const applicationsChart = (data?.charts.applicationsReceived ?? []).map((row) => ({ label: fmtBucket(row.bucket), value: row.count }));
  const statusSegments = status ? [
    { label: t('analytics.active'),    value: status.active,    color: C.active },
    { label: t('analytics.draft'),     value: status.draft,     color: C.draft },
    { label: t('analytics.paused'),    value: status.paused,    color: C.accent },
    { label: t('analytics.closed'),    value: status.closed,    color: C.closed },
    { label: t('analytics.cancelled'), value: status.cancelled, color: C.error },
  ] : [];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradientTopBar}>
        <View style={s.topBar}>
          <BackButton fallback="/(business)/" />
          <Text style={[s.topTitle, { color: '#fff' }]}>{t('analytics.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <View style={s.rangeRow}>
        <RangeDropdown
          value={range}
          options={RANGES.map((r) => ({ value: r.value, label: t(r.labelKey) }))}
          onChange={handleRangeChange}
        />
      </View>

      {loading || !data || !totals || !status ? (
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
            <StatTile icon="megaphone-outline" label={t('analytics.totalEvents')} value={totals.campaignsCreated.toLocaleString()} C={C} />
            <StatTile icon="trending-up-outline" label={t('analytics.activeEvents')} value={totals.activeCampaigns.toLocaleString()} C={C} />
            <StatTile icon="checkmark-circle-outline" label={t('analytics.completedEvents')} value={totals.completedCampaigns.toLocaleString()} C={C} />
            <StatTile icon="wallet-outline" label={t('analytics.totalSpend')} value={fmtCurrency(totals.totalSpend)} C={C} />
            <StatTile icon="send-outline" label={t('analytics.applicationsReceived')} value={totals.applicationsReceived.toLocaleString()} C={C} />
            <StatTile icon="person-add-outline" label={t('analytics.creatorsHired')} value={totals.creatorsHired.toLocaleString()} C={C} />
            <StatTile icon="star-outline" label={t('analytics.avgRatingGiven')} value={totals.averageRatingGiven.toFixed(1)} C={C} />
            <StatTile icon="time-outline" label={t('analytics.responseTime')} value={`${totals.responseTimeAvgMins} min`} C={C} />
          </View>

          {/* Monthly spending */}
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.monthlySpending')}</Text>
            <BarChart data={spendingChart} valueFormatter={(v) => `Rs.${Math.round(v / 1000)}k`} barColor={C.accent} />
          </View>

          {/* Applications received */}
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.applicationsReceived')}</Text>
            <BarChart data={applicationsChart} />
          </View>

          {/* Event status breakdown */}
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.cardTitle, { color: C.text }]}>{t('analytics.eventStatusBreakdown')}</Text>
            <StackedBar segments={statusSegments} />
          </View>
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

  rangeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 14 },

  content: { padding: 16, paddingTop: 0, paddingBottom: 32, gap: 16 },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:        { width: '47%', borderRadius: 18, borderWidth: 1, padding: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tileIconWrap:{ width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tileValue:   { fontSize: 19, fontWeight: '700', fontFamily: F.bold },
  tileLabel:   { fontSize: 11, fontFamily: F.medium },

  card:      { borderRadius: 18, padding: 18, gap: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
});
