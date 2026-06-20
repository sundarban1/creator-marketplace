import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { FeaturedCard } from '@/features/creator/components/FeaturedCard';
import { FilterModal } from '@/features/creator/components/FilterModal';
import type { LocationFilter } from '@/features/creator/components/FilterModal';
import { CATEGORY_META, DEFAULT_META, FILTER_TABS, displayCategory } from '@/features/creator/data/filterOptions';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { getSocket } from '@/lib/socket';
import { F } from '@/utilities/constants';
import type { Campaign } from '@/types';

const SLIDER_MAX = 1000;

export default function HomeScreen() {
  const { user } = useAuth();
  const { openDrawer } = useContext(DrawerContext);
  const { t, language } = useLanguage();
  const C = useAppColors();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFilterTab, setActiveFilterTab] = useState(-1); // -1 = show all
  const [showBanner, setShowBanner] = useState(true);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(SLIDER_MAX);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(SLIDER_MAX);
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);

  async function fetchCampaigns(
    overrides: {
      category?: string;
      priceMin?: number;
      priceMax?: number;
      dateFrom?: Date | null;
      dateTo?: Date | null;
      showLoader?: boolean;
    } = {},
  ) {
    const showLoader = overrides.showLoader !== false;
    if (showLoader) setLoading(true);
    setFetchError('');

    const cat   = overrides.category  !== undefined ? overrides.category  : activeCategory;
    const pMin  = overrides.priceMin  !== undefined ? overrides.priceMin  : priceMin;
    const pMax  = overrides.priceMax  !== undefined ? overrides.priceMax  : priceMax;
    const df    = overrides.dateFrom  !== undefined ? overrides.dateFrom  : dateFrom;
    const dt    = overrides.dateTo    !== undefined ? overrides.dateTo    : dateTo;

    try {
      const { campaigns: data } = await campaignService.list({
        category:  cat !== 'All' ? cat : undefined,
        minBudget: pMin > 0 ? pMin : undefined,
        maxBudget: pMax < SLIDER_MAX ? pMax : undefined,
        dateFrom:  df ?? undefined,
        dateTo:    dt ?? undefined,
        limit: 50,
      });
      setCampaigns(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchCampaigns();
    campaignService.getCategories()
      .then((cats) => { if (cats.length > 0) setApiCategories(cats); })
      .catch(() => {});
  }, []);

  // Keep a stable ref to the latest fetch so the socket handler never captures stale state
  const fetchRef = useRef(fetchCampaigns);
  useEffect(() => { fetchRef.current = fetchCampaigns; });

  // Subscribe to real-time campaign updates while this screen is focused
  useFocusEffect(useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => { void fetchRef.current({ showLoader: false }); };
    socket.on('campaign:new', handler);
    return () => { socket.off('campaign:new', handler); };
  }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCampaigns({ showLoader: false });
  }, [activeCategory, priceMin, priceMax, dateFrom, dateTo]);

  const isFilterActive = priceMin > 0 || priceMax < SLIDER_MAX || locationFilter.length > 0 || !!dateFrom;

  function openFilter() {
    setTempPriceMin(priceMin);
    setTempPriceMax(priceMax);
    setTempLocation(locationFilter);
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setFilterOpen(true);
  }

  function applyFilter() {
    setPriceMin(tempPriceMin);
    setPriceMax(tempPriceMax);
    setLocationFilter(tempLocation);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setFilterOpen(false);

    // Re-fetch with the new committed values (don't wait for state to flush)
    void fetchCampaigns({
      priceMin: tempPriceMin,
      priceMax: tempPriceMax,
      dateFrom: tempDateFrom,
      dateTo:   tempDateTo,
    });

    // Persist first non-Remote location's lat/lng to creator profile
    const geoLoc = tempLocation.find((l) => l.label !== 'Remote' && l.lat !== null);
    if (geoLoc && geoLoc.lat !== null && geoLoc.lng !== null) {
      creatorService.updateProfile({
        location: geoLoc.label,
        locationLat: geoLoc.lat,
        locationLng: geoLoc.lng,
      }).catch(() => {});
    }
  }

  function resetFilter() {
    setTempPriceMin(0);
    setTempPriceMax(SLIDER_MAX);
    setTempLocation([]);
    setTempDateFrom(null);
    setTempDateTo(null);
  }

  function resetAllFilters() {
    setPriceMin(0);
    setPriceMax(SLIDER_MAX);
    setLocationFilter([]);
    setDateFrom(null);
    setDateTo(null);
    setActiveCategory('All');
    setActiveFilterTab(-1);
    void fetchCampaigns({ category: 'All', priceMin: 0, priceMax: SLIDER_MAX, dateFrom: null, dateTo: null });
  }

  const visibleCategories = [
    { label: 'All', ...(CATEGORY_META['All'] ?? DEFAULT_META) },
    ...apiCategories.map((label) => ({
      label,
      ...(CATEGORY_META[label] ?? DEFAULT_META),
    })),
  ];

  const featured = campaigns.filter((c) => c.isFeatured);

  // Category, budget, and deadline are filtered server-side.
  // Client-side: search text, location, and quick-tab filters.
  const filteredList = campaigns.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.brand.toLowerCase().includes(search.toLowerCase());

    const matchLocation =
      locationFilter.length === 0 ||
      locationFilter.some((l) =>
        l.label === 'Remote'
          ? c.location === 'Remote'
          : c.location?.toLowerCase().includes(l.label.toLowerCase()),
      );

    let matchTab = true;
    if (activeFilterTab === 0) matchTab = c.isNew;                // New
    else if (activeFilterTab === 1) matchTab = !c.isFeatured;     // Recommended
    else if (activeFilterTab === 2) matchTab = c.proposals >= 3;  // Trending
    else if (activeFilterTab === 3) {                             // Ending Soon
      const deadline = c.deadline ? new Date(c.deadline) : null;
      if (deadline && !isNaN(deadline.getTime())) {
        const daysLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        matchTab = daysLeft >= 0 && daysLeft <= 7;
      } else {
        matchTab = false;
      }
    }

    return matchSearch && matchLocation && matchTab;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}>

        {/* ── Gradient header ── */}
        <LinearGradient colors={['#0EA5E9', '#38BDF8', '#7DD3FC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.menuBtn} onPress={openDrawer}>
                <Ionicons name="menu" size={26} color="#fff" />
              </Pressable>
              <View>
                <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.8)', fontFamily: F.medium }]}>{language === 'ne' ? 'नमस्ते 🙏' : 'Hello 👋'}</Text>
                <View style={styles.nameRow}>
                  <Text style={[styles.brandName, { color: '#fff' }]} numberOfLines={1}>{user?.name ?? 'Creator'}</Text>
                  <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.rolePillText, { color: '#fff' }]}>Creator</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable style={[styles.avatarCircle, { borderColor: 'rgba(255,255,255,0.6)', borderWidth: 2.5 }]} onPress={() => router.push('/(creator)/profile')}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* ── Search ── */}
          <View style={[styles.searchCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="search" size={17} color="rgba(255,255,255,0.8)" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: '#fff' }]}
              placeholder={t('creator.browse.searchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={search}
              onChangeText={setSearch}
            />
            <Pressable
              style={[styles.filterBtn, { backgroundColor: isFilterActive ? '#fff' : 'rgba(255,255,255,0.2)' }]}
              onPress={openFilter}>
              <Ionicons name="options" size={18} color={isFilterActive ? '#0EA5E9' : '#fff'} />
              {isFilterActive && <View style={[styles.filterActiveDot, { borderColor: 'transparent' }]} />}
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Explore Brands compact strip ── */}
        <Pressable
          style={[styles.exploreStrip, { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }]}
          onPress={() => router.push('/(creator)/explore-businesses' as never)}>
          <View style={[styles.exploreIconBox, { backgroundColor: '#059669' }]}>
            <Ionicons name="business" size={18} color="#fff" />
          </View>
          <View style={styles.exploreTexts}>
            <Text style={[styles.exploreTitle, { color: '#065F46' }]}>Explore Brands</Text>
            <Text style={[styles.exploreSub, { color: '#059669' }]}>Find businesses hiring creators · <Text style={{ color: '#047857', fontWeight: '700' }}>Earn money</Text></Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#059669" />
        </Pressable>

        {/* ── Error ── */}
        {fetchError ? (
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable onPress={() => fetchCampaigns()}>
              <Text style={[styles.retryText, { color: C.brinjal1 }]}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Categories ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Categories</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {visibleCategories.map((cat) => {
            const isAll    = cat.label === 'All';
            const isActive = activeCategory === cat.label;
            return (
              <Pressable
                key={cat.label}
                style={[
                  styles.catCard,
                  { backgroundColor: isActive ? C.brinjal1 : isAll ? 'transparent' : cat.bg },
                ]}
                onPress={() => {
                  setActiveCategory(cat.label);
                  void fetchCampaigns({ category: cat.label });
                }}>
                {/* Gradient only when "All" is NOT selected */}
                {isAll && !isActive && (
                  <LinearGradient
                    colors={['#7C3AED', '#EC4899', '#F97316']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text
                  style={[styles.catLabel, { color: isActive || isAll ? '#fff' : C.text }]}
                  numberOfLines={2}>
                  {displayCategory(cat.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Featured / Loading ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading campaigns…</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Featured Campaigns</Text>
              {featured.length > 0 && (
                <Pressable onPress={() => router.push('/(creator)/featured-campaigns')}>
                  <Text style={[styles.seeAll, { color: C.brinjal1 }]}>See All</Text>
                </Pressable>
              )}
            </View>
            {featured.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {featured.map((c) => <FeaturedCard key={c.id} campaign={c} />)}
              </ScrollView>
            ) : (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name="star-outline" size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>No featured campaigns right now</Text>
                <Text style={[styles.featuredEmptySub, { color: C.textSecondary }]}>Check back soon — new opportunities are added regularly.</Text>
              </View>
            )}

            {/* ── Tab filter ── */}
            <View style={[styles.filterTabsWrap, { borderBottomColor: C.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterTabsRow}>
                  {FILTER_TABS.map((label, i) => (
                    <Pressable key={label} style={styles.filterTab} onPress={() => setActiveFilterTab(activeFilterTab === i ? -1 : i)}>
                      <Text style={[styles.filterTabText, { color: activeFilterTab === i ? C.brinjal1 : C.textSecondary }, activeFilterTab === i && { fontWeight: '700' }]}>
                        {label}
                      </Text>
                      {activeFilterTab === i && <View style={[styles.filterTabUnderline, { backgroundColor: C.brinjal1 }]} />}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ── Campaign list ── */}
            <View style={styles.listWrap}>
              {filteredList.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="search" size={40} color={C.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: C.text }]}>No campaigns found</Text>
                  <Text style={[styles.emptyHint, { color: C.textSecondary }]}>
                    {campaigns.length === 0
                      ? 'No active campaigns at the moment. Check back soon!'
                      : 'Try adjusting your search or filters.'}
                  </Text>
                </View>
              ) : (
                filteredList.map((c) => <CampaignListItem key={c.id} campaign={c} />)
              )}
            </View>

            {/* ── Complete profile banner ── */}
            {showBanner && (
              <View style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                <Ionicons name="briefcase" size={28} color={C.brinjal1} style={{ flexShrink: 0 }} />
                <View style={styles.bannerText}>
                  <Text style={[styles.bannerTitle, { color: C.text }]}>Complete your profile</Text>
                  <Text style={[styles.bannerSub, { color: C.textSecondary }]}>
                    Add your social accounts to increase your chances of getting hired.
                  </Text>
                </View>
                <Pressable style={styles.bannerClose} onPress={() => setShowBanner(false)}>
                  <Ionicons name="close" size={16} color={C.textSecondary} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <FilterModal
        visible={filterOpen}
        tempPriceMin={tempPriceMin}
        tempPriceMax={tempPriceMax}
        tempLocation={tempLocation}
        tempDateFrom={tempDateFrom}
        tempDateTo={tempDateTo}
        setTempPriceMin={setTempPriceMin}
        setTempPriceMax={setTempPriceMax}
        setTempLocation={setTempLocation}
        setTempDateFrom={setTempDateFrom}
        setTempDateTo={setTempDateTo}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  gradientHeader: { paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { padding: 4 },
  greeting: { fontSize: 13, marginBottom: 2, fontFamily: F.regular },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 19, fontFamily: F.extrabold, maxWidth: 160 },
  rolePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontFamily: F.bold },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  avatarImage: { width: 42, height: 42 },
  avatarFallback: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },

  searchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 20, marginBottom: 0, paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterActiveDot: { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5 },

  errorCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText: { fontSize: 13, fontWeight: '700', marginLeft: 12, fontFamily: F.bold },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontFamily: F.bold },
  seeAll: { fontSize: 13, fontFamily: F.semibold },

  categoriesRow: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  catCard: {
    width: 78, height: 96, borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingHorizontal: 6,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  catEmoji:  { fontSize: 34 },
  catLabel:  { fontSize: 10, fontWeight: '700', fontFamily: F.bold, lineHeight: 13, textAlign: 'center' },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  featuredRow: { paddingHorizontal: 20, gap: 16, marginBottom: 28 },
  featuredEmpty: { marginHorizontal: 20, marginBottom: 28, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  featuredEmptyTitle: { fontSize: 14, fontFamily: F.bold, textAlign: 'center' },
  featuredEmptySub: { fontSize: 12, fontFamily: F.regular, textAlign: 'center', lineHeight: 18 },
  filterTabsWrap: { borderBottomWidth: 1, marginBottom: 16 },
  filterTabsRow: { flexDirection: 'row', paddingHorizontal: 20 },
  filterTab: { paddingVertical: 12, marginRight: 24, position: 'relative' },
  filterTabText: { fontSize: 14, fontFamily: F.medium },
  filterTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, borderRadius: 2 },

  listWrap: { paddingHorizontal: 20, gap: 12 },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: F.bold },
  emptyHint: { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

  exploreStrip:   { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginTop: 16, marginBottom: 20, paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  exploreIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  exploreTexts:   { flex: 1 },
  exploreTitle:   { fontSize: 14, fontFamily: F.bold },
  exploreSub:     { fontSize: 12, fontFamily: F.regular, marginTop: 1 },

  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, marginHorizontal: 20, marginTop: 20, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3, borderLeftWidth: 4 },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 13, fontFamily: F.bold },
  bannerSub: { fontSize: 11, fontFamily: F.regular, lineHeight: 16 },
  bannerClose: { position: 'absolute', top: 8, right: 8, padding: 4 },
});
