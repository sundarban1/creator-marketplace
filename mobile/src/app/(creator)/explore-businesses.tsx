import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { businessService, type BusinessListItem } from '@/services/business';

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
  title:           { fontSize: 17, fontWeight: '800' },
  reset:           { fontSize: 14, fontWeight: '600' },
  body:            { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 20 },
  section:         { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -4 },
  sectionRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -4 },
  sectionHint:     { fontSize: 11, fontWeight: '600' },
  chipGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipEmoji: { fontSize: 14 },
  filterChipText:  { fontSize: 13 },
  footer:          { padding: 20, borderTopWidth: 1 },
  applyBtn:        { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyTxt:        { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ─── Business Avatar ──────────────────────────────────────────────────────────

function BusinessAvatar({ name, logoUrl, size = 58 }: { name: string; logoUrl: string | null; size?: number }) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: C.brinjal1 }}>{letter}</Text>
    </View>
  );
}

// ─── Business Card ────────────────────────────────────────────────────────────

function BusinessCard({
  item,
  isFavorited,
  onToggleFav,
}: {
  item:        BusinessListItem;
  isFavorited: boolean;
  onToggleFav: () => void;
}) {
  const C = useAppColors();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface }]}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}>

      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: C.brinjal1 }]} />

      <View style={styles.cardInner}>
        {/* Top row: avatar + info + fav */}
        <View style={styles.cardTop}>
          <BusinessAvatar name={item.businessName} logoUrl={item.logoUrl} size={58} />

          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.businessName, { color: C.text }]} numberOfLines={1}>
                {item.businessName}
              </Text>
              {item.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: C.brinjal1 }]}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              )}
            </View>

            <View style={styles.campaignCountRow}>
              <Ionicons name="megaphone-outline" size={11} color={C.brinjal1} />
              <Text style={[styles.campaignCountText, { color: C.brinjal1 }]}>
                {item._count.campaigns} active campaign{item._count.campaigns !== 1 ? 's' : ''}
              </Text>
            </View>

            {item.description ? (
              <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <Pressable
            style={styles.favBtn}
            onPress={(e) => { e.stopPropagation(); onToggleFav(); }}
            hitSlop={10}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorited ? '#EF4444' : C.textSecondary}
            />
          </Pressable>
        </View>

        {/* Category chips */}
        {item.categories.length > 0 && (
          <View style={styles.chips}>
            {item.categories.slice(0, 3).map((cat) => (
              <View key={cat} style={[styles.chip, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.chipText, { color: C.brinjal1 }]}>{cat}</Text>
              </View>
            ))}
            {item.categories.length > 3 && (
              <View style={[styles.chip, { backgroundColor: C.border }]}>
                <Text style={[styles.chipText, { color: C.textSecondary }]}>
                  +{item.categories.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
          <Text style={[styles.viewProfileText, { color: C.brinjal1 }]}>View brand profile</Text>
          <Ionicons name="chevron-forward" size={14} color={C.brinjal1} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreBusinessesScreen() {
  const C = useAppColors();
  const { isFavorited, toggle } = useFavoriteBusinesses();

  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('');
  const [platform,    setPlatform]    = useState('');
  const [locations,   setLocations]   = useState<LocationFilter>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

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
    setSearch(''); setCategory(''); setPlatform(''); setLocations([]); setShowFavOnly(false);
    void fetchBusinesses({ search: '', category: '', platform: '', locations: [], silent: true });
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchBusinesses({ silent: true });
  }, [search, category, platform]);

  const isFilterActive = !!(category || platform || locations.length > 0);
  const hasFilter      = !!(search || category || platform || locations.length > 0 || showFavOnly);
  const displayList    = showFavOnly ? businesses.filter((b) => isFavorited(b.id)) : businesses;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => router.canGoBack() ? router.back() : router.push('/(creator)/' as never)}>
          <Ionicons name="chevron-back" size={22} color={C.brinjal1} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.heading, { color: C.text }]}>Explore Brands</Text>
          <Text style={[styles.subheading, { color: C.textSecondary }]}>Find businesses to collaborate with</Text>
        </View>
        <Pressable
          style={[styles.favToggle, { backgroundColor: showFavOnly ? '#FEE2E2' : C.surface, borderColor: showFavOnly ? '#F87171' : C.border }]}
          onPress={() => setShowFavOnly((v) => !v)}>
          <Ionicons
            name={showFavOnly ? 'heart' : 'heart-outline'}
            size={14}
            color={showFavOnly ? '#EF4444' : C.textSecondary}
          />
          <Text style={[styles.favToggleText, { color: showFavOnly ? '#EF4444' : C.textSecondary }]}>Saved</Text>
        </Pressable>
      </View>

      {/* ── Search bar ── */}
      <View style={[styles.searchCard, { backgroundColor: C.surface }]}>
        <Ionicons name="search" size={16} color={C.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search brands, categories…"
          placeholderTextColor={C.textSecondary}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.filterBtn, { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight }]}
          onPress={openFilter}>
          <Ionicons name="options" size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
          {isFilterActive && <View style={[styles.filterActiveDot, { borderColor: C.surface }]} />}
        </Pressable>
      </View>

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
          data={displayList}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <BusinessCard
              item={item}
              isFavorited={isFavorited(item.id)}
              onToggleFav={() => toggle(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, displayList.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          ListEmptyComponent={
            <EmptyState
              emoji={showFavOnly ? '❤️' : '🏢'}
              title={showFavOnly ? 'No saved brands' : 'No brands found'}
              subtitle={
                showFavOnly
                  ? 'Tap the heart icon on any business to save it here.'
                  : hasFilter
                  ? 'Try adjusting your filters or search term.'
                  : 'No businesses are currently hiring. Check back soon!'
              }
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
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 },
  backBtn:          { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { flex: 1 },
  heading:          { fontSize: 20, fontWeight: '800' },
  subheading:       { fontSize: 12, marginTop: 1 },
  favToggle:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  favToggleText:    { fontSize: 12, fontWeight: '600' },

  searchCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, height: 50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  searchInput:      { flex: 1, fontSize: 14 },
  filterBtn:        { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterActiveDot:  { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5 },

  activePills:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  activePill:       { flexDirection: 'row', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText:   { fontSize: 12, fontWeight: '600' },
  clearAllText:     { fontSize: 12, fontWeight: '700' },

  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { fontSize: 14 },
  list:             { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  listEmpty:        { flexGrow: 1 },

  card:             { borderRadius: 18, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardAccent:       { width: 4 },
  cardInner:        { flex: 1, padding: 14, gap: 10 },
  cardTop:          { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardInfo:         { flex: 1, gap: 4 },
  nameRow:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  businessName:     { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  verifiedBadge:    { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  campaignCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  campaignCountText:{ fontSize: 12, fontWeight: '600' },
  desc:             { fontSize: 13, lineHeight: 18 },
  favBtn:           { padding: 2, marginTop: 1 },

  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:             { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText:         { fontSize: 11, fontWeight: '600' },

  cardFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, borderTopWidth: 1, paddingTop: 10 },
  viewProfileText:  { fontSize: 12, fontWeight: '600' },
});
