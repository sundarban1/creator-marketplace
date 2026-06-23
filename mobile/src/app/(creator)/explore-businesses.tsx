import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { EmptyState } from '@/components/EmptyState';
import { useAppColors } from '@/context/ThemeContext';
import { LocationSearchPicker, type LocationFilter } from '@/features/creator/components/FilterModal';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useToast } from '@/components/Toast';
import { F } from '@/utilities/constants';

type DisplayBusiness = BusinessListItem & { isFavorited: boolean };

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { label: 'Instagram', emoji: '📸' },
  { label: 'YouTube',   emoji: '▶️' },
  { label: 'TikTok',    emoji: '🎵' },
  { label: 'Facebook',  emoji: '👤' },
  { label: 'Twitter',   emoji: '🐦' },
];

const CATEGORIES = [
  { label: 'Fashion',       emoji: '👗' },
  { label: 'Beauty',        emoji: '✨' },
  { label: 'Tech',          emoji: '💻' },
  { label: 'Food',          emoji: '🍽️' },
  { label: 'Travel',        emoji: '✈️' },
  { label: 'Fitness',       emoji: '💪' },
  { label: 'Gaming',        emoji: '🎮' },
  { label: 'Education',     emoji: '📚' },
  { label: 'Entertainment', emoji: '🎬' },
];

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fm.backdrop} onPress={onClose} />
      <View style={[fm.sheet, { backgroundColor: C.surface }]}>
        <View style={[fm.handle, { backgroundColor: C.border }]} />

        <View style={[fm.header, { borderBottomColor: C.border }]}>
          <Text style={[fm.title, { color: C.text }]}>Filters</Text>
          <Pressable onPress={onReset}>
            <Text style={[fm.reset, { color: C.brinjal1 }]}>Reset all</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fm.body}>

          {/* Location */}
          <View style={fm.sectionRow}>
            <Text style={[fm.section, { color: C.textSecondary }]}>Location</Text>
            <Text style={[fm.sectionHint, { color: C.textSecondary }]}>{tempLocation.length}/3 selected</Text>
          </View>
          <LocationSearchPicker selected={tempLocation} onSelect={setTempLocation} />

          {/* Platform */}
          <Text style={[fm.section, { color: C.textSecondary }]}>Platform</Text>
          <View style={fm.chipGrid}>
            {PLATFORMS.map((p) => {
              const active = tempPlatform === p.label;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => setTempPlatform(active ? '' : p.label)}
                  style={[fm.filterChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.brinjal1 : C.background }]}>
                  <Text style={fm.filterChipEmoji}>{p.emoji}</Text>
                  <Text style={[fm.filterChipText, { color: active ? '#fff' : C.text }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category */}
          <Text style={[fm.section, { color: C.textSecondary }]}>Category</Text>
          <View style={fm.chipGrid}>
            {CATEGORIES.map((cat) => {
              const active = tempCategory === cat.label;
              return (
                <Pressable
                  key={cat.label}
                  onPress={() => setTempCategory(active ? '' : cat.label)}
                  style={[fm.filterChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.background }]}>
                  <Text style={fm.filterChipEmoji}>{cat.emoji}</Text>
                  <Text style={[fm.filterChipText, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '400' }]}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </View>

        </ScrollView>

        <View style={[fm.footer, { borderTopColor: C.border }]}>
          <Pressable
            style={({ pressed }) => [fm.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={onApply}>
            <Text style={fm.applyTxt}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:           { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:           { fontSize: 17, fontWeight: '800', fontFamily: F.extrabold },
  reset:           { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  body:            { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 20 },
  section:         { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4, fontFamily: F.bold },
  sectionRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -4 },
  sectionHint:     { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  chipGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipEmoji: { fontSize: 14 },
  filterChipText:  { fontSize: 13, fontFamily: F.medium },
  footer:          { padding: 20, borderTopWidth: 1 },
  applyBtn:        { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyTxt:        { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});

// ─── Business Avatar ──────────────────────────────────────────────────────────

function BusinessAvatar({ name, logoUrl, size = 56 }: { name: string; logoUrl: string | null; size?: number }) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: C.brinjal1 }}>{letter}</Text>
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

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>

      {/* Card body */}
      <Pressable
        style={({ pressed }) => [styles.cardBody, pressed && { opacity: 0.9 }]}
        onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}>

        {/* Top row: avatar + info */}
        <View style={styles.cardTop}>
          <View style={[styles.avatarRing, { borderColor: C.brinjal1 }]}>
            <BusinessAvatar name={item.businessName} logoUrl={item.logoUrl} size={50} />
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.bizName, { color: C.text }]} numberOfLines={1}>
                {item.businessName}
              </Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={C.brinjal1} />
              )}
            </View>
            {item.description ? (
              <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Category chips */}
        {item.categories.length > 0 && (
          <View style={styles.chips}>
            {item.categories.slice(0, 3).map((cat) => (
              <View key={cat} style={[styles.chip, { backgroundColor: 'rgba(79,70,229,0.12)', borderColor: 'rgba(79,70,229,0.3)' }]}>
                <Text style={[styles.chipTxt, { color: C.brinjal1 }]}>{cat}</Text>
              </View>
            ))}
            {item.categories.length > 3 && (
              <View style={[styles.chip, { backgroundColor: C.background, borderColor: C.border }]}>
                <Text style={[styles.chipTxt, { color: C.textSecondary }]}>+{item.categories.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer: campaign count + view hint */}
        <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
          <View style={[styles.campaignBadge, { backgroundColor: 'rgba(79,70,229,0.1)' }]}>
            <Ionicons name="megaphone-outline" size={11} color={C.brinjal1} />
            <Text style={[styles.campaignBadgeTxt, { color: C.brinjal1 }]}>
              {item._count.campaigns} active campaign{item._count.campaigns !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.viewHint}>
            <Text style={[styles.viewHintTxt, { color: C.textSecondary }]}>View</Text>
            <Ionicons name="chevron-forward" size={13} color={C.textSecondary} />
          </View>
        </View>

      </Pressable>

      {/* Heart — sibling of cardBody, absolutely positioned top-right */}
      <Pressable style={styles.heartBtn} onPress={onToggleFavorite} hitSlop={12}>
        <View style={[styles.heartCircle, { backgroundColor: isFavorited ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.25)' }]}>
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorited ? '#EF4444' : C.textSecondary}
          />
        </View>
      </Pressable>

    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreBusinessesScreen() {
  const C      = useAppColors();
  const toast  = useToast();
  const { favoriteIds, toggle, reloadIds } = useFavoriteBusinesses();

  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      });
      setBusinesses(data.businesses);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      if (isFavorited) toast.success('Added to favorites');
    } catch {
      toast.error(wasFavorited ? 'Could not remove favorite.' : 'Could not add favorite.');
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
      <LinearGradient colors={['#F97316', '#EF4444', '#EC4899']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={[styles.decCircle1, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[styles.decCircle2, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        {/* ── Header ── */}
        <View style={styles.header}>
          <BackButton fallback="/(creator)/" />
          <View style={styles.headerMiddle}>
            <Text style={[styles.heading, { color: '#fff' }]}>Explore Brands</Text>
            <Text style={[styles.headingSub, { color: 'rgba(255,255,255,0.82)' }]}>Find businesses hiring creators</Text>
          </View>
          <Pressable
            style={styles.favLink}
            onPress={() => router.push('/(creator)/favorite-businesses' as Parameters<typeof router.push>[0])}>
            <Ionicons name="heart" size={15} color="#fff" />
            <Text style={styles.favLinkText}>Saved</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* ── Search + filter ── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={18} color={C.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search brands…"
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(''); void fetchBusinesses({ search: '', silent: true }); }}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
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
            <Pressable
              key={loc.label}
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => {
                const next = locations.filter((l) => l.label !== loc.label);
                setLocations(next);
                void fetchBusinesses({ locations: next, silent: true });
              }}>
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>📍 {loc.label} ✕</Text>
            </Pressable>
          ))}
          {platform ? (
            <Pressable
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setPlatform(''); void fetchBusinesses({ platform: '', silent: true }); }}>
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{platform} ✕</Text>
            </Pressable>
          ) : null}
          {category ? (
            <Pressable
              style={[styles.activePill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
              onPress={() => { setCategory(''); void fetchBusinesses({ category: '', silent: true }); }}>
              <Text style={[styles.activePillText, { color: C.brinjal1 }]}>{category} ✕</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={clearAll}>
            <Text style={[styles.clearAllText, { color: C.error }]}>Clear all</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Finding brands…</Text>
        </View>
      ) : error ? (
        <EmptyState emoji="⚠️" title="Couldn't load businesses" subtitle={error} action={{ label: 'Retry', onPress: () => fetchBusinesses() }} />
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
          ListEmptyComponent={
            <EmptyState
              emoji="🏢"
              title="No brands found"
              subtitle={hasFilter ? 'Try adjusting your filters or search term.' : 'No businesses are currently hiring. Check back soon!'}
              action={hasFilter ? { label: 'Clear Filters', onPress: clearAll } : undefined}
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
  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  decCircle1:     { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, right: -40 },
  decCircle2:     { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -30, left: 20 },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 12 },
  headerMiddle:   { flex: 1, alignItems: 'center', gap: 2 },
  heading:        { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, fontFamily: F.extrabold, color: '#fff' },
  headingSub:     { fontSize: 12, fontFamily: F.regular },
  countRow:       { alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 4 },
  countPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  countTxt:       { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  favLink:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  favLinkText:    { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  // Search row
  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  searchInput:    { flex: 1, fontSize: 15, fontFamily: F.regular },
  filterBtn:      { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  filterDot:      { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  // Active filter pills
  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
  clearAllText:   { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, fontFamily: F.regular },
  list:           { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, gap: 12 },
  listEmpty:      { flexGrow: 1 },

  // Card
  card:           { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardBody:       { padding: 16, gap: 12 },
  cardTop:        { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  avatarRing:     { borderRadius: 30, borderWidth: 2, padding: 2 },
  cardInfo:       { flex: 1, gap: 5, paddingTop: 2 },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bizName:        { fontSize: 16, fontWeight: '800', flexShrink: 1, letterSpacing: -0.3, fontFamily: F.extrabold },
  desc:           { fontSize: 13, lineHeight: 19, fontFamily: F.regular },

  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:           { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  chipTxt:        { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  // Card footer inside cardBody
  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  campaignBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  campaignBadgeTxt: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  viewHint:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewHintTxt:    { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  // Heart button — absolutely positioned, sibling of cardBody
  heartBtn:       { position: 'absolute', top: 14, right: 14 },
  heartCircle:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
