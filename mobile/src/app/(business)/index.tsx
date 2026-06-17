import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import { useAppColors } from '@/context/ThemeContext';
import { COLORS } from '@/utilities/constants';
import { campaignService } from '@/services/campaign';
import { notificationService } from '@/services/notifications';
import type { Campaign } from '@/types';

const CATEGORY_META: Record<string, { emoji: string; cardBg: string }> = {
  Fashion:    { emoji: '👗', cardBg: '#F2DCF0' },
  Food:       { emoji: '🍽️', cardBg: '#F2E6DC' },
  Tech:       { emoji: '💻', cardBg: '#DCE6F2' },
  Beauty:     { emoji: '✨', cardBg: '#DCF2E6' },
  Travel:     { emoji: '✈️', cardBg: '#F2F2DC' },
  Fitness:    { emoji: '💪', cardBg: '#DCF2EE' },
  Lifestyle:  { emoji: '🌿', cardBg: '#E6F2DC' },
  Gaming:     { emoji: '🎮', cardBg: '#E6DCF2' },
  Music:      { emoji: '🎵', cardBg: '#F2DCE6' },
  Education:  { emoji: '📚', cardBg: '#FDEFD0' },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? { emoji: '📣', cardBg: '#F2F0DC' };
}

const STATUS_STYLE = {
  active: { bg: '#EEF9F3', color: COLORS.active,  label: 'Active' },
  draft:  { bg: '#F4F4F4', color: COLORS.closed,  label: 'Paused' },
  closed: { bg: '#FEF3C7', color: COLORS.draft,   label: 'Closed' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function BusinessHomeScreen() {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const C = useAppColors();
  const name = user?.name?.split(' ')[0] ?? 'there';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [notifBadge, setNotifBadge] = useState(0);
  const notifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    notificationService.getBadge().then((r) => setNotifBadge(r.count)).catch(() => {});
    notifPollRef.current = setInterval(() => {
      notificationService.getBadge().then((r) => setNotifBadge(r.count)).catch(() => {});
    }, 30000);
    return () => { if (notifPollRef.current) clearInterval(notifPollRef.current); };
  }, []);

  useFocusEffect(useCallback(() => {
    notificationService.getBadge().then((r) => setNotifBadge(r.count)).catch(() => {});
  }, []));

  async function fetchCampaigns(showLoader = true) {
    if (showLoader) setLoading(true);
    setFetchError('');
    try {
      const { campaigns: data } = await campaignService.listMy();
      setCampaigns(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void fetchCampaigns(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCampaigns(false);
  }, []);

  // Derive stats from real data
  const stats = {
    active:    campaigns.filter((c) => c.status === 'active').length,
    total:     campaigns.length,
    proposals: campaigns.reduce((sum, c) => sum + c.proposals, 0),
    completed: campaigns.filter((c) => c.status === 'closed').length,
  };

    type StatCard = { iconName: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string; value: string; label: string };
  const STATS_CARDS: StatCard[] = [
    { iconName: 'megaphone',      iconBg: '#EEF2FF', iconColor: '#4F46E5', value: String(stats.active),    label: 'Active\nCampaigns' },
    { iconName: 'people',         iconBg: '#F0FDF4', iconColor: '#059669', value: String(stats.proposals),  label: 'Total\nProposals' },
    { iconName: 'folder',         iconBg: '#FDF4FF', iconColor: '#7C3AED', value: String(stats.total),      label: 'All\nCampaigns' },
    { iconName: 'checkmark-done', iconBg: '#FFF7ED', iconColor: '#D97706', value: String(stats.completed),  label: 'Completed' },
  ];

  const recent = campaigns.slice(0, 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuBtn} onPress={openDrawer}>
              <Ionicons name="menu" size={26} color={C.text} />
            </Pressable>
            <View>
              <Text style={[styles.greeting, { color: C.textSecondary }]}>{getGreeting()}, 👋</Text>
              <View style={styles.nameRow}>
                <Text style={[styles.brandName, { color: C.text }]} numberOfLines={1}>{user?.name ?? 'Business'}</Text>
                <View style={[styles.rolePill, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.rolePillText, { color: C.brinjal1 }]}>Business</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.bellWrap} onPress={() => router.push('/(business)/notifications')}>
              <Ionicons name={notifBadge > 0 ? 'notifications' : 'notifications-outline'} size={22} color={C.text} />
              {notifBadge > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{notifBadge > 99 ? '99+' : notifBadge}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={[styles.avatarCircle, { backgroundColor: C.brinjal1 }]} onPress={() => router.push('/(business)/profile')}>
              <Text style={styles.avatarText}>
                {(user?.name ?? 'B').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Create Campaign card ── */}
        <View style={[styles.createCard, { backgroundColor: C.primaryLight }]}>
          <View style={[styles.createIconWrap, { backgroundColor: C.brinjal1 }]}>
            <Ionicons name="megaphone" size={22} color="#fff" />
          </View>
          <View style={styles.createText}>
            <Text style={[styles.createTitle, { color: C.text }]}>Create a Campaign</Text>
            <Text style={[styles.createSub, { color: C.textSecondary }]}>Post a promotion or collaboration opportunity.</Text>
          </View>
          <Pressable
            style={[styles.createBtn, { backgroundColor: C.brinjal1 }]}
            onPress={() => router.push('/create-campaign')}>
            <Text style={styles.createBtnText}>+ New</Text>
          </Pressable>
        </View>

        {/* ── Error ── */}
        {fetchError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable onPress={() => fetchCampaigns()}>
              <Text style={[styles.retryText, { color: C.brinjal1 }]}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Stats ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Overview</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading your data…</Text>
          </View>
        ) : (
          <>
            <View style={[styles.statsRow, { backgroundColor: C.surface }]}>
              {STATS_CARDS.map((s, i) => (
                <View key={s.label} style={[styles.statItem, i < STATS_CARDS.length - 1 && { borderRightWidth: 1, borderRightColor: C.border }]}>
                  <View style={[styles.statIconBox, { backgroundColor: s.iconBg }]}>
                    <Ionicons name={s.iconName} size={15} color={s.iconColor} />
                  </View>
                  <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Find creators banner ── */}
            <Pressable style={[styles.findBanner, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(business)/explore-creators')}>
              <Text style={styles.findEmoji}>🧑‍🎨</Text>
              <Text style={[styles.findTitle, { color: C.text }]}>Explore Creators</Text>
              <Ionicons name="chevron-forward" size={18} color={C.brinjal1} style={{ marginLeft: 'auto' }} />
            </Pressable>

            {/* ── Recent Campaigns ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Campaigns</Text>
              <Pressable onPress={() => router.push('/(business)/campaigns')}>
                <Text style={[styles.viewAll, { color: C.brinjal1 }]}>View all</Text>
              </Pressable>
            </View>

            {recent.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="document-text" size={48} color={C.textSecondary} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>No campaigns yet</Text>
                <Text style={[styles.emptyHint, { color: C.textSecondary }]}>Create your first campaign to start working with creators.</Text>
                <Pressable style={[styles.emptyBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.push('/create-campaign')}>
                  <Text style={styles.emptyBtnText}>Create Campaign</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.campaignList}>
                {recent.map((c) => {
                  const meta = getCategoryMeta(c.category);
                  const st = STATUS_STYLE[c.status ?? 'draft'] ?? STATUS_STYLE.draft;
                  return (
                    <Pressable
                      key={c.id}
                      style={({ pressed }) => [styles.campaignCard, { backgroundColor: C.surface }, pressed && { opacity: 0.9 }]}
                      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>
                      <View style={[styles.thumb, { backgroundColor: meta.cardBg }]}>
                        <Text style={styles.thumbEmoji}>{meta.emoji}</Text>
                      </View>
                      <View style={styles.campaignBody}>
                        <View style={styles.campaignTitleRow}>
                          <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={1}>{c.title}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                          </View>
                        </View>
                        <Text style={[styles.campaignMeta, { color: C.textSecondary }]}>{c.platform} · {c.budget}</Text>
                        <View style={styles.campaignStats}>
                          <View style={styles.campaignStat}>
                            <Ionicons name="people" size={12} color={C.textSecondary} />
                            <Text style={[styles.campaignStatVal, { color: C.text }]}>{c.proposals}</Text>
                            <Text style={[styles.campaignStatLabel, { color: C.textSecondary }]}>Proposals</Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={C.border} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuBtn: { padding: 4 },
  greeting: { fontSize: 12, marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 18, fontWeight: '800', maxWidth: 180 },
  rolePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellWrap: { padding: 4, position: 'relative' },
  bellBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  createCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginBottom: 28, padding: 16, gap: 12 },
  createIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  createText: { flex: 1 },
  createTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  createSub: { fontSize: 11, lineHeight: 16 },
  createBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexShrink: 0 },
  createBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  errorCard: { backgroundColor: '#FEE2E2', marginHorizontal: 20, marginBottom: 16, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  retryText: { fontSize: 13, fontWeight: '700', marginLeft: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  viewAll: { fontSize: 13, fontWeight: '600' },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14 },

  statsRow: { flexDirection: 'row', borderRadius: 16, marginHorizontal: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  statIconBox: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },

  findBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 20, marginBottom: 24, paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  findEmoji: { fontSize: 18 },
  findTitle: { fontSize: 14, fontWeight: '700' },

  campaignList: { paddingHorizontal: 20, gap: 12 },
  campaignCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  thumb: { width: 72, height: 72, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  thumbEmoji: { fontSize: 28 },
  campaignBody: { flex: 1, gap: 4 },
  campaignTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  campaignTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  campaignMeta: { fontSize: 12 },
  campaignStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  campaignStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  campaignStatVal: { fontSize: 11, fontWeight: '700' },
  campaignStatLabel: { fontSize: 11 },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
