import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { EntityCard } from '@/components/EntityCard';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type SavedCreatorItem } from '@/services/creator';
import { EmptyState } from '@/components/EmptyState';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import {
  CreatorFilterModal,
  DEFAULT_CREATOR_FILTER,
  creatorFilterActiveCount,
  isCreatorFilterActive,
  formatCreatorRate,
  CREATOR_SLIDER_MIN,
  CREATOR_SLIDER_MAX,
  type CreatorFilterState,
} from '@/components/CreatorFilterModal';
import { useAllCategories, useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { F, RADIUS } from '@/utilities/constants';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** First admin category (in order) that matches one of a creator's category labels. */
function firstCategoryMeta(categories: ReturnType<typeof useAllCategories>['categories'], creatorCats: string[]) {
  for (const name of creatorCats) {
    const match = categories.find((c) => c.name === name);
    if (match) return { icon: match.icon, bg: match.iconBg, color: match.color };
  }
  return { icon: 'bullseye', bg: '#F0F0F0', color: '#6B7280' };
}

function CreatorCard({ item, onRemove }: { item: SavedCreatorItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const { creator } = item;
  const meta = firstCategoryMeta(allCategories, creator.categories);
  const topAccount = creator.socialAccounts.length > 0
    ? [...creator.socialAccounts].sort((a, b) => b.followers - a.followers)[0]
    : null;
  const topPlatform = topAccount ? getPlatformMeta(allPlatforms, topAccount.platform) : null;
  const extraCats = creator.categories.length - 1;

  return (
    <EntityCard
      avatarUrl={creator.avatarUrl}
      avatarBg={meta.bg}
      initials={getInitials(creator.fullName ?? 'Creator')}
      circularAvatar
      ringColor={meta.color}
      name={creator.fullName ?? 'Creator'}
      verified={creator.isVerified}
      locationText={creator.location ?? undefined}
      categoryLabel={creator.categories.length > 0 ? creator.categories[0] : undefined}
      categoryIcon={meta.icon}
      categoryColor={meta.color}
      categoryBg={meta.bg}
      extraCount={extraCats}
      stat={topAccount && topPlatform ? {
        icon: topPlatform.icon,
        color: topPlatform.color,
        text: formatFollowers(topAccount.followers),
      } : undefined}
      ctaLabel={t('explore.viewProfile')}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}
      action={{
        active: true,
        onToggle: onRemove,
        activeIcon: 'bookmark',
        inactiveIcon: 'bookmark-outline',
        activeColor: C.brinjal1,
        activeBg: C.primaryLight,
        bordered: true,
      }}
    />
  );
}

export default function SavedCreatorsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();

  const [items, setItems]     = useState<SavedCreatorItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  const [tempFilter, setTempFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  const { categories: adminCategories } = useCategories('CREATOR');
  const availableCategories = adminCategories.map((c) => c.name);

  const filterActive = isCreatorFilterActive(activeFilter);
  const filterCount  = creatorFilterActiveCount(activeFilter);

  async function load(filter: CreatorFilterState, nameSearch: string) {
    setLoading(true);
    try {
      const locationText = filter.locations.length > 0
        ? filter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label).join(',')
        : undefined;

      const data = await creatorService.getSavedCreators({
        search: nameSearch.trim() || undefined,
        location: locationText || undefined,
        categories: filter.categories.length ? filter.categories : undefined,
        platforms: filter.platforms.length ? filter.platforms : undefined,
        priceMin: filter.priceMin > CREATOR_SLIDER_MIN ? filter.priceMin : undefined,
        priceMax: filter.priceMax < CREATOR_SLIDER_MAX ? filter.priceMax : undefined,
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { void load(activeFilter, searchDebounced); }, []));

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    void load(activeFilter, searchDebounced);
  }, [searchDebounced, activeFilter]);

  async function handleRemove(creatorId: string) {
    setItems((prev) => prev.filter((i) => i.creator.id !== creatorId));
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      void load(activeFilter, searchDebounced); // re-sync on error
    }
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
    setTempFilter(DEFAULT_CREATOR_FILTER);
  }

  function removeActiveFilter<K extends keyof CreatorFilterState>(key: K, value?: unknown) {
    if (key === 'locations' && value !== undefined) {
      setActiveFilter({ ...activeFilter, locations: activeFilter.locations.filter((l) => l.label !== value) });
    } else if (key === 'platforms' && value !== undefined) {
      setActiveFilter({ ...activeFilter, platforms: activeFilter.platforms.filter((p) => p !== value) });
    } else if (key === 'categories' && value !== undefined) {
      setActiveFilter({ ...activeFilter, categories: activeFilter.categories.filter((c) => c !== value) });
    } else if (key === 'priceMin' || key === 'priceMax') {
      setActiveFilter({ ...activeFilter, priceMin: CREATOR_SLIDER_MIN, priceMax: CREATOR_SLIDER_MAX });
    }
  }

  const hasFilter = !!(search || filterActive);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header — back button + search, same row */}
      <View style={s.header} accessibilityRole="header" accessibilityLabel={t('savedCreators.title')}>
        <BackButton />
        <View style={[s.searchCard, { flex: 1, backgroundColor: C.surface, borderColor: C.border }]}>
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
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[
              s.filterBtn,
              { backgroundColor: filterActive ? C.brinjal1 : C.primaryLight },
              filterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
            ]}
            onPress={openFilter}
            hitSlop={6}>
            <Ionicons name="options-outline" size={18} color={filterActive ? '#fff' : C.brinjal1} />
            {filterActive && (
              <View style={s.filterCountBadge}>
                <Text style={s.filterCountBadgeTxt}>{filterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Result count */}
      {!loading && items.length > 0 && (
        <Text style={[s.countText, { color: C.textSecondary }]}>
          {items.length !== 1
            ? t('savedCreators.creatorsSaved', { n: items.length })
            : t('savedCreators.creatorSaved', { n: items.length })}
        </Text>
      )}

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
          {(activeFilter.priceMin > CREATOR_SLIDER_MIN || activeFilter.priceMax < CREATOR_SLIDER_MAX) && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => removeActiveFilter('priceMin')} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <FontAwesome5 name="wallet" size={11} color={getIconColor('wallet')} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{formatCreatorRate(activeFilter.priceMin)}–{activeFilter.priceMax >= CREATOR_SLIDER_MAX ? `${formatCreatorRate(CREATOR_SLIDER_MAX)}+` : formatCreatorRate(activeFilter.priceMax)}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          )}
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
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setActiveFilter(DEFAULT_CREATOR_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>{t('common.clearAll')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <CreatorCard item={item} onRemove={() => handleRemove(item.creator.id)} />
          )}
          contentContainerStyle={[s.list, items.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            hasFilter ? (
              <EmptyState
                faIcon="search"
                title={t('explore.noCreators')}
                subtitle={t('explore.adjustFilters')}
                action={{ label: t('explore.clearFilters'), onPress: () => { setSearch(''); setActiveFilter(DEFAULT_CREATOR_FILTER); } }}
              />
            ) : (
              <EmptyState
                faIcon="bookmark"
                title={t('savedCreators.empty')}
                subtitle={t('savedCreators.emptySub')}
                action={{ label: t('savedCreators.browseCTA'), onPress: () => router.push('/(business)/explore-creators') }}
              />
            )
          }
        />
      )}

      <CreatorFilterModal
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

const s = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12 },

  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  countText: { fontSize: 12, fontFamily: F.semibold, paddingHorizontal: 20, marginTop: 4, marginBottom: 4 },

  chipRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: F.semibold },

  list:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 14 },
  listEmpty: { flexGrow: 1 },
});
