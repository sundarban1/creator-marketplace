import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { EntityCard } from '@/components/EntityCard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BusinessFilterModal } from '@/components/BusinessFilterModal';
import { EmptyState } from '@/components/EmptyState';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { type LocationFilter } from '@/components/LocationSearchPicker';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useToast } from '@/components/Toast';
import { F, RADIUS } from '@/utilities/constants';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';

type DisplayBusiness = BusinessListItem & { isFavorited: boolean };

// ─── Business Card ────────────────────────────────────────────────────────────

function BusinessCard({
  item,
  isFavorited,
  onToggleFavorite,
}: {
  item:             BusinessListItem;
  isFavorited:      boolean;
  onToggleFavorite: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: businessCategories } = useCategories('BUSINESS');
  const primaryMeta = item.categories.length > 0 ? getCategoryMeta(businessCategories, item.categories[0]) : null;
  const extraCats = item.categories.length - 1;
  const hasEvents = item._count.campaigns > 0;
  const initials = item.businessName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <EntityCard
      avatarUrl={item.logoUrl}
      avatarBg={C.primaryLight}
      initials={initials}
      circularAvatar
      ringColor={primaryMeta?.color ?? C.brinjal1}
      name={item.businessName}
      verified={item.fullyVerified || item.isVerified}
      description={item.description || t('explore.businesses.noDescription')}
      descriptionItalic={!item.description}
      categoryLabel={primaryMeta ? item.categories[0] : undefined}
      categoryIcon={primaryMeta?.icon}
      categoryColor={primaryMeta?.color}
      categoryBg={primaryMeta?.bg}
      extraCount={extraCats}
      stat={{
        icon: 'megaphone-outline',
        iconSet: 'ionicons',
        color: hasEvents ? C.brinjal1 : C.textSecondary,
        text: hasEvents ? t('explore.businesses.campaignsBadge', { n: item._count.campaigns }) : t('explore.businesses.noEventsYet'),
      }}
      ctaLabel={t('explore.businesses.viewBusiness')}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}
      action={{
        active: isFavorited,
        onToggle: onToggleFavorite,
        activeIcon: 'heart',
        inactiveIcon: 'heart-outline',
        activeColor: '#EF4444',
        activeBg: '#FEE2E2',
      }}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreBusinessesScreen() {
  const C      = useAppColors();
  const { t }  = useLanguage();
  const toast  = useToast();
  const { favoriteIds, toggle, reloadIds } = useFavoriteBusinesses();

  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [error, setError]           = useState('');

  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('');
  const [platform,  setPlatform]  = useState('');
  const [locations, setLocations] = useState<LocationFilter>([]);

  const [filterOpen,   setFilterOpen]   = useState(false);
  const [tempPlatform, setTempPlatform] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const PAGE_SIZE = 20;

  async function fetchBusinesses(opts?: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: LocationFilter;
    silent?:    boolean;
  }) {
    if (!opts?.silent) setLoading(true);
    setError('');
    try {
      const locs = opts?.locations !== undefined ? opts.locations : locations;
      const data = await businessService.listBusinesses({
        search:    opts?.search    !== undefined ? opts.search    : search,
        category:  opts?.category  !== undefined ? opts.category  : category,
        platform:  opts?.platform  !== undefined ? opts.platform  : platform,
        locations: locs.map((l) => l.label),
        page:      1,
        limit:     PAGE_SIZE,
      });
      setBusinesses(data.businesses);
      setTotal(data.total);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMoreBusinesses() {
    if (loadingMore || loading || refreshing || businesses.length >= total) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await businessService.listBusinesses({
        search, category, platform,
        locations: locations.map((l) => l.label),
        page:      nextPage,
        limit:     PAGE_SIZE,
      });
      setBusinesses((prev) => {
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...data.businesses.filter((b) => !seen.has(b.id))];
      });
      setTotal(data.total);
      setPage(nextPage);
    } catch {
      // Silent — the user can trigger another attempt just by scrolling again.
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { void fetchBusinesses(); }, []);

  // Re-sync favorite IDs whenever this screen comes back into focus
  // (handles the case where user removed favorites on the Favorites screen)
  useFocusEffect(useCallback(() => { reloadIds(); }, []));

  function onSearchChange(text: string) {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchBusinesses({ search: text, silent: true }), 450);
  }

  function openFilter() {
    setTempPlatform(platform);
    setTempCategory(category);
    setTempLocation(locations);
    setFilterOpen(true);
  }

  function applyFilter() {
    setPlatform(tempPlatform);
    setCategory(tempCategory);
    setLocations(tempLocation);
    setFilterOpen(false);
    void fetchBusinesses({ platform: tempPlatform, category: tempCategory, locations: tempLocation, silent: true });
  }

  function resetFilter() {
    setTempPlatform('');
    setTempCategory('');
    setTempLocation([]);
  }

  function clearAll() {
    setSearch(''); setCategory(''); setPlatform(''); setLocations([]);
    void fetchBusinesses({ search: '', category: '', platform: '', locations: [], silent: true });
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchBusinesses({ silent: true });
  }, [search, category, platform]);

  async function handleToggleFavorite(businessId: string) {
    const wasFavorited = favoriteIds.has(businessId);
    try {
      const isFavorited = await toggle(businessId);
      if (isFavorited) toast.success(t('explore.businesses.addedToFavorites'));
    } catch {
      toast.error(wasFavorited ? t('explore.businesses.couldNotRemoveFav') : t('explore.businesses.couldNotAddFav'));
    }
  }

  const filterActiveCount = [!!category, !!platform, locations.length > 0].filter(Boolean).length;
  const isFilterActive  = filterActiveCount > 0;
  const hasFilter       = !!(search || category || platform || locations.length > 0);
  const displayItems: DisplayBusiness[] = businesses.map((b) => ({
    ...b,
    isFavorited: favoriteIds.has(b.id),
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* ── Back button + search, top right ── */}
      <View style={[styles.topRow, { backgroundColor: C.surface, borderBottomColor: C.border }]} accessibilityRole="header" accessibilityLabel={t('explore.businesses.headerTitle')}>
        <BackButton fallback="/(creator)/" />
        <View style={[styles.searchBox, { flex: 1, backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder={t('explore.businesses.searchPlaceholder')}
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setSearch(''); void fetchBusinesses({ search: '', silent: true }); }} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[
              styles.filterBtn,
              { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight },
              isFilterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
            ]}
            onPress={openFilter}
            hitSlop={6}>
            <Ionicons name="options-outline" size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
            {isFilterActive && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeTxt}>{filterActiveCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Saved link + result count — same row, below search */}
      <View style={styles.savedRow}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[styles.favLink, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
          onPress={() => router.push('/(creator)/favorite-businesses' as Parameters<typeof router.push>[0])}>
          <Ionicons name="heart" size={15} color={C.brinjal1} />
          <Text style={[styles.favLinkText, { color: C.brinjal1 }]}>{t('explore.businesses.savedLink')}</Text>
        </Pressable>
        {!loading && businesses.length > 0 && (
          <Text style={[styles.countTxt, { color: C.textSecondary }]}>
            {t('explore.businesses.brandsFound', { n: total })}
          </Text>
        )}
      </View>

      {/* Active filter pills */}
      {isFilterActive && (
        <View style={styles.activePills}>
          {locations.map((loc) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={loc.label}
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => {
                const next = locations.filter((l) => l.label !== loc.label);
                setLocations(next);
                void fetchBusinesses({ locations: next, silent: true });
              }}>
              <Ionicons name="location" size={11} color={C.brinjal1} />
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          {platform ? (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setPlatform(''); void fetchBusinesses({ platform: '', silent: true }); }}>
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{platform}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          {category ? (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setCategory(''); void fetchBusinesses({ category: '', silent: true }); }}>
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{category}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={clearAll}>
            <Text style={[styles.clearAllText, { color: C.error }]}>{t('explore.businesses.clearAll')}</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
        </View>
      ) : error ? (
        <EmptyState faIcon="exclamation-triangle" title={t('explore.businesses.loadError')} subtitle={error} action={{ label: t('explore.businesses.retry'), onPress: () => fetchBusinesses() }} />
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <BusinessCard
              item={item}
              isFavorited={item.isFavorited}
              onToggleFavorite={() => { void handleToggleFavorite(item.id); }}
            />
          )}
          contentContainerStyle={[styles.list, displayItems.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          onEndReached={() => void loadMoreBusinesses()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={C.brinjal1} />
            </View>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              faIcon="building"
              title={t('explore.businesses.noResultsFiltered')}
              subtitle={hasFilter ? 'Try adjusting your filters or search term.' : 'No businesses are currently hiring. Check back soon!'}
              action={hasFilter ? { label: t('explore.businesses.clearFiltersBtn'), onPress: clearAll } : undefined}
            />
          }
        />
      )}

      <BusinessFilterModal
        visible={filterOpen}
        tempLocation={tempLocation}
        tempPlatform={tempPlatform}
        tempCategory={tempCategory}
        setTempLocation={setTempLocation}
        setTempPlatform={setTempPlatform}
        setTempCategory={setTempCategory}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },

  // Header
  countTxt:       { fontSize: 12, fontFamily: F.semibold },
  savedRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  favLink:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  favLinkText:    { fontSize: 12, fontFamily: F.bold },

  // Top row — back button + search, top right
  topRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12, borderBottomWidth: 1 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: 14, height: 44 },
  searchInput:    { flex: 1, fontSize: 15, fontFamily: F.regular },
  filterBtn:      { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  // Active filter pills
  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontFamily: F.semibold },
  clearAllText:   { fontSize: 12, fontFamily: F.bold },

  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, fontFamily: F.regular },
  list:           { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48, gap: 14 },
  listEmpty:      { flexGrow: 1 },
  footerLoading:  { paddingVertical: 20 },
});
