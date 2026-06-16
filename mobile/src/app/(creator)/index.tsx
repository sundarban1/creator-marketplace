import { router } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
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
import { CATEGORY_META, DEFAULT_META, FILTER_TABS } from '@/features/creator/data/filterOptions';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import type { Campaign } from '@/types';

const SLIDER_MAX = 1000;

export default function HomeScreen() {
  const { user } = useAuth();
  const { openDrawer } = useContext(DrawerContext);
  const { t } = useLanguage();
  const C = useAppColors();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFilterTab, setActiveFilterTab] = useState(-1); // -1 = no tab filter
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
      const [{ campaigns: data }, cats] = await Promise.all([
        campaignService.list({
          category:  cat !== 'All' ? cat : undefined,
          minBudget: pMin > 0 ? pMin : undefined,
          maxBudget: pMax < SLIDER_MAX ? pMax : undefined,
          dateFrom:  df ?? undefined,
          dateTo:    dt ?? undefined,
          limit: 50,
        }),
        campaignService.getCategories().catch(() => [] as string[]),
      ]);
      setCampaigns(data);
      setApiCategories(cats);
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
    void fetchCampaigns({ category: 'All', priceMin: 0, priceMax: SLIDER_MAX, dateFrom: null, dateTo: null });
  }

  const visibleCategories = ['All', ...apiCategories].map((label) => ({
    label,
    ...(CATEGORY_META[label] ?? DEFAULT_META),
  }));

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
    if (activeFilterTab === 0) matchTab = c.isNew;
    else if (activeFilterTab === 1) matchTab = !c.isFeatured;
    else if (activeFilterTab === 2) matchTab = c.proposals >= 3;
    else if (activeFilterTab === 3) {
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

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuBtn} onPress={openDrawer}>
              <View style={[styles.menuLine, { backgroundColor: C.text }]} />
              <View style={[styles.menuLine, { width: 18, backgroundColor: C.text }]} />
              <View style={[styles.menuLine, { backgroundColor: C.text }]} />
            </Pressable>
            <View>
              <Text style={[styles.greeting, { color: C.textSecondary }]}>Hello, 👋</Text>
              <View style={styles.nameRow}>
                <Text style={[styles.brandName, { color: C.text }]} numberOfLines={1}>{user?.name ?? 'Creator'}</Text>
                <View style={[styles.rolePill, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.rolePillText, { color: C.brinjal1 }]}>Creator</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={[styles.avatarCircle, { borderColor: C.brinjal1, shadowColor: C.brinjal1 }]} onPress={() => router.push('/(creator)/profile')}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: '#E8EAF6' }]}>
                  <Text style={styles.avatarEmoji}>🧑</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={[styles.searchCard, { backgroundColor: C.surface }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder={t('creator.browse.searchPlaceholder')}
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          <Pressable
            style={[styles.filterBtn, { backgroundColor: C.primaryLight }, isFilterActive && { backgroundColor: C.brinjal1 }]}
            onPress={openFilter}>
            <View style={styles.filterLines}>
              <View style={[styles.filterLine, { width: 16, backgroundColor: isFilterActive ? '#fff' : C.brinjal1 }]} />
              <View style={[styles.filterLine, { width: 12, backgroundColor: isFilterActive ? '#fff' : C.brinjal1 }]} />
              <View style={[styles.filterLine, { width: 8, backgroundColor: isFilterActive ? '#fff' : C.brinjal1 }]} />
            </View>
            {isFilterActive && <View style={[styles.filterActiveDot, { borderColor: C.surface }]} />}
          </Pressable>
        </View>

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
          {visibleCategories.map((cat) => (
            <Pressable key={cat.label} style={styles.catItem} onPress={() => {
              setActiveCategory(cat.label);
              void fetchCampaigns({ category: cat.label });
            }}>
              <View style={[styles.catIcon, { backgroundColor: cat.bg }, activeCategory === cat.label && { borderWidth: 2, borderColor: C.brinjal1 }]}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={[styles.catLabel, { color: activeCategory === cat.label ? C.brinjal1 : C.textSecondary }, activeCategory === cat.label && { fontWeight: '700' }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Featured / Loading ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading campaigns…</Text>
          </View>
        ) : (
          <>
            {featured.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: C.text }]}>⭐ Featured Campaigns</Text>
                  <Pressable onPress={() => router.push('/(creator)/featured-campaigns')}>
                    <Text style={[styles.seeAll, { color: C.brinjal1 }]}>See All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                  {featured.map((c) => <FeaturedCard key={c.id} campaign={c} />)}
                </ScrollView>
              </>
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
                  <Text style={styles.emptyEmoji}>🔍</Text>
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
                <Text style={styles.bannerEmoji}>💼</Text>
                <View style={styles.bannerText}>
                  <Text style={[styles.bannerTitle, { color: C.text }]}>Complete your profile</Text>
                  <Text style={[styles.bannerSub, { color: C.textSecondary }]}>
                    Add your social accounts to increase your chances of getting hired.
                  </Text>
                </View>
                <Pressable style={styles.bannerClose} onPress={() => setShowBanner(false)}>
                  <Text style={[styles.bannerCloseText, { color: C.textSecondary }]}>✕</Text>
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { gap: 5, padding: 4 },
  menuLine: { width: 22, height: 2, borderRadius: 1 },
  greeting: { fontSize: 12, marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { fontSize: 18, fontWeight: '800', maxWidth: 160 },
  rolePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', borderWidth: 2, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  avatarImage: { width: 42, height: 42 },
  avatarFallback: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 28, lineHeight: 34, textAlign: 'center' },

  searchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 20, marginBottom: 24, paddingHorizontal: 14, height: 50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterLines: { gap: 4, alignItems: 'flex-end' },
  filterLine: { height: 2, borderRadius: 1 },
  filterActiveDot: { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5 },

  errorCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1 },
  retryText: { fontSize: 13, fontWeight: '700', marginLeft: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '700' },

  categoriesRow: { paddingHorizontal: 20, gap: 14, marginBottom: 28 },
  catItem: { alignItems: 'center', gap: 8 },
  catIcon: { width: 58, height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  catEmoji: { fontSize: 26 },
  catLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14 },

  featuredRow: { paddingHorizontal: 20, gap: 14, marginBottom: 28 },
  filterTabsWrap: { borderBottomWidth: 1, marginBottom: 16 },
  filterTabsRow: { flexDirection: 'row', paddingHorizontal: 20 },
  filterTab: { paddingVertical: 12, marginRight: 24, position: 'relative' },
  filterTabText: { fontSize: 14, fontWeight: '500' },
  filterTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, borderRadius: 2 },

  listWrap: { paddingHorizontal: 20, gap: 12 },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginTop: 20, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, borderLeftWidth: 4 },
  bannerEmoji: { fontSize: 32, flexShrink: 0 },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerSub: { fontSize: 11, lineHeight: 16 },
  bannerClose: { position: 'absolute', top: 8, right: 8, padding: 4 },
  bannerCloseText: { fontSize: 11 },
});
