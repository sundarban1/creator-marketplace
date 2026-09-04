import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchInput } from '@/components/SearchInput';
import { BackButton } from '@/components/BackButton';
import { BusinessFilterModal } from '@/components/BusinessFilterModal';
import { EntityCard } from '@/components/EntityCard';
import { realImageUrl } from '@/utilities/avatar';
import { type LocationFilter } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { prefetchBusiness } from '@/lib/prefetch';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

const EMPTY_BUSINESSES: BusinessListItem[] = [];

function BusinessCard({ item, onRemove }: { item: BusinessListItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
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
      description={item.description || t('explore.businesses.noDescription')}
      descriptionItalic={!item.description}
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
      onPressIn={() => prefetchBusiness(queryClient, item.id)}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } })}
      action={{
        active: true,
        onToggle: onRemove,
        activeIcon: 'heart',
        inactiveIcon: 'heart',
        activeColor: '#EF4444',
        activeBg: '#FEE2E2',
      }}
    />
  );
}

export default function FavoriteBusinessesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch]   = useState('');
  const { toggle }            = useFavoriteBusinesses();

  const [category,  setCategory]  = useState('');
  const [platform,  setPlatform]  = useState('');
  const [locations, setLocations] = useState<LocationFilter>([]);

  const [filterOpen,   setFilterOpen]   = useState(false);
  const [tempPlatform, setTempPlatform] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);

  // Committed filters are the query key — changing one re-renders into a
  // cache-first fetch, no explicit load(overrides) plumbing needed.
  const favoritesKey = ['businesses', 'favorites', { category, platform, locations: locations.map((l) => l.label) }] as const;
  const favoritesQuery = useQuery({
    queryKey: favoritesKey,
    queryFn: () => businessService.getFavoriteBusinesses({ category, platform, locations: locations.map((l) => l.label) }),
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(favoritesQuery);
  const items = favoritesQuery.data ?? EMPTY_BUSINESSES;
  const loading = favoritesQuery.isPending;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.businessName ?? '').toLowerCase().includes(q));
  }, [items, search]);

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
  }

  function resetFilter() {
    setTempPlatform('');
    setTempCategory('');
    setTempLocation([]);
  }

  const filterActiveCount = [!!category, !!platform, locations.length > 0].filter(Boolean).length;
  const isFilterActive    = filterActiveCount > 0;

  // Optimistic removal — un-favouriting is low-risk/reversible (§20) — rolled
  // back on failure via the snapshot taken before the write.
  async function handleRemove(businessId: string) {
    const previous = queryClient.getQueryData<BusinessListItem[]>(favoritesKey);
    queryClient.setQueryData<BusinessListItem[]>(favoritesKey, (prev) => prev?.filter((i) => i.id !== businessId));
    try {
      await toggle(businessId);
    } catch {
      queryClient.setQueryData(favoritesKey, previous);
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* Header — back button + search, same row */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]} accessibilityRole="header" accessibilityLabel={t('favoriteBrands.title')}>
        <BackButton />
        <View style={[s.searchBox, { flex: 1 }]}>
          <View style={{ flex: 1 }}>
            <SearchInput
              placeholder={t('explore.businesses.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
          <Pressable
            style={[
              s.filterBtn,
              { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight },
              isFilterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
            ]}
            onPress={openFilter}
            hitSlop={6}>
            <FontAwesome5 name="sliders-h" solid size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
            {isFilterActive && (
              <View style={s.filterCountBadge}>
                <Text style={s.filterCountBadgeTxt}>{filterActiveCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Active filter pills */}
      {isFilterActive && (
        <View style={s.activePills}>
          {locations.map((loc) => (
            <Pressable
              key={loc.label}
              style={[s.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => setLocations(locations.filter((l) => l.label !== loc.label))}>
              <FontAwesome5 name={loc.label === 'Remote' ? 'globe' : 'map-marker-alt'} solid size={11} color={C.brinjal1} />
              <Text style={[s.activePillText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          {platform ? (
            <Pressable
              style={[s.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => setPlatform('')}>
              <Text style={[s.activePillText, { color: C.brinjal1 }]}>{platform}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          {category ? (
            <Pressable
              style={[s.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => setCategory('')}>
              <Text style={[s.activePillText, { color: C.brinjal1 }]}>{category}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => { setCategory(''); setPlatform(''); setLocations([]); }}>
            <Text style={[s.clearAllText, { color: C.error }]}>{t('explore.businesses.clearAll')}</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <BusinessCard item={item} onRemove={() => handleRemove(item.id)} />
          )}
          contentContainerStyle={[s.list, filteredItems.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            search || isFilterActive ? (
              <View style={s.empty}>
                <FontAwesome5 name="search" solid size={40} color={C.textSecondary} style={s.emptyIcon} />
                <Text style={[s.emptyTitle, { color: C.text }]}>{t('explore.businesses.noResultsFiltered')}</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>{t('explore.businesses.noResultsFilteredSub')}</Text>
              </View>
            ) : (
              <View style={s.empty}>
                <FontAwesome5 name="heart" size={40} color={C.textSecondary} style={s.emptyIcon} />
                <Text style={[s.emptyTitle, { color: C.text }]}>{t('favoriteBrands.empty')}</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                  {t('favoriteBrands.emptySub')}
                </Text>
                <Pressable
                  style={[
                    s.emptyBtn,
                    {
                      backgroundColor: '#F97316', shadowColor: '#F97316',
                      shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                    },
                  ]}
                  onPress={() => router.push('/(creator)/explore-businesses')}>
                  <Text style={s.emptyBtnText}>{t('favoriteBrands.browseCTA')}</Text>
                </Pressable>
              </View>
            )
          }
        />
      )}
      </MaxWidthContainer>

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

const s = StyleSheet.create({
  container: { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.md, gap: 12, borderBottomWidth: 1 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterBtn:   { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontFamily: F.semibold },
  clearAllText:   { fontSize: 12, fontFamily: F.bold },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listEmpty: { flexGrow: 1 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { marginBottom: 2 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn:   { borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
