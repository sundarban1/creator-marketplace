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
      setFetchError(e instanceof Error ? e.message : 'Failed to load events');
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

    type StatCard = { iconName: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string; value: string; label: string; onPress: () => void };
  const STATS_CARDS: StatCard[] = [
    { iconName: 'megaphone-outline', iconBg: '#EEF2FF', iconColor: '#4F46E5', value: String(stats.active),    label: 'Active\nEvents', onPress: () => router.push('/(business)/campaigns') },
    { iconName: 'document-text-outline', iconBg: '#F0FDF4', iconColor: '#059669', value: String(stats.proposals), label: 'Total\nProposals', onPress: () => router.push('/(business)/proposals') },
    { iconName: 'folder-open-outline', iconBg: '#FDF4FF', iconColor: '#7C3AED', value: String(stats.total), label: 'All\nEvents', onPress: () => router.push('/(business)/campaigns') },
    { iconName: 'checkmark-done-circle-outline', iconBg: '#FFF7ED', iconColor: '#D97706', value: String(stats.completed), label: 'Completed', onPress: () => router.push('/(business)/campaigns') },
  ];

  const [typeFilter, setTypeFilter] = useState<'All' | 'Paid' | 'Open'>('All');

  const TYPE_TABS = [
    { key: 'All'  as const, label: 'All'        },
    { key: 'Paid' as const, label: 'Paid'       },
    { key: 'Open' as const, label: 'Open (Free)' },
  ];

  function matchesType(c: Campaign) {
    if (typeFilter === 'All')  return true;
    if (typeFilter === 'Paid') return !c.campaignType || c.campaignType === 'PAID_CAMPAIGN';
    return c.campaignType === 'OPEN_EVENT';
  }

  const recent = campaigns.filter(matchesType).slice(0, 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}>

        {/* ── Gradient header ── */}
        <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
          {/* Decorative background circles */}
          <View style={styles.decCircleLarge} />
          <View style={styles.decCircleMid} />
          <View style={styles.decCircleSmall} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.menuBtn} onPress={openDrawer}>
                <View style={styles.menuBtnInner}>
                  <Ionicons name="menu" size={22} color="#fff" />
                </View>
              </Pressable>
              <View>
                <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.7)' }]}>नमस्ते 🙏</Text>
                <Text style={[styles.brandName, { color: '#fff' }]} numberOfLines={1}>{user?.name ?? 'Business'}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Pressable style={styles.notifBtn} onPress={() => router.push('/(business)/notifications')}>
                <Ionicons name={notifBadge > 0 ? 'notifications' : 'notifications-outline'} size={20} color="rgba(255,255,255,0.9)" />
                {notifBadge > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{notifBadge > 99 ? '99+' : notifBadge}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)' }]} onPress={() => router.push('/(business)/profile')}>
                <Text style={[styles.avatarText, { color: '#fff' }]}>
                  {(user?.name ?? 'B').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </Pressable>
            </View>
          </View>

        </LinearGradient>

        {/* ── Create Campaign card ── */}
        <Pressable
          style={[styles.createCard, { backgroundColor: C.surface }]}
          onPress={() => router.push('/create-campaign')}>
          <LinearGradient colors={['#F97316', '#EF4444']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.createIconWrap}>
            <Ionicons name="megaphone" size={22} color="#fff" />
          </LinearGradient>
          <View style={styles.createText}>
            <Text style={[styles.createTitle, { color: C.text }]}>Create an Event</Text>
            <Text style={[styles.createSub, { color: C.textSecondary }]}>Post a promotion or collaboration opportunity</Text>
          </View>
          <View style={[styles.createArrow, { backgroundColor: C.primaryLight }]}>
            <Ionicons name="add" size={20} color={C.brinjal1} />
          </View>
        </Pressable>

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
                <Pressable key={s.label} style={({ pressed }) => [styles.statItem, i < STATS_CARDS.length - 1 && { borderRightWidth: 1, borderRightColor: C.border }, pressed && { opacity: 0.75 }]} onPress={s.onPress}>
                  <View style={[styles.statIconBox, { backgroundColor: s.iconBg }]}>
                    <Ionicons name={s.iconName} size={16} color={s.iconColor} />
                  </View>
                  <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* ── Find creators banner ── */}
            <Pressable style={styles.findBanner} onPress={() => router.push('/(business)/explore-creators')}>
              <Text style={styles.findEmoji}>🧑‍🎨</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.findTitle, { color: '#059669' }]}>Explore Creators</Text>
                <Text style={[styles.findSub, { color: '#059669' }]}>for your next event</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#059669" />
            </Pressable>

            {/* ── Recent Events header + type tabs ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Events</Text>
              <Pressable onPress={() => router.push('/(business)/campaigns')}>
                <Text style={[styles.viewAll, { color: C.brinjal1 }]}>View all</Text>
              </Pressable>
            </View>

            <View style={[styles.typeFilterWrap, { borderBottomColor: C.border }]}>
              <View style={styles.typeFilterRow}>
                {TYPE_TABS.map(({ key, label }) => {
                  const active = typeFilter === key;
                  return (
                    <Pressable
                      key={key}
                      style={styles.typeFilterTab}
                      onPress={() => setTypeFilter(key)}>
                      <Text style={[styles.typeFilterLabel, { color: active ? C.brinjal1 : C.textSecondary, fontWeight: active ? '700' : '500' }]}>{label}</Text>
                      {active && <View style={[styles.typeFilterUnderline, { backgroundColor: C.brinjal1 }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {recent.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="document-text" size={48} color={C.textSecondary} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>No events yet</Text>
                <Text style={[styles.emptyHint, { color: C.textSecondary }]}>Create your first event to start working with creators.</Text>
                <Pressable style={[styles.emptyBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.push('/create-campaign')}>
                  <Text style={styles.emptyBtnText}>Create Event</Text>
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
                          <View style={[styles.typeBadge, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeFree : styles.typeBadgePaid]}>
                            <Text style={[styles.typeBadgeText, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeTextFree : styles.typeBadgeTextPaid]}>
                              {c.campaignType === 'OPEN_EVENT' ? 'Free' : '$ Paid'}
                            </Text>
                          </View>
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

  gradientHeader: { paddingBottom: 14, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  decCircleLarge: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60 },
  decCircleMid:   { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: 'rgba(167,139,250,0.15)', bottom: 10,  left: -30 },
  decCircleSmall: { position: 'absolute', width: 70,  height: 70,  borderRadius: 35,  backgroundColor: 'rgba(255,255,255,0.07)', top: 30,    left: '45%' as unknown as number },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuBtn: { padding: 0 },
  menuBtnInner: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  notifBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  greeting: { fontSize: 12, marginBottom: 3, fontFamily: F.medium },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 19, fontFamily: F.extrabold, maxWidth: 180 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#a78bfa' },
  rolePillText: { fontSize: 11, fontFamily: F.semibold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#F97316', borderRadius: 6, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
  bellBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  createCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, marginHorizontal: 20, marginTop: 16, marginBottom: 4, padding: 16, gap: 14, shadowColor: '#F97316', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  createIconWrap: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  createText: { flex: 1, gap: 2 },
  createTitle: { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  createSub: { fontSize: 12, lineHeight: 17, fontFamily: F.regular },
  createArrow: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  errorCard: { backgroundColor: '#FEE2E2', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText: { fontSize: 13, fontWeight: '700', marginLeft: 12, fontFamily: F.bold },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', fontFamily: F.extrabold },
  viewAll: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  statsRow: { flexDirection: 'row', borderRadius: 20, marginHorizontal: 20, marginBottom: 16, shadowColor: '#4F46E5', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18, paddingHorizontal: 4 },
  statIconBox: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2, fontFamily: F.extrabold },
  statLabel: { fontSize: 10, textAlign: 'center', lineHeight: 13, fontFamily: F.medium },

  findBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  findEmoji: { fontSize: 22 },
  findTitle: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  findSub:   { fontSize: 11, fontFamily: F.regular, marginTop: 1 },

  typeFilterWrap: { borderBottomWidth: 1, marginBottom: 12 },
  typeFilterRow: { flexDirection: 'row', paddingHorizontal: 20 },
  typeFilterTab: { paddingVertical: 12, marginRight: 24, position: 'relative' as const },
  typeFilterLabel: { fontSize: 14, fontFamily: F.medium },
  typeFilterUnderline: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 2.5, borderRadius: 2 },

  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgePaid: { backgroundColor: '#EEF2FF' },
  typeBadgeFree: { backgroundColor: '#F0FDF4' },
  typeBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: F.bold },
  typeBadgeTextPaid: { color: '#4F46E5' },
  typeBadgeTextFree: { color: '#059669' },

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
