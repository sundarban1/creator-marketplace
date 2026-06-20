import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import { useAppColors } from '@/context/ThemeContext';
import { COLORS, F } from '@/utilities/constants';
import { campaignService } from '@/services/campaign';
import { useNotificationBadge } from '@/context/NotificationContext';
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
  active: { bg: '#DCFCE7', color: '#16A34A',  label: '🟢 Active' },
  draft:  { bg: '#F1F5F9', color: '#64748B',  label: '⏸ Paused' },
  closed: { bg: '#FEF9C3', color: '#CA8A04',  label: '🏁 Closed' },
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

  const { badgeCount: notifBadge, setBadgeCount } = useNotificationBadge();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

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

  // Refresh badge count from server every time this screen comes into focus
  // so socket-missed notifications (favorites, accepted requests) always appear
  useFocusEffect(useCallback(() => {
    notificationService.getBadge().then((r) => setBadgeCount(r.count)).catch(() => {});
  }, []));

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

        {/* ── Gradient header ── */}
        <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.menuBtn} onPress={openDrawer}>
                <Ionicons name="menu" size={26} color="#fff" />
              </Pressable>
              <View>
                <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.75)', fontFamily: F.medium }]}>नमस्ते 🙏</Text>
                <View style={styles.nameRow}>
                  <Text style={[styles.brandName, { color: '#fff' }]} numberOfLines={1}>{user?.name ?? 'Business'}</Text>
                  <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.rolePillText, { color: '#fff' }]}>Business</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={[styles.bellWrap, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 8 }]} onPress={() => router.push('/(business)/notifications')}>
                <Ionicons name={notifBadge > 0 ? 'notifications' : 'notifications-outline'} size={22} color="#fff" />
                {notifBadge > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{notifBadge > 99 ? '99+' : notifBadge}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }]} onPress={() => router.push('/(business)/profile')}>
                <Text style={[styles.avatarText, { color: '#fff' }]}>
                  {(user?.name ?? 'B').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Create Campaign card ── */}
          <View style={styles.createCard}>
            <View style={styles.createIconWrap}>
              <Ionicons name="megaphone" size={22} color="#F97316" />
            </View>
            <View style={styles.createText}>
              <Text style={[styles.createTitle, { color: '#fff' }]}>Create a Campaign</Text>
              <Text style={[styles.createSub, { color: 'rgba(255,255,255,0.75)' }]}>Post a promotion or collaboration opportunity.</Text>
            </View>
            <Pressable
              style={styles.createBtn}
              onPress={() => router.push('/create-campaign')}>
              <Text style={styles.createBtnText}>+ New</Text>
            </Pressable>
          </View>
        </LinearGradient>

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
            <Pressable style={styles.findBanner} onPress={() => router.push('/(business)/explore-creators')}>
              <Text style={styles.findEmoji}>🧑‍🎨</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.findTitle, { color: '#059669' }]}>Explore Creators</Text>
                <Text style={[styles.findSub, { color: '#059669' }]}>for your next campaign</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#059669" />
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
                      style={({ pressed }) => [styles.campaignCard, { backgroundColor: C.surface, borderLeftWidth: 4, borderLeftColor: st.color }, pressed && { opacity: 0.9 }]}
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

  gradientHeader: { paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuBtn: { padding: 4 },
  greeting: { fontSize: 13, marginBottom: 2, fontFamily: F.regular },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 19, fontFamily: F.extrabold, maxWidth: 180 },
  rolePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontFamily: F.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellWrap: { position: 'relative' },
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#F97316', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  createCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, marginHorizontal: 20, padding: 16, gap: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  createIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.2)' },
  createText: { flex: 1 },
  createTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3, fontFamily: F.bold },
  createSub: { fontSize: 11, lineHeight: 16, fontFamily: F.regular },
  createBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, flexShrink: 0, backgroundColor: '#F97316' },
  createBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  errorCard: { backgroundColor: '#FEE2E2', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText: { fontSize: 13, fontWeight: '700', marginLeft: 12, fontFamily: F.bold },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', fontFamily: F.extrabold },
  viewAll: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  statsRow: { flexDirection: 'row', borderRadius: 20, marginHorizontal: 20, marginBottom: 20, shadowColor: '#4F46E5', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18, paddingHorizontal: 4 },
  statIconBox: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2, fontFamily: F.extrabold },
  statLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13, fontFamily: F.medium },

  findBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  findEmoji: { fontSize: 22 },
  findTitle: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  findSub:   { fontSize: 11, fontFamily: F.regular, marginTop: 1 },

  campaignList: { paddingHorizontal: 20, gap: 12 },
  campaignCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4, overflow: 'hidden' },
  thumb: { width: 72, height: 72, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  thumbEmoji: { fontSize: 28 },
  campaignBody: { flex: 1, gap: 5 },
  campaignTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  campaignTitle: { fontSize: 14, fontWeight: '700', flex: 1, fontFamily: F.bold },
  statusBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  campaignMeta: { fontSize: 12, fontFamily: F.regular },
  campaignStats: { flexDirection: 'row', gap: 8, marginTop: 2 },
  campaignStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  campaignStatVal: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  campaignStatLabel: { fontSize: 11, fontFamily: F.regular },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: F.bold },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: F.bold },
});
