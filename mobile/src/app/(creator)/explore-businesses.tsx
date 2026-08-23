import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { EntityCard } from '@/components/EntityCard';
import { useFocusEffect } from 'expo-router';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchInput } from '@/components/SearchInput';
import { BusinessFilterModal } from '@/components/BusinessFilterModal';
import { EmptyState } from '@/components/EmptyState';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { type LocationFilter } from '@/components/LocationSearchPicker';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useToast } from '@/components/Toast';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { ResultCountPill } from '@/components/ResultCountPill';

type DisplayBusiness = BusinessListItem & { isFavorited: boolean };

// ─── Business Card ────────────────────────────────────────────────────────────

function BusinessCard({
  item,
  isFavorited,
  onToggleFavorite,
  chevronOnly,
}: {
  item:             BusinessListItem;
  isFavorited:      boolean;
  onToggleFavorite: () => void;
  /** Discover tab's cards use a plain trailing chevron instead of a full CTA button. */
  chevronOnly?:     boolean;
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
      locationText={item.city ?? item.district ?? undefined}
      locationBeforeCategory
      categoryLabel={primaryMeta ? item.categories[0] : undefined}
      categoryIcon={primaryMeta?.icon}
      categoryColor={primaryMeta?.color}
      categoryBg={primaryMeta?.bg}
      extraCount={extraCats}
      stat={{
        icon: 'bullhorn',
        iconSet: 'ionicons',
        color: hasEvents ? C.brinjal1 : C.textSecondary,
        text: hasEvents ? t('explore.businesses.campaignsBadge', { n: item._count.campaigns }) : t('explore.businesses.noEventsYet'),
      }}
      ctaLabel={t('explore.businesses.viewBusiness')}
      ctaStyle={chevronOnly ? 'chevron' : 'button'}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}
      action={{
        active: isFavorited,
        onToggle: onToggleFavorite,
        activeIcon: 'heart',
        inactiveIcon: 'heart',
        activeColor: '#EF4444',
        activeBg: '#FEE2E2',
      }}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// `embedded` renders just the content (no SafeAreaView/MaxWidthContainer/
// BackButton/search bar) so this same screen can be reused as the
// "Businesses" tab inside the unified Discover shell — which owns a single
// shared search bar + filter button for every tab and drives this screen's
// search/filter via the exposed ref — while the standalone route
// (/(creator)/explore-businesses) keeps its own search bar and works exactly
// as before.
export type BusinessesExploreHandle = { setSearchText: (text: string) => void; openFilter: () => void };

const ExploreBusinessesScreen = forwardRef<BusinessesExploreHandle, { embedded?: boolean; onFilterCountChange?: (count: number) => void }>(
  function ExploreBusinessesScreen({ embedded = false, onFilterCountChange }, ref) {
  const C      = useAppColors();
  const { t }  = useLanguage();
  const toast  = useToast();
  const { favoriteIds, toggle, reloadIds } = useFavoriteBusinesses();
  const { categories: businessCategories } = useCategories('BUSINESS');

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

  // Single-select — tapping the already-active category clears it, matching
  // the existing `category` filter's single-string shape.
  function toggleCategory(label: string) {
    const next = category === label ? '' : label;
    setCategory(next);
    void fetchBusinesses({ category: next, silent: true });
  }

  useImperativeHandle(ref, () => ({ setSearchText: onSearchChange, openFilter }));

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

  // Deliberately omits onFilterCountChange from deps — it's a fresh closure
  // every parent render, and including it would re-fire this effect (and thus
  // call setState in the parent) on every render, looping forever.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFilterCountChange?.(filterActiveCount); }, [filterActiveCount]);
  const displayItems: DisplayBusiness[] = businesses.map((b) => ({
    ...b,
    isFavorited: favoriteIds.has(b.id),
  }));

  const content = (
    <>
      {/* ── Back button + search, top right — hidden when embedded, since the
          Discover shell owns one shared search bar + filter button for
          every tab and drives this screen's search/filter via its ref. ── */}
      {!embedded && (
        <View style={{ backgroundColor: C.surface }}>
          <View style={styles.topRow} accessibilityRole="header" accessibilityLabel={t('explore.businesses.headerTitle')}>
            <BackButton fallback="/(creator)/" />
            <View style={[styles.searchBox, { flex: 1 }]}>
              <View style={{ flex: 1 }}>
                <SearchInput
                  placeholder={t('explore.businesses.searchPlaceholder')}
                  value={search}
                  onChangeText={onSearchChange}
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                style={[
                  styles.filterBtn,
                  { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight },
                  isFilterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
                ]}
                onPress={openFilter}
                hitSlop={6}>
                <FontAwesome5 name="sliders-h" solid size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
                {isFilterActive && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountBadgeTxt}>{filterActiveCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
          {/* Inset hairline, not edge-to-edge — same treatment as Instagram's
              subtle content-width dividers rather than a full-bleed border. */}
          <View style={[styles.headerSeparator, { backgroundColor: C.border }]} />
        </View>
      )}

      {/* Saved link — only shown on the standalone route; when embedded in
          Discover, the shell renders this up in its title row instead
          (next to "Discover", top-right) rather than duplicating it here. */}
      {!embedded && (
        <View style={styles.savedRow}>
          <Pressable
            style={[styles.favLink, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
            onPress={() => router.push('/(creator)/favorite-businesses' as Parameters<typeof router.push>[0])}>
            <FontAwesome5 name="heart" solid size={15} color={C.brinjal1} />
            <Text style={[styles.favLinkText, { color: C.brinjal1 }]}>{t('explore.businesses.savedLink')}</Text>
          </Pressable>
        </View>
      )}

      {/* Category pills — All + single scrollable row through every category,
          matching Discover's Opportunities/People tabs exactly (same shared
          component, not just a similar look). */}
      <CategoryPillRow
        categories={businessCategories}
        activeLabels={category ? [category] : []}
        onToggle={toggleCategory}
        showAll
        onAllPress={() => { setCategory(''); void fetchBusinesses({ category: '', silent: true }); }}
      />

      {/* Active filter pills — category is deliberately excluded here since
          the CategoryPillRow above already highlights the selected category;
          repeating it as a chip+Clear-all below was redundant. */}
      {(platform || locations.length > 0) && (
        <View style={styles.activePills}>
          {locations.map((loc) => (
            <Pressable
              key={loc.label}
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => {
                const next = locations.filter((l) => l.label !== loc.label);
                setLocations(next);
                void fetchBusinesses({ locations: next, silent: true });
              }}>
              <FontAwesome5 name="map-marker-alt" solid size={11} color={C.brinjal1} />
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          {platform ? (
            <Pressable
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setPlatform(''); void fetchBusinesses({ platform: '', silent: true }); }}>
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{platform}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          <Pressable onPress={clearAll}>
            <Text style={[styles.clearAllText, { color: C.error }]}>{t('explore.businesses.clearAll')}</Text>
          </Pressable>
        </View>
      )}

      {/* Always a stable flex:1 region below the header/pills, so the empty
          state reliably centers regardless of how tall the pill row above
          it is. */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
          </View>
        ) : error ? (
          <EmptyState faIcon="exclamation-triangle" title={t('explore.businesses.loadError')} subtitle={error} action={{ label: t('explore.businesses.retry'), onPress: () => fetchBusinesses() }} />
        ) : displayItems.length === 0 ? (
          <EmptyState
            faIcon="building"
            title={t('explore.businesses.noResultsFiltered')}
            subtitle={hasFilter ? 'Try adjusting your filters or search term.' : 'No businesses are currently hiring. Check back soon!'}
            action={hasFilter ? { label: t('explore.businesses.clearFiltersBtn'), onPress: clearAll } : undefined}
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={displayItems}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => (
              <BusinessCard
                item={item}
                isFavorited={item.isFavorited}
                onToggleFavorite={() => { void handleToggleFavorite(item.id); }}
                chevronOnly={embedded}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
            onEndReached={() => void loadMoreBusinesses()}
            onEndReachedThreshold={0.4}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={
              <View>
                {!loading && businesses.length > 0 && (
                  <ResultCountPill label={t('explore.businesses.brandsFound', { n: total })} />
                )}
                {loadingMore && (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={C.brinjal1} />
                  </View>
                )}
              </View>
            }
          />
        )}
      </View>
    </>
  );

  return (
    <>
      {embedded ? (
        <MaxWidthContainer>{content}</MaxWidthContainer>
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
          <MaxWidthContainer>{content}</MaxWidthContainer>
        </SafeAreaView>
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
    </>
  );
});

export default ExploreBusinessesScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },

  // Header
  savedRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: SCREEN_GUTTER, marginTop: 12, marginBottom: 4 },
  favLink:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  favLinkText:    { fontSize: 12, fontFamily: F.bold },

  // Top row — back button + search, top right
  topRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 12, gap: 12 },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: SCREEN_GUTTER },
  searchBox:      { flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterBtn:      { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  // Active filter pills — paddingHorizontal 20 (not 16, like topRow above)
  // to match the People/Opportunities tabs' card-list left edge in the
  // Discover shell, which is what actually needs to line up across tabs.
  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontFamily: F.semibold },
  clearAllText:   { fontSize: 12, fontFamily: F.bold },

  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, fontFamily: F.regular },
  // paddingTop matches explore-creators.tsx's People tab list — keeps the
  // gap between the category pill row and the first card identical across
  // both tabs in the Discover shell.
  list:           { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  footerLoading:  { paddingVertical: 20 },
});
