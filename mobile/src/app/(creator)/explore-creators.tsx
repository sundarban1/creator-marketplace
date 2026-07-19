import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { EmptyState } from '@/components/EmptyState';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterSheet, FilterSectionHeader, ActiveFilterChips, type ActiveFilterChip } from '@/components/FilterSheet';
import { LocationSearchPicker, type LocationEntry } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';
import { GRADIENTS, F, RADIUS, SHADOW } from '@/utilities/constants';
import { useAllCategories, useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import type { ApiCategory } from '@/services/category';

const PAGE_SIZE = 10;
const MAX_LOCS = 3;

// ─── Constants ────────────────────────────────────────────────────────────────

/** First admin category (in order) that matches one of a creator's category labels. */
function firstCategoryMeta(categories: ApiCategory[], creatorCats: string[]) {
  for (const name of creatorCats) {
    const match = categories.find((c) => c.name === name);
    if (match) return { icon: match.icon, bg: match.iconBg, color: match.color };
  }
  return { icon: 'bullseye', bg: '#F0F0F0', color: '#6B7280' };
}
function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// ─── Filter state ─────────────────────────────────────────────────────────────

type FilterState = {
  locations: LocationEntry[];
  platforms: string[];
  categories: string[];
};

const DEFAULT_FILTER: FilterState = {
  locations: [],
  platforms: [],
  categories: [],
};

function filterActiveCount(f: FilterState) {
  return [
    f.locations.length > 0,
    f.platforms.length > 0,
    f.categories.length > 0,
  ].filter(Boolean).length;
}
function isFilterActive(f: FilterState) {
  return filterActiveCount(f) > 0;
}


// ─── Filter Modal ─────────────────────────────────────────────────────────────

function ExploreFilterModal({
  visible, temp, setTemp, availableCategories,
  onApply, onReset, onClose,
}: {
  visible: boolean;
  temp: FilterState;
  setTemp: (f: FilterState) => void;
  availableCategories: string[];
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();

  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    setTemp({ ...temp, [key]: val });
  }

  const activeChips: ActiveFilterChip[] = [];
  for (const loc of temp.locations) {
    activeChips.push({
      key: `loc-${loc.label}`,
      label: loc.label === 'Remote' ? t('filterModal.remote') : loc.label,
      onClear: () => set('locations', temp.locations.filter((l) => l.label !== loc.label)),
    });
  }
  for (const p of temp.platforms) {
    const label = allPlatforms.find((x) => x.key === p)?.name ?? p;
    activeChips.push({ key: `plat-${p}`, label, onClear: () => set('platforms', temp.platforms.filter((x) => x !== p)) });
  }
  for (const cat of temp.categories) {
    activeChips.push({ key: `cat-${cat}`, label: cat, onClear: () => set('categories', temp.categories.filter((x) => x !== cat)) });
  }

  const applyLabel = activeChips.length > 0
    ? t('explore.applyFiltersCount', { n: activeChips.length })
    : t('explore.showAllCreators');

  return (
    <FilterSheet
      visible={visible}
      title={t('explore.filterCreators')}
      resetLabel={t('explore.resetAll')}
      applyLabel={applyLabel}
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <ActiveFilterChips chips={activeChips} />

      {/* Category */}
      {availableCategories.length > 0 && (
        <View>
          <FilterSectionHeader
            icon="pricetag-outline"
            label={t('explore.category')}
            hint={temp.categories.length > 0 ? t('filterModal.selectedCount', { count: temp.categories.length }) : undefined}
          />
          <View style={fm.chips}>
            {availableCategories.map((cat) => {
              const meta = getCategoryMeta(allCategories, cat);
              const sel = temp.categories.includes(cat);
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={cat}
                  onPress={() => set('categories', toggle(temp.categories, cat))}
                  style={[fm.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                  <FontAwesome5 name={meta.icon} size={12} color={sel ? meta.color : C.textSecondary} />
                  <Text style={[fm.chipText, { color: sel ? C.brinjal1 : C.text, fontWeight: sel ? '700' : '500' }]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Platform — sourced from the admin platform catalog so every supported
          platform is always selectable, not just ones a creator already connected. */}
      {allPlatforms.length > 0 && (
        <View>
          <FilterSectionHeader
            icon="phone-portrait-outline"
            label={t('explore.platform')}
            hint={temp.platforms.length > 0 ? t('filterModal.selectedCount', { count: temp.platforms.length }) : undefined}
          />
          <View style={fm.chips}>
            {allPlatforms.map((p) => {
              const sel = temp.platforms.includes(p.key);
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={p.key}
                  onPress={() => set('platforms', toggle(temp.platforms, p.key))}
                  style={[fm.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                  <FontAwesome5 name={p.icon} size={13} color={sel ? C.brinjal1 : p.color} />
                  <Text style={[fm.chipText, { color: sel ? C.brinjal1 : C.text, fontWeight: sel ? '700' : '500' }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Location — kept last */}
      <View>
        <FilterSectionHeader
          icon="location-outline"
          label={t('explore.location')}
          hint={t('explore.locationsAllowed', { count: temp.locations.length, max: MAX_LOCS })}
        />
        <LocationSearchPicker selected={temp.locations} onSelect={(v) => set('locations', v)} />
      </View>
    </FilterSheet>
  );
}

const fm = StyleSheet.create({
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: F.medium },
});

// ─── Creator Avatar ───────────────────────────────────────────────────────────

function CreatorAvatar({ avatarUrl, bg, ringColor }: { avatarUrl: string | null; bg: string; ringColor: string }) {
  const [failed, setFailed] = useState(false);
  const ring = { borderWidth: 2, borderColor: ringColor };
  if (avatarUrl && !failed) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[s.avatar, ring]}
        contentFit="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[s.avatar, s.avatarPlaceholder, { backgroundColor: bg }, ring]}>
      <View style={s.avatarIconWrap}>
        <Ionicons name="person" size={30} color="rgba(91,33,182,0.55)" />
      </View>
    </View>
  );
}

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator }: { creator: ApiCreatorListItem }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const meta = firstCategoryMeta(allCategories, creator.categories);
  const topAccount = creator.socialAccounts.length > 0
    ? [...creator.socialAccounts].sort((a, b) => b.followers - a.followers)[0]
    : null;
  const topPlatform = topAccount ? getPlatformMeta(allPlatforms, topAccount.platform) : null;
  const extraCats = creator.categories.length - 1;

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [s.card, { backgroundColor: C.surface }, pressed && { opacity: 0.92 }]}
      onPress={() => router.push({ pathname: '/(creator)/creator-detail', params: { id: creator.id } })}>
      <View style={s.cardBody}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <CreatorAvatar avatarUrl={creator.avatarUrl} bg={meta.bg} ringColor={meta.color} />

          <View style={s.cardMeta}>
            <View style={s.nameRow}>
              <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{creator.fullName ?? 'Creator'}</Text>
              {(creator.fullyVerified || creator.isVerified) && <VerifiedBadge size={14} />}
            </View>
            {creator.location ? (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={12} color={C.textSecondary} />
                <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1}>{creator.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {creator.bio ? (
          <Text style={[s.bio, { color: C.textSecondary }]} numberOfLines={2}>{creator.bio}</Text>
        ) : null}

        {/* One consolidated stat row: primary category + top platform reach — a soft tray, not a divider line */}
        <View style={[s.statRow, { backgroundColor: C.background }]}>
          {creator.categories.length > 0 && (
            <View style={[s.catPill, { backgroundColor: meta.bg }]}>
              <FontAwesome5 name={meta.icon} size={10} color={meta.color} />
              <Text style={[s.catLabel, { color: meta.color }]} numberOfLines={1}>{creator.categories[0]}</Text>
              {extraCats > 0 && <Text style={[s.catLabel, { color: meta.color }]}>+{extraCats}</Text>}
            </View>
          )}
          {topAccount && topPlatform ? (
            <View style={s.platformStat}>
              <FontAwesome5 name={topPlatform.icon} size={12} color={topPlatform.color} />
              <Text style={[s.platformCount, { color: C.text }]}>{formatFollowers(topAccount.followers)}</Text>
            </View>
          ) : null}
        </View>

        <View style={[s.viewBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]}>
          <Text style={s.viewBtnText}>{t('explore.viewProfile')}</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreCreatorPeersScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();

  const [creators, setCreators] = useState<ApiCreatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [tempFilter, setTempFilter] = useState<FilterState>(DEFAULT_FILTER);
  const { categories: adminCategories } = useCategories('CREATOR');
  const availableCategories = adminCategories.map((c) => c.name);

  const filterActive = isFilterActive(activeFilter);
  const filterCount  = filterActiveCount(activeFilter);

  // Ref (not state) so the guard is synchronous — FlatList's onEndReached can
  // fire multiple times before a state update commits, otherwise triggering
  // the same page fetch twice and appending duplicate creators (duplicate keys).
  const loadingMoreRef = useRef(false);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  async function fetchCreators(p: number, replace: boolean, filter: FilterState, nameSearch: string) {
    if (p === 1 && replace) setLoading(true);
    else if (!replace) setLoadingMore(true);
    setError('');
    try {
      const locationText = filter.locations.length > 0
        ? filter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label).join(',')
        : undefined;

      const res = await creatorService.listPeerCreators({
        page: p,
        limit: PAGE_SIZE,
        search: nameSearch.trim() || undefined,
        location: locationText || undefined,
        categories: filter.categories.length ? filter.categories : undefined,
        platforms: filter.platforms.length ? filter.platforms : undefined,
      });
      setTotal(res.total);
      setCreators((prev) => {
        if (replace) return res.creators;
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.creators.filter((c) => !seen.has(c.id))];
      });
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load creators');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchCreators(1, true, activeFilter, searchDebounced);
  }, [searchDebounced, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCreators(1, true, activeFilter, searchDebounced);
  }, [searchDebounced, activeFilter]);

  function loadMore() {
    if (loadingMoreRef.current || page >= Math.ceil(total / PAGE_SIZE)) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void fetchCreators(page + 1, false, activeFilter, searchDebounced);
  }

  function openFilter() {
    setTempFilter(activeFilter);
    setFilterVisible(true);
  }

  function applyFilter() {
    setFilterVisible(false);
    setActiveFilter(tempFilter);
  }

  function resetFilter() {
    setTempFilter(DEFAULT_FILTER);
  }

  function removeActiveFilter<K extends keyof FilterState>(key: K, value?: unknown) {
    if (key === 'locations' && value !== undefined) {
      setActiveFilter({ ...activeFilter, locations: activeFilter.locations.filter((l) => l.label !== value) });
    } else if (key === 'platforms' && value !== undefined) {
      setActiveFilter({ ...activeFilter, platforms: activeFilter.platforms.filter((p) => p !== value) });
    } else if (key === 'categories' && value !== undefined) {
      setActiveFilter({ ...activeFilter, categories: activeFilter.categories.filter((c) => c !== value) });
    }
  }

  const hasMore = page < Math.ceil(total / PAGE_SIZE);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={GRADIENTS.hero} start={{x:0,y:0}} end={{x:1,y:1}} style={s.gradientHeader}>
        {/* Header */}
        <View style={s.header}>
          <BackButton fallback="/(creator)/(tabs)" />
          <View style={s.headerMiddle}>
            <Text style={[s.headerTitle, { color: '#fff' }]}>{t('explore.exploreCreators')}</Text>
            <Text style={s.headerSub}>{t('explore.creatorPeersSub')}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {/* Search + filter — outside gradient */}
      <View style={s.searchRow}>
        <View style={[s.searchCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: C.text }]}
            placeholder={t('explore.searchCreators')}
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[
            s.filterBtn,
            { backgroundColor: filterActive ? C.brinjal1 : C.surface, borderColor: filterActive ? C.brinjal1 : C.border },
            filterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
          ]}
          onPress={openFilter}>
          <Ionicons name="options-outline" size={20} color={filterActive ? '#fff' : C.brinjal1} />
          {filterActive && (
            <View style={s.filterCountBadge}>
              <Text style={s.filterCountBadgeTxt}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active filter chips */}
      {filterActive && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {activeFilter.locations.map((loc) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={loc.label} onPress={() => removeActiveFilter('locations', loc.label)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Ionicons name={loc.label === 'Remote' ? 'globe-outline' : 'location'} size={12} color={C.brinjal1} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          {activeFilter.platforms.map((p) => {
            const meta = getPlatformMeta(allPlatforms, p);
            const label = allPlatforms.find((x) => x.key === p)?.name ?? p;
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={p} onPress={() => removeActiveFilter('platforms', p)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
                <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                <Text style={[s.chipText, { color: C.brinjal1 }]}>{label}</Text>
                <Ionicons name="close" size={12} color={C.brinjal1} />
              </Pressable>
            );
          })}
          {activeFilter.categories.map((cat) => {
            const meta = getCategoryMeta(allCategories, cat);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={cat} onPress={() => removeActiveFilter('categories', cat)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
                <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                <Text style={[s.chipText, { color: C.brinjal1 }]}>{cat}</Text>
                <Ionicons name="close" size={12} color={C.brinjal1} />
              </Pressable>
            );
          })}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setActiveFilter(DEFAULT_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>{t('common.clearAll')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Result count */}
      {!loading && creators.length > 0 && (
        <Text style={[s.countText, { color: C.textSecondary }]}>
          {total !== 1 ? t('explore.creatorsFoundPlural', { count: total }) : t('explore.creatorsFound', { count: total })}
        </Text>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[s.loadingText, { color: C.textSecondary }]}>{t('explore.findingCreators')}</Text>
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.error')}
          subtitle={error}
          action={{ label: t('common.retry'), onPress: () => fetchCreators(1, true, activeFilter, searchDebounced) }}
        />
      ) : creators.length === 0 ? (
        <View style={s.centered}>
          <FontAwesome5 name="users" size={44} color={C.textSecondary} style={s.emptyIcon} />
          <Text style={[s.emptyTitle, { color: C.text }]}>{t('explore.noCreators')}</Text>
          <Text style={[s.emptyHint, { color: C.textSecondary }]}>
            {filterActive || search ? t('explore.adjustFilters') : t('explore.noCreatorsYet')}
          </Text>
          {(filterActive || search) && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setSearch(''); setActiveFilter(DEFAULT_FILTER); }} style={[s.clearBtn, { borderColor: C.brinjal1 }]}>
              <Text style={[s.linkText, { color: C.brinjal1 }]}>{t('explore.clearFilters')}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={creators}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          renderItem={({ item }) => <CreatorCard creator={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={C.brinjal1} style={{ paddingVertical: 20 }} />
            ) : !hasMore && creators.length > 0 ? (
              <View style={s.footerWrap}>
                <View style={[s.footerLine, { backgroundColor: C.border }]} />
                <View style={[s.footerPill, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Ionicons name="checkmark-done" size={13} color={C.brinjal1} />
                  <Text style={[s.footerText, { color: C.textSecondary }]}>
                    {total !== 1 ? t('explore.showingAllPlural', { count: total }) : t('explore.showingAll', { count: total })}
                  </Text>
                </View>
                <View style={[s.footerLine, { backgroundColor: C.border }]} />
              </View>
            ) : null
          }
        />
      )}

      <ExploreFilterModal
        visible={filterVisible}
        temp={tempFilter}
        setTemp={setTempFilter}
        availableCategories={availableCategories}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg, overflow: 'hidden' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 12 },
  headerMiddle: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 20, textAlign: 'center', fontFamily: F.bold, color: '#fff', lineHeight: 24 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular, textAlign: 'center' },

  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  searchCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn: { width: 50, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  chipRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: F.semibold },

  countText: { fontSize: 12, fontFamily: F.semibold, paddingHorizontal: 20, marginTop: 8, marginBottom: 4, textAlign: 'right' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, fontFamily: F.regular },
  linkText: { fontSize: 14, fontFamily: F.bold },
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  clearBtn: { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  card: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.raised },
  cardBody: { padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: RADIUS.md, flexShrink: 0 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarIconWrap: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  cardMeta: { flex: 1, gap: 4, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 16, flexShrink: 1, letterSpacing: -0.3, fontFamily: F.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 12, fontFamily: F.regular },
  platformStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  platformCount: { fontSize: 12, fontFamily: F.bold },
  bio: { fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, flexShrink: 1 },
  catLabel: { fontSize: 11, fontFamily: F.bold, flexShrink: 1 },

  // CTA — echoes the bold pill button on the home page's Featured/Nearby cards
  viewBtn: {
    height: 38, borderRadius: RADIUS.full, marginTop: 2,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  viewBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  footerWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 36, gap: 10 },
  footerLine: { flex: 1, height: 1 },
  footerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1 },
  footerText: { fontSize: 12, fontFamily: F.regular },
});
