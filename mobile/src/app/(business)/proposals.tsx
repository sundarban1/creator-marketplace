import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

type Proposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedRate: string;
  coverLetter: string;
  createdAt: string;
  campaign: { id: string; title: string; platform: string; campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT' };
  creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
};

type CampaignCard = {
  id: string;
  title: string;
  platform: string;
  campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  latestAt: string;
};

type TabKey = 'all' | 'paid' | 'free';

const PAID_ACCENT = '#4F46E5';
const FREE_ACCENT = '#059669';
const PAID_LIGHT  = '#EEF2FF';
const FREE_LIGHT  = '#F0FDF4';

function buildCampaignCards(proposals: Proposal[]): CampaignCard[] {
  const map = new Map<string, CampaignCard>();
  for (const p of proposals) {
    const { id, title, platform, campaignType } = p.campaign;
    if (!map.has(id)) {
      map.set(id, { id, title, platform, campaignType, total: 0, pending: 0, accepted: 0, rejected: 0, latestAt: p.createdAt });
    }
    const c = map.get(id)!;
    c.total++;
    c[p.status]++;
    if (p.createdAt > c.latestAt) c.latestAt = p.createdAt;
  }
  return Array.from(map.values()).sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

function CampaignEventCard({ item }: { item: CampaignCard }) {
  const C = useAppColors();
  const isFree   = item.campaignType === 'OPEN_EVENT';
  const accent   = isFree ? FREE_ACCENT : PAID_ACCENT;
  const accentBg = isFree ? FREE_LIGHT  : PAID_LIGHT;

  function handlePress() {
    router.push({
      pathname: '/(business)/campaign-proposals',
      params: {
        campaignId:    item.id,
        campaignTitle: item.title,
        campaignType:  item.campaignType,
        platform:      item.platform,
      },
    });
  }

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderLeftColor: accent }]}
      onPress={handlePress}>
      {/* Type + platform row */}
      <View style={styles.cardTopRow}>
        <View style={[styles.typeBadge, { backgroundColor: accentBg }]}>
          <Ionicons name={isFree ? 'gift-outline' : 'cash-outline'} size={12} color={accent} />
          <Text style={[styles.typeBadgeText, { color: accent }]}>
            {isFree ? 'Free Event' : 'Paid Campaign'}
          </Text>
        </View>
        {item.platform ? (
          <View style={[styles.platformPill, { backgroundColor: C.background }]}>
            <Text style={[styles.platformText, { color: C.textSecondary }]}>{item.platform}</Text>
          </View>
        ) : null}
        <View style={styles.cardTopSpacer} />
        <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: C.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: C.text }]}>{item.total}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#D97706' }]}>{item.pending}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#16A34A' }]}>{item.accepted}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{isFree ? 'Approved' : 'Accepted'}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#EF4444' }]}>{item.rejected}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Declined</Text>
        </View>
      </View>

      {/* Pending action nudge */}
      {item.pending > 0 && (
        <View style={[styles.nudge, { backgroundColor: '#FFF7ED' }]}>
          <Ionicons name="time-outline" size={13} color="#D97706" />
          <Text style={[styles.nudgeText, { color: '#D97706' }]}>
            {item.pending} application{item.pending !== 1 ? 's' : ''} awaiting review
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ProposalsScreen() {
  const C = useAppColors();
  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState<TabKey>('all');

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { proposals: data } = await campaignService.getBusinessProposals({ limit: 500 });
      setProposals(data);
    } catch { /* empty state shows */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { void load(); }, []);
  const onRefresh = useCallback(() => void load(true), []);

  const allCards  = buildCampaignCards(proposals);
  const paidCards = allCards.filter((c) => c.campaignType === 'PAID_CAMPAIGN');
  const freeCards = allCards.filter((c) => c.campaignType === 'OPEN_EVENT');

  const cards = activeTab === 'paid' ? paidCards : activeTab === 'free' ? freeCards : allCards;

  const tabs: { key: TabKey; label: string; count: number; color: string }[] = [
    { key: 'all',  label: 'All',       count: allCards.length,  color: '#7C3AED' },
    { key: 'paid', label: 'Paid',      count: paidCards.length, color: PAID_ACCENT },
    { key: 'free', label: 'Free',      count: freeCards.length, color: FREE_ACCENT },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient
        colors={['#1e1b4b', '#4338ca', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}>
        <View style={[styles.decCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.decCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={styles.headerContent}>
          <Text style={styles.pageTitle}>Proposals</Text>
          <Text style={styles.pageSub}>Review creator applications by campaign</Text>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}>
              <View style={styles.tabInner}>
                <Text style={[styles.tabLabel, { color: active ? tab.color : C.textSecondary }]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? tab.color : C.border }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? '#fff' : C.textSecondary }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </View>
              {active && <View style={[styles.tabUnderline, { backgroundColor: tab.color }]} />}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, cards.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          renderItem={({ item }) => <CampaignEventCard item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={56} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>No proposals yet</Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                {activeTab === 'paid'
                  ? 'No paid campaign proposals yet.'
                  : activeTab === 'free'
                  ? 'No free event proposals yet.'
                  : 'Proposals from creators will appear here when they apply to your campaigns.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  gradientHeader: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  decCircle1:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -70, right: -40 },
  decCircle2:     { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -35, left: 15 },
  headerContent:  { paddingHorizontal: 20, paddingTop: 16, gap: 4 },
  pageTitle:      { fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  pageSub:        { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular },

  tabBar:       { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem:      { flex: 1, alignItems: 'center' },
  tabInner:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  tabLabel:     { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  tabBadge:     { borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: F.bold },
  tabUnderline: { height: 2.5, width: '60%', borderRadius: 2 },

  list:      { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  cardTopSpacer: { flex: 1 },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  platformPill:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  platformText:  { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },

  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, paddingHorizontal: 16, paddingBottom: 12, fontFamily: F.bold },

  statsRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  statItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statNum:     { fontSize: 18, fontWeight: '800', fontFamily: F.extrabold },
  statLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', fontFamily: F.semibold },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },

  nudge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  nudgeText: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', fontFamily: F.bold },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
