import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TabSlider } from '@/components/TabSlider';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';
import { isValidNepaliPhone } from '@/utilities/phone';
import { campaignService } from '@/services/campaign';
import { useNotificationBadge } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import { profileService } from '@/services/profile';
import type { Campaign } from '@/types';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { TabColors } from '@/utilities/tabColors';

const STATUS_STYLE = {
  active: { bg: TabColors.positive.bg, color: TabColors.positive.color, statusKey: 'business.home.statusActive' as const },
  draft:  { bg: TabColors.warning.bg,  color: TabColors.warning.color,  statusKey: 'business.home.statusPaused' as const },
  closed: { bg: TabColors.closed.bg,   color: TabColors.closed.color,   statusKey: 'business.home.statusClosed' as const },
};

export default function BusinessHomeScreen() {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const { categories: allCategories } = useAllCategories();
  const name = user?.name?.split(' ')[0] ?? 'there';

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return t('business.home.goodMorning');
    if (h < 17) return t('business.home.goodAfternoon');
    return t('business.home.goodEvening');
  }

  const { setBadgeCount } = useNotificationBadge();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  // Phone-only signups default `name` to the raw phone number until the user sets
  // a real one — never show that in the header (as text, or as the avatar's
  // first-letter fallback initial, which would render a bare "+").
  const displayName = businessName || (user?.name && !isValidNepaliPhone(user.name) ? user.name : 'Business');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [referralBannerDismissed, setReferralBannerDismissed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress('index', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));

  async function fetchCampaigns(showLoader = true) {
    if (showLoader) setLoading(true);
    setFetchError('');
    try {
      const { campaigns: data } = await campaignService.listMy();
      setCampaigns(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : t('business.home.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchCampaigns();
    profileService.getBusinessProfile()
      .then((profile) => {
        setBusinessName(profile.businessName);
        const missing: string[] = [];
        if (!profile.logoUrl)            missing.push(t('business.home.fieldLogo'));
        if (!profile.description)        missing.push(t('business.home.fieldDescription'));
        if (!profile.location)           missing.push(t('business.home.fieldLocation'));
        if (!profile.categories?.length) missing.push(t('business.home.fieldCategories'));
        if (!profile.website)            missing.push(t('business.home.fieldWebsite'));
        setMissingFields(missing);
      })
      .catch(() => {});
  }, [languageVersion]);

  useFocusEffect(useCallback(() => {
    notificationService.getBadge().then((r) => setBadgeCount(r.count)).catch(() => {});
  }, []));

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) void fetchCampaigns(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectedAt]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCampaigns(false);
  }, []);

  const stats = {
    active:    campaigns.filter((c) => c.status === 'active').length,
    total:     campaigns.length,
    proposals: campaigns.reduce((sum, c) => sum + c.proposals, 0),
    completed: campaigns.filter((c) => c.status === 'closed').length,
  };

  const [typeFilter, setTypeFilter] = useState<'All' | 'Paid' | 'Open'>('All');

  function matchesType(c: Campaign) {
    if (typeFilter === 'All')  return true;
    if (typeFilter === 'Paid') return !c.campaignType || c.campaignType === 'PAID_CAMPAIGN';
    return c.campaignType === 'OPEN_EVENT';
  }

  const paidCount = campaigns.filter((c) => !c.campaignType || c.campaignType === 'PAID_CAMPAIGN').length;
  const openCount = campaigns.filter((c) => c.campaignType === 'OPEN_EVENT').length;

  const TYPE_TABS = [
    { key: 'All',  label: t('business.home.tabAll'),      icon: 'layers-outline' as const,  color: TabColors.neutral.color, count: campaigns.length },
    { key: 'Paid', label: t('business.home.tabPaid'),     icon: 'cash-outline'  as const,   color: TabColors.brand.color,   count: paidCount        },
    { key: 'Open', label: t('business.home.tabOpenFree'), icon: 'gift-outline'  as const,   color: TabColors.info.color,    count: openCount        },
  ];

  const recent = campaigns.filter(matchesType).slice(0, 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}>

        {/* ── Gradient header ── */}
        <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>

          {/* Menu · Greeting · Avatar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.menuBtn} onPress={openDrawer} hitSlop={6}>
                <View style={styles.menuBtnInner}>
                  <Ionicons name="menu" size={22} color="#fff" />
                </View>
              </Pressable>
              <View>
                <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.7)' }]}>{getGreeting()}</Text>
                <Text style={[styles.brandName, { color: '#fff' }]} numberOfLines={1}>{displayName}</Text>
              </View>
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.avatarCircle, { borderColor: 'rgba(255,255,255,0.5)', borderWidth: 2.5 }]} onPress={() => router.push('/(business)/profile')}>
              {/* Clipping lives on its own layer — Android's elevation shadow doesn't
                  composite correctly with overflow:hidden + a translucent child background
                  on the same view. */}
              <View style={styles.avatarClip}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={styles.avatarInitial}>{displayName.trim()[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.statStripItem} onPress={() => router.push('/(business)/campaigns')}>
              <Text style={styles.statStripVal}>{stats.active}</Text>
              <Text style={styles.statStripLabel}>{t('business.home.statStripActive')}</Text>
            </Pressable>
            <View style={styles.statStripDiv} />
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.statStripItem} onPress={() => router.push('/(business)/campaigns')}>
              <Text style={styles.statStripVal}>{stats.total}</Text>
              <Text style={styles.statStripLabel}>{t('business.home.statStripTotal')}</Text>
            </Pressable>
            <View style={styles.statStripDiv} />
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.statStripItem} onPress={() => router.push('/(business)/campaigns')}>
              <Text style={styles.statStripVal}>{stats.completed}</Text>
              <Text style={styles.statStripLabel}>{t('business.home.statStripCompleted')}</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          {([
            { icon: 'add-circle-outline' as const,  label: t('business.home.quickActionCreate'),    bg: '#EDE9FE', color: '#7C3AED', route: '/create-campaign' },
            { icon: 'document-text-outline' as const, label: t('business.home.quickActionProposals'), bg: '#DCFCE7', color: '#059669', route: '/(business)/proposals' },
            { icon: 'chatbubbles-outline'as const,  label: t('business.home.quickActionMessages'),  bg: '#DBEAFE', color: '#2563EB', route: '/(business)/messages' },
            { icon: 'briefcase-outline'  as const,  label: t('business.home.quickActionEvents'),    bg: '#FEF3C7', color: '#D97706', route: '/(business)/campaigns' },
          ]).map(({ icon, label, bg, color, route }) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={label} style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push(route as never)}>
              <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: C.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Profile completion banner ── */}
        {!bannerDismissed && missingFields.length > 0 && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}
            onPress={() => router.push('/(business)/edit-profile' as never)}>
            <View style={[styles.bannerIconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="business-outline" size={20} color={C.brinjal1} />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: C.text }]}>{t('business.home.completeProfile')}</Text>
              <Text style={[styles.bannerSub, { color: C.textSecondary }]} numberOfLines={2}>
                {t('business.home.missingFieldsPrefix', { fields: missingFields.join(' · ') })}
              </Text>
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.bannerClose} onPress={() => setBannerDismissed(true)} hitSlop={10}>
              <Ionicons name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </Pressable>
        )}

        {/* ── Attention banner (shown when proposals are pending) ── */}
        {!loading && stats.proposals > 0 && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.attentionBanner} onPress={() => router.push('/(business)/proposals')}>
            <View style={styles.attentionIconWrap}>
              <Ionicons name="alert-circle" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.attentionTitle}>{t('business.home.attentionTitle')}</Text>
              <Text style={styles.attentionSub}>
                {stats.proposals === 1
                  ? t('business.home.attentionProposalsSingular', { n: stats.proposals })
                  : t('business.home.attentionProposalsPlural', { n: stats.proposals })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </Pressable>
        )}

        {/* ── Error ── */}
        {fetchError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => fetchCampaigns()}>
              <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('business.home.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Find creators banner ── */}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.findBanner} onPress={() => router.push('/(business)/explore-creators')}>
          <View style={styles.findIconWrap}>
            <Ionicons name="people-outline" size={22} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.findTitle, { color: '#059669' }]}>{t('business.home.exploreCreators')}</Text>
            <Text style={[styles.findSub, { color: '#059669' }]}>{t('business.home.exploreCreatorsSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#059669" />
        </Pressable>

        {/* ── Refer a business banner ── */}
        {!referralBannerDismissed && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: '#EC4899' }]}
            onPress={() => router.push('/(business)/refer')}>
            <View style={[styles.bannerIconBox, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="gift-outline" size={20} color="#EC4899" />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: C.text }]}>{t('businessReferral.homeBannerTitle')}</Text>
              <Text style={[styles.bannerSub, { color: C.textSecondary }]} numberOfLines={1}>{t('businessReferral.homeBannerSub')}</Text>
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.bannerClose} onPress={() => setReferralBannerDismissed(true)} hitSlop={10}>
              <Ionicons name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </Pressable>
        )}

        {/* ── Recent Events ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('business.home.recentEvents')}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => router.push('/(business)/campaigns')}>
            <Text style={[styles.viewAll, { color: C.brinjal1 }]}>{t('business.home.viewAll')}</Text>
          </Pressable>
        </View>

        <View style={[styles.typeFilterWrap, { backgroundColor: C.surface }]}>
          <TabSlider
            tabs={TYPE_TABS}
            active={typeFilter}
            onChange={(k) => setTypeFilter(k as typeof typeFilter)}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('business.home.loading')}</Text>
          </View>
        ) : recent.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text" size={48} color={C.textSecondary} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>{t('business.home.noEventsTitle')}</Text>
            <Text style={[styles.emptyHint, { color: C.textSecondary }]}>{t('business.home.noEventsSub')}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.emptyBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.push('/create-campaign')}>
              <Text style={styles.emptyBtnText}>{t('business.home.createEventBtn')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.campaignList}>
            {recent.map((c) => {
              const meta = getCategoryMeta(allCategories, c.categoryKey ?? c.category);
              const st = STATUS_STYLE[c.status ?? 'draft'] ?? STATUS_STYLE.draft;
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={c.id}
                  style={({ pressed }) => [styles.campaignCard, { backgroundColor: C.surface, borderLeftWidth: 4, borderLeftColor: st.color }, pressed && { opacity: 0.9 }]}
                  onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>
                  <View style={[styles.thumb, { backgroundColor: meta.bg }]}>
                    <FontAwesome5 name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={styles.campaignBody}>
                    <View style={styles.campaignTitleRow}>
                      <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={1}>{c.title}</Text>
                      <View style={[styles.typeBadge, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeFree : styles.typeBadgePaid]}>
                        <Text style={[styles.typeBadgeText, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeTextFree : styles.typeBadgeTextPaid]}>
                          {c.campaignType === 'OPEN_EVENT' ? t('business.home.badgeFree') : t('business.home.badgePaid')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{t(st.statusKey)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.campaignMeta, { color: C.textSecondary }]}>{c.platform} · {c.budget}</Text>
                    <View style={styles.campaignStats}>
                      <View style={styles.campaignStat}>
                        <Ionicons name="people" size={12} color={C.textSecondary} />
                        <Text style={[styles.campaignStatVal, { color: C.text }]}>{c.proposals}</Text>
                        <Text style={[styles.campaignStatLabel, { color: C.textSecondary }]}>{t('business.home.proposalsLabel')}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={C.border} />
                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Header
  gradientHeader: { paddingBottom: 14, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  menuBtn: { padding: 0 },
  menuBtnInner: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 12, marginBottom: 3, fontFamily: F.medium },
  brandName: { fontSize: 20, fontFamily: F.bold, maxWidth: 180, letterSpacing: -0.3 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  avatarClip:   { width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { fontSize: 18, color: '#fff', fontFamily: F.extrabold },
  statsStrip: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 12 },
  statStripItem: { flex: 1, alignItems: 'center' },
  statStripVal: { fontSize: 20, color: '#fff', fontFamily: F.bold },
  statStripLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F.medium, marginTop: 2 },
  statStripDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // Quick actions
  quickActionsRow:  { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 10 },
  quickAction:      { flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: 12, gap: 6, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  quickActionIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontFamily: F.medium, textAlign: 'center' },

  // Profile completion banner
  banner:        { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginTop: 14, marginBottom: 2, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderLeftWidth: 4 },
  bannerIconBox: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bannerText:    { flex: 1, gap: 2 },
  bannerTitle:   { fontSize: 13, fontFamily: F.semibold },
  bannerSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 17, opacity: 0.75 },
  bannerClose:   { position: 'absolute', top: 8, right: 8, padding: 4 },

  // Attention banner
  attentionBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 20, marginTop: 16, padding: 14, gap: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  attentionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  attentionTitle: { fontSize: 13, color: '#92400E', fontFamily: F.bold },
  attentionSub: { fontSize: 11, color: '#B45309', fontFamily: F.regular, marginTop: 1 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: F.bold },
  viewAll: { fontSize: 13, fontFamily: F.semibold, opacity: 0.7 },

  // Error
  errorCard: { backgroundColor: '#FEE2E2', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText: { fontSize: 13, marginLeft: 12, fontFamily: F.bold },

  // Find banner
  findBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginTop: 14, marginBottom: 4, paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  findIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  findTitle: { fontSize: 14, fontFamily: F.bold },
  findSub:   { fontSize: 11, fontFamily: F.regular, marginTop: 1 },

  // Type filter
  typeFilterWrap: { marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  // Campaign cards
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgePaid: { backgroundColor: TabColors.brand.bg },
  typeBadgeFree: { backgroundColor: TabColors.info.bg },
  typeBadgeText: { fontSize: 10, fontFamily: F.bold },
  typeBadgeTextPaid: { color: TabColors.brand.color },
  typeBadgeTextFree: { color: TabColors.info.color },

  campaignList: { paddingHorizontal: 20, gap: 12 },
  campaignCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4, overflow: 'hidden' },
  thumb: { width: 72, height: 72, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  campaignBody: { flex: 1, gap: 5 },
  campaignTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  campaignTitle: { fontSize: 14, flex: 1, fontFamily: F.bold },
  statusBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: F.bold },
  campaignMeta: { fontSize: 12, fontFamily: F.regular },
  campaignStats: { flexDirection: 'row', gap: 8, marginTop: 2 },
  campaignStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  campaignStatVal: { fontSize: 11, fontFamily: F.bold },
  campaignStatLabel: { fontSize: 11, fontFamily: F.regular },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontFamily: F.bold },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
