import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { EntityCard } from '@/components/EntityCard';
import { useFocusEffect } from 'expo-router';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { STALE } from '@/lib/queryClient';
import { useToast } from '@/components/Toast';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useCategories, getCategoryMeta, sortOtherLast, sortSelectedFirst } from '@/hooks/useCategories';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { ResultCountPill } from '@/components/ResultCountPill';
import { realImageUrl } from '@/utilities/avatar';

type DisplayBusiness = BusinessListItem & { isFavorited: boolean };

// Stable empty references so derived values aren't recomputed off a fresh []
// every render while a query is pending.
const EMPTY_BUSINESSES: BusinessListItem[] = [];
const EMPTY_STRINGS: string[] = [];
const PAGE_SIZE = 20;

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
  const initials = (item.businessName ?? 'Business').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const logoUrl = realImageUrl(item.logoUrl);
  // Always a white avatar chip; no logo → black initials + a black ring instead
  // of the tinted-purple placeholder.
  const plainAvatar = !logoUrl;

  return (
    <EntityCard
      avatarUrl={logoUrl}
      avatarBg="#FFFFFF"
      initials={initials}
      initialsColor={plainAvatar ? '#000000' : undefined}
      circularAvatar
      ringColor={plainAvatar ? '#000000' : (primaryMeta?.color ?? C.brinjal1)}
      name={item.businessName ?? 'Business'}
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

// `savedOnly` swaps the data source to the creator's favourited businesses
// (same list the standalone /favorite-businesses screen shows) without leaving
// the tab — the Discover shell's "Saved" header button toggles it.
const ExploreBusinessesScreen = forwardRef<BusinessesExploreHandle, { embedded?: boolean; savedOnly?: boolean; onFilterCountChange?: (count: number) => void }>(
  function ExploreBusinessesScreen({ embedded = false, savedOnly = false, onFilterCountChange }, ref) {
  const C      = useAppColors();
  const { t }  = useLanguage();
  const toast  = useToast();
  const { favoriteIds, toggle, reloadIds } = useFavoriteBusinesses();
  const { categories: businessCategories } = useCategories('BUSINESS');
  // The creator's own onboarding-selected niches — surfaced first in the pill
  // row below. From the shared creator-profile cache (also feeds creator home
  // + Discover), so no getProfile() call on every focus.
  const { data: creatorProfile } = useCreatorProfile();
  const myCategories = creatorProfile?.categories ?? EMPTY_STRINGS;
  const pillCategories = sortOtherLast(sortSelectedFirst(businessCategories, myCategories));

  const [search, setSearch] = useState('');
  // Debounced copy that actually feeds the query key — `search` stays live for
  // the text input, `committedSearch` lags it by 450ms.
  const [committedSearch, setCommittedSearch] = useState('');
  const [category, setCategory]   = useState('');
  const [platform, setPlatform]   = useState('');
  const [locations, setLocations] = useState<LocationFilter>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [filterOpen,   setFilterOpen]   = useState(false);
  const [tempPlatform, setTempPlatform] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const locationLabels = locations.map((l) => l.label);

  // ── Data — cache-first (see queryClient.ts). The paginated directory and the
  // un-paginated favourites list are two separate caches; `savedOnly` switches
  // which one is enabled. Every committed filter is part of the query key, so
  // changing one just re-renders into a cache-first fetch.
  const listQuery = useInfiniteQuery({
    queryKey: ['businesses', 'list', { search: committedSearch, category, platform, locationLabels }],
    queryFn: ({ pageParam }) => businessService.listBusinesses({
      search: committedSearch || undefined,
      category, platform, locations: locationLabels,
      page: pageParam, limit: PAGE_SIZE,
    }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.businesses.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    enabled: !savedOnly,
    staleTime: STALE.list,
  });

  const savedQuery = useQuery({
    queryKey: ['businesses', 'favorites', { category, platform, locationLabels }],
    queryFn: () => businessService.getFavoriteBusinesses({ category, platform, locations: locationLabels }),
    enabled: savedOnly,
    staleTime: STALE.list,
  });

  const businesses: BusinessListItem[] = savedOnly
    ? (savedQuery.data ?? EMPTY_BUSINESSES)
    : (() => {
        const pages = listQuery.data?.pages;
        if (!pages) return EMPTY_BUSINESSES;
        const seen = new Set<string>();
        const out: BusinessListItem[] = [];
        for (const p of pages) for (const b of p.businesses) {
          if (!seen.has(b.id)) { seen.add(b.id); out.push(b); }
        }
        return out;
      })();
  const total = savedOnly ? businesses.length : (listQuery.data?.pages[0]?.total ?? 0);
  const loading = savedOnly ? savedQuery.isPending : listQuery.isPending;
  const loadingMore = listQuery.isFetchingNextPage;
  const activeQuery = savedOnly ? savedQuery : listQuery;
  const error = activeQuery.isError && businesses.length === 0
    ? (activeQuery.error instanceof Error ? activeQuery.error.message : 'Failed to load businesses')
    : '';

  function loadMoreBusinesses() {
    if (!savedOnly && listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
      void listQuery.fetchNextPage();
    }
  }

  // Re-sync favorite IDs whenever this screen comes back into focus
  // (handles the case where user removed favorites on the Favorites screen)
  useFocusEffect(useCallback(() => { reloadIds(); }, []));

  function onSearchChange(text: string) {
    setSearch(text);
    if (savedOnly) return; // favourites list is filtered client-side (displayItems)
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setCommittedSearch(text), 450);
  }

  // Single-select — tapping the already-active category clears it.
  function toggleCategory(label: string) {
    setCategory((prev) => (prev === label ? '' : label));
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
    // Committed filter state becomes the query key on the next render.
  }

  function resetFilter() {
    setTempPlatform('');
    setTempCategory('');
    setTempLocation([]);
  }

  function clearAll() {
    setSearch(''); setCommittedSearch(''); setCategory(''); setPlatform(''); setLocations([]);
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await activeQuery.refetch(); } finally { setRefreshing(false); }
  }

  async function handleToggleFavorite(businessId: string) {
    const wasFavorited = favoriteIds.has(businessId);
    try {
      const isFavorited = await toggle(businessId);
      if (isFavorited) toast.success(t('explore.businesses.addedToFavorites'));
      // In the saved-only view, un-favouriting drops it from the list right
      // away — displayItems below filters out anything no longer in favoriteIds.
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
  const displayItems: DisplayBusiness[] = businesses
    .map((b) => ({ ...b, isFavorited: favoriteIds.has(b.id) }))
    .filter((b) => {
      if (!savedOnly) return true;
      // Saved view: a just-un-favourited row disappears immediately; the
      // favourites endpoint has no server search, so filter by name here too.
      if (!b.isFavorited) return false;
      const q = search.trim().toLowerCase();
      return !q || (b.businessName ?? '').toLowerCase().includes(q);
    });

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
        categories={pillCategories}
        activeLabels={category ? [category] : []}
        onToggle={toggleCategory}
        showAll
        onAllPress={() => setCategory('')}
      />

      {/* Active filters aren't echoed as a pill row on the listing — the
          filter button keeps its badge count and the filter sheet owns the
          chips + "Reset all". The empty state still offers a one-tap clear. */}

      {/* Always a stable flex:1 region below the header/pills, so the empty
          state reliably centers regardless of how tall the pill row above
          it is. */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
          </View>
        ) : error ? (
          <EmptyState faIcon="exclamation-triangle" title={t('explore.businesses.loadError')} subtitle={error} action={{ label: t('explore.businesses.retry'), onPress: () => activeQuery.refetch() }} />
        ) : displayItems.length === 0 ? (
          <EmptyState
            faIcon={savedOnly ? 'heart' : 'building'}
            title={savedOnly && !hasFilter ? t('explore.businesses.noSavedTitle') : t('explore.businesses.noResultsFiltered')}
            subtitle={
              savedOnly && !hasFilter ? t('explore.businesses.noSavedSub')
              : hasFilter ? 'Try adjusting your filters or search term.'
              : 'No businesses are currently hiring. Check back soon!'
            }
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
            onEndReached={loadMoreBusinesses}
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

  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, fontFamily: F.regular },
  // paddingTop matches explore-creators.tsx's People tab list — keeps the
  // gap between the category pill row and the first card identical across
  // both tabs in the Discover shell.
  list:           { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  footerLoading:  { paddingVertical: 20 },
});
