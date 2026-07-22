import { router, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { BusinessFilterModal } from '@/components/BusinessFilterModal';
import { EntityCard } from '@/components/EntityCard';
import { type LocationFilter } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { F, RADIUS } from '@/utilities/constants';

function BusinessCard({ item, onRemove }: { item: BusinessListItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: businessCategories } = useCategories('BUSINESS');
  const primaryMeta = item.categories.length > 0 ? getCategoryMeta(businessCategories, item.categories[0]) : null;
  const extraCats = item.categories.length - 1;
  const hasEvents = item._count.campaigns > 0;
  const initials = (item.businessName ?? 'Business').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <EntityCard
      avatarUrl={item.logoUrl}
      avatarBg={C.primaryLight}
      initials={initials}
      circularAvatar
      ringColor={primaryMeta?.color ?? C.brinjal1}
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
        icon: 'megaphone-outline',
        iconSet: 'ionicons',
        color: hasEvents ? C.brinjal1 : C.textSecondary,
        text: hasEvents ? t('explore.businesses.campaignsBadge', { n: item._count.campaigns }) : t('explore.businesses.noEventsYet'),
      }}
      ctaLabel={t('explore.businesses.viewBusiness')}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } })}
      action={{
        active: true,
        onToggle: onRemove,
        activeIcon: 'heart',
        inactiveIcon: 'heart-outline',
        activeColor: '#EF4444',
        activeBg: '#FEE2E2',
      }}
    />
  );
}

export default function FavoriteBusinessesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [items, setItems]     = useState<BusinessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const { toggle }            = useFavoriteBusinesses();

  const [category,  setCategory]  = useState('');
  const [platform,  setPlatform]  = useState('');
  const [locations, setLocations] = useState<LocationFilter>([]);

  const [filterOpen,   setFilterOpen]   = useState(false);
  const [tempPlatform, setTempPlatform] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.businessName ?? '').toLowerCase().includes(q));
  }, [items, search]);

  async function load(opts?: { category?: string; platform?: string; locations?: LocationFilter }) {
    setLoading(true);
    try {
      const data = await businessService.getFavoriteBusinesses({
        category:  opts?.category  !== undefined ? opts.category  : category,
        platform:  opts?.platform  !== undefined ? opts.platform  : platform,
        locations: (opts?.locations !== undefined ? opts.locations : locations).map((l) => l.label),
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

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
    void load({ platform: tempPlatform, category: tempCategory, locations: tempLocation });
  }

  function resetFilter() {
    setTempPlatform('');
    setTempCategory('');
    setTempLocation([]);
  }

  const filterActiveCount = [!!category, !!platform, locations.length > 0].filter(Boolean).length;
  const isFilterActive    = filterActiveCount > 0;

  async function handleRemove(businessId: string) {
    setItems((prev) => prev.filter((i) => i.id !== businessId));
    try {
      await toggle(businessId);
    } catch {
      load();
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header — back button + search, same row */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]} accessibilityRole="header" accessibilityLabel={t('favoriteBrands.title')}>
        <BackButton />
        <View style={[s.searchBox, { flex: 1, backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: C.text }]}
            placeholder={t('explore.businesses.searchPlaceholder')}
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[
              s.filterBtn,
              { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight },
              isFilterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
            ]}
            onPress={openFilter}
            hitSlop={6}>
            <Ionicons name="options-outline" size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={loc.label}
              style={[s.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => {
                const next = locations.filter((l) => l.label !== loc.label);
                setLocations(next);
                void load({ locations: next });
              }}>
              <Ionicons name={loc.label === 'Remote' ? 'globe-outline' : 'location'} size={11} color={C.brinjal1} />
              <Text style={[s.activePillText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          {platform ? (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[s.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setPlatform(''); void load({ platform: '' }); }}>
              <Text style={[s.activePillText, { color: C.brinjal1 }]}>{platform}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          {category ? (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[s.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setCategory(''); void load({ category: '' }); }}>
              <Text style={[s.activePillText, { color: C.brinjal1 }]}>{category}</Text>
              <Ionicons name="close" size={12} color={C.brinjal1} />
            </Pressable>
          ) : null}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setCategory(''); setPlatform(''); setLocations([]); void load({ category: '', platform: '', locations: [] }); }}>
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
          ListEmptyComponent={
            search || isFilterActive ? (
              <View style={s.empty}>
                <FontAwesome5 name="search" size={40} color={C.textSecondary} style={s.emptyIcon} />
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
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12, borderBottomWidth: 1 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.regular },
  filterBtn:   { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontFamily: F.semibold },
  clearAllText:   { fontSize: 12, fontFamily: F.bold },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48, gap: 14 },
  listEmpty: { flexGrow: 1 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { marginBottom: 2 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn:   { borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
