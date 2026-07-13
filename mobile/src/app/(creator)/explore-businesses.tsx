import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { EmptyState } from '@/components/EmptyState';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { LocationSearchPicker, type LocationFilter } from '@/features/creator/components/FilterModal';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useToast } from '@/components/Toast';
import { F } from '@/utilities/constants';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';

type DisplayBusiness = BusinessListItem & { isFavorited: boolean };


// ─── Filter Modal ─────────────────────────────────────────────────────────────

function ExploreFilterModal({
  visible,
  tempLocation,
  tempPlatform,
  tempCategory,
  setTempLocation,
  setTempPlatform,
  setTempCategory,
  onApply,
  onReset,
  onClose,
}: {
  visible:         boolean;
  tempLocation:    LocationFilter;
  tempPlatform:    string;
  tempCategory:    string;
  setTempLocation: (v: LocationFilter) => void;
  setTempPlatform: (v: string) => void;
  setTempCategory: (v: string) => void;
  onApply:         () => void;
  onReset:         () => void;
  onClose:         () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: businessCategories } = useCategories('BUSINESS');
  const { platforms: allPlatforms } = usePlatforms();
  const keyboardOffset = useKeyboardOffset();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={fm.backdrop} onPress={onClose} />
      <Animated.View style={[fm.sheet, { backgroundColor: C.surface, transform: [{ translateY: keyboardOffset }] }]}>
        <View style={[fm.handle, { backgroundColor: C.border }]} />

        <View style={[fm.header, { borderBottomColor: C.border }]}>
          <Text style={[fm.title, { color: C.text }]}>{t('explore.businesses.filterTitle')}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={onReset}>
            <Text style={[fm.reset, { color: C.brinjal1 }]}>{t('explore.businesses.filterResetAll')}</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fm.body}>

          {/* Location */}
          <View style={fm.sectionRow}>
            <Text style={[fm.section, { color: C.textSecondary }]}>{t('explore.businesses.filterLocation')}</Text>
            <Text style={[fm.sectionHint, { color: C.textSecondary }]}>{t('explore.businesses.filterLocationCount', { n: tempLocation.length })}</Text>
          </View>
          <LocationSearchPicker selected={tempLocation} onSelect={setTempLocation} />

          {/* Platform */}
          <Text style={[fm.section, { color: C.textSecondary }]}>{t('explore.businesses.filterPlatform')}</Text>
          <View style={fm.chipGrid}>
            {allPlatforms.map((p) => {
              const active = tempPlatform === p.name;
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={p.id}
                  onPress={() => setTempPlatform(active ? '' : p.name)}
                  style={[fm.filterChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.brinjal1 : C.background }]}>
                  <FontAwesome5 name={p.icon} size={12} color={active ? '#fff' : C.textSecondary} />
                  <Text style={[fm.filterChipText, { color: active ? '#fff' : C.text }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category */}
          <Text style={[fm.section, { color: C.textSecondary }]}>{t('explore.businesses.filterCategory')}</Text>
          <View style={fm.chipGrid}>
            {businessCategories.map((cat) => {
              const active = tempCategory === cat.name;
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={cat.id}
                  onPress={() => setTempCategory(active ? '' : cat.name)}
                  style={[fm.filterChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.background }]}>
                  <FontAwesome5 name={cat.icon} size={12} color={active ? cat.color : C.textSecondary} />
                  <Text style={[fm.filterChipText, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '400' }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>

        </ScrollView>

        <View style={[fm.footer, { borderTopColor: C.border }]}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={({ pressed }) => [fm.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={onApply}>
            <Text style={fm.applyTxt}>{t('explore.businesses.filterApplyBtn')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:           { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:           { fontSize: 17, fontFamily: F.bold },
  reset:           { fontSize: 14, fontFamily: F.semibold },
  body:            { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 20 },
  section:         { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0, marginBottom: -4, fontFamily: F.bold },
  sectionRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -4 },
  sectionHint:     { fontSize: 11, fontFamily: F.semibold },
  chipGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipText:  { fontSize: 13, fontFamily: F.medium },
  footer:          { padding: 20, borderTopWidth: 1 },
  applyBtn:        { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyTxt:        { color: '#fff', fontSize: 16, fontFamily: F.bold },
});

// ─── Business Avatar ──────────────────────────────────────────────────────────

function BusinessAvatar({ name, logoUrl, size = 56 }: { name: string; logoUrl: string | null; size?: number }) {
  const C = useAppColors();
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size * 0.28 }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.36, color: C.brinjal1, fontFamily: F.bold }}>{initials}</Text>
    </View>
  );
}

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

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}>

      {/* Top section */}
      <View style={styles.cardTop}>
        <BusinessAvatar name={item.businessName} logoUrl={item.logoUrl} size={56} />

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.bizName, { color: C.text }]} numberOfLines={1}>
              {item.businessName}
            </Text>
            {item.fullyVerified && <VerifiedBadge size={14} />}
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#fff" />
                <Text style={styles.verifiedTxt}>{t('explore.businesses.verifiedBadge')}</Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : (
            <Text style={[styles.desc, { color: C.textSecondary, fontStyle: 'italic' }]}>{t('explore.businesses.noDescription')}</Text>
          )}
        </View>

        {/* Heart */}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[styles.heartBtn, { backgroundColor: isFavorited ? '#FEE2E2' : C.background }]}
          onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          hitSlop={10}>
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorited ? '#EF4444' : C.textSecondary}
          />
        </Pressable>
      </View>

      {/* Category chips */}
      {item.categories.length > 0 && (
        <View style={styles.chips}>
          {item.categories.slice(0, 3).map((cat) => {
            const meta = getCategoryMeta(businessCategories, cat);
            return (
              <View key={cat} style={[styles.chip, { backgroundColor: C.primaryLight, borderColor: 'rgba(79,70,229,0.25)' }]}>
                <FontAwesome5 name={meta.icon} size={10} color={meta.color} />
                <Text style={[styles.chipTxt, { color: C.brinjal1 }]}>{cat}</Text>
              </View>
            );
          })}
          {item.categories.length > 3 && (
            <View style={[styles.chip, { backgroundColor: C.background, borderColor: C.border }]}>
              <Text style={[styles.chipTxt, { color: C.textSecondary }]}>+{item.categories.length - 3} more</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
        <View style={[styles.campaignBadge, { backgroundColor: item._count.campaigns > 0 ? 'rgba(79,70,229,0.1)' : C.background }]}>
          <Ionicons name="megaphone-outline" size={12} color={item._count.campaigns > 0 ? C.brinjal1 : C.textSecondary} />
          <Text style={[styles.campaignBadgeTxt, { color: item._count.campaigns > 0 ? C.brinjal1 : C.textSecondary }]}>
            {item._count.campaigns > 0
              ? `${item._count.campaigns} event${item._count.campaigns !== 1 ? 's' : ''}`
              : 'No events yet'}
          </Text>
        </View>
        <View style={[styles.viewBtn, { backgroundColor: C.brinjal1 }]}>
          <Text style={styles.viewBtnTxt}>{t('explore.businesses.viewProfileBtn')}</Text>
          <Ionicons name="chevron-forward" size={13} color="#fff" />
        </View>
      </View>

    </Pressable>
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

  const isFilterActive  = !!(category || platform || locations.length > 0);
  const hasFilter       = !!(search || category || platform || locations.length > 0);
  const displayItems: DisplayBusiness[] = businesses.map((b) => ({
    ...b,
    isFavorited: favoriteIds.has(b.id),
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <BackButton fallback="/(creator)/" />
          <View style={styles.headerMiddle}>
            <Text style={[styles.heading, { color: '#fff' }]}>{t('explore.businesses.headerTitle')}</Text>
            <Text style={[styles.headingSub, { color: 'rgba(255,255,255,0.82)' }]}>{t('explore.businesses.headerSub')}</Text>
          </View>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={styles.favLink}
            onPress={() => router.push('/(creator)/favorite-businesses' as Parameters<typeof router.push>[0])}>
            <Ionicons name="heart" size={15} color="#fff" />
            <Text style={styles.favLinkText}>{t('explore.businesses.savedLink')}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* ── Search + filter ── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
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
        </View>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[styles.filterBtn, { backgroundColor: isFilterActive ? C.brinjal1 : C.surface, borderColor: isFilterActive ? C.brinjal1 : C.border }]}
          onPress={openFilter}>
          <Ionicons name="options-outline" size={20} color={isFilterActive ? '#fff' : C.brinjal1} />
          {isFilterActive && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {/* Count below search */}
      {!loading && businesses.length > 0 && (
        <View style={styles.countRow}>
          <View style={[styles.countPill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
            <Ionicons name="business-outline" size={13} color={C.brinjal1} />
            <Text style={[styles.countTxt, { color: C.brinjal1 }]}>{businesses.length} brands found</Text>
          </View>
        </View>
      )}

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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('explore.businesses.loading')}</Text>
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

      <ExploreFilterModal
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
  gradientHeader: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 12 },
  headerMiddle:   { flex: 1, alignItems: 'center', gap: 2 },
  heading:        { fontSize: 20, fontFamily: F.bold, color: '#fff', lineHeight: 24 },
  headingSub:     { fontSize: 12, fontFamily: F.regular },
  countRow:       { alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 4 },
  countPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  countTxt:       { fontSize: 12, fontFamily: F.bold },
  favLink:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  favLinkText:    { fontSize: 12, color: '#fff', fontFamily: F.bold },

  // Search row
  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  searchInput:    { flex: 1, fontSize: 15, fontFamily: F.regular },
  filterBtn:      { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  filterDot:      { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  // Active filter pills
  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontFamily: F.semibold },
  clearAllText:   { fontSize: 12, fontFamily: F.bold },

  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, fontFamily: F.regular },
  list:           { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48, gap: 14 },
  listEmpty:      { flexGrow: 1 },
  footerLoading:  { paddingVertical: 20 },

  // Card
  card:           { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardTop:        { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardInfo:       { flex: 1, gap: 4 },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  bizName:        { fontSize: 16, flexShrink: 1, letterSpacing: -0.3, fontFamily: F.bold },
  verifiedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#4F46E5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedTxt:    { fontSize: 10, color: '#fff', fontFamily: F.bold },
  desc:           { fontSize: 13, lineHeight: 19, fontFamily: F.regular },

  // Heart (top-right inside cardTop)
  heartBtn:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  chipTxt:        { fontSize: 11, fontFamily: F.bold },

  // Card footer
  cardFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  campaignBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  campaignBadgeTxt: { fontSize: 12, fontFamily: F.bold },
  viewBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  viewBtnTxt:       { fontSize: 12, color: '#fff', fontFamily: F.bold },
});
