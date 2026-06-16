import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
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

function BusinessCard({ item }: { item: BusinessListItem }) {
  const C = useAppColors();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: C.surface }, pressed && { opacity: 0.93 }]}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}>

      {/* Top row */}
      <View style={styles.cardTop}>
        <BusinessAvatar name={item.businessName} logoUrl={item.logoUrl} size={52} />
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.bizName, { color: C.text }]} numberOfLines={1}>
              {item.businessName}
            </Text>
            {item.isVerified && (
              <View style={[styles.checkBadge, { backgroundColor: C.brinjal1 }]}>
                <Ionicons name="checkmark" size={9} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.campaignPill}>
            <Ionicons name="megaphone-outline" size={10} color={C.brinjal1} />
            <Text style={[styles.campaignPillTxt, { color: C.brinjal1 }]}>
              {item._count.campaigns} campaign{item._count.campaigns !== 1 ? 's' : ''}
            </Text>
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
            <View key={cat} style={[styles.chip, { backgroundColor: C.background, borderColor: C.border }]}>
              <Text style={[styles.chipTxt, { color: C.textSecondary }]}>{cat}</Text>
            </View>
          ))}
          {item.categories.length > 3 && (
            <View style={[styles.chip, { backgroundColor: C.background, borderColor: C.border }]}>
              <Text style={[styles.chipTxt, { color: C.textSecondary }]}>+{item.categories.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
        <Text style={[styles.footerTxt, { color: C.brinjal1 }]}>View brand profile</Text>
        <Ionicons name="arrow-forward-outline" size={13} color={C.brinjal1} />
      </View>

    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreBusinessesScreen() {
  const C = useAppColors();

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

  const isFilterActive = !!(category || platform || locations.length > 0);
  const hasFilter      = !!(search || category || platform || locations.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <BackButton fallback="/(creator)/" />
        <View style={styles.headerCenter}>
          <Text style={[styles.heading, { color: C.text }]}>Explore Brands</Text>
          <Text style={[styles.subheading, { color: C.textSecondary }]}>
            {loading ? 'Loading…' : businesses.length > 0 ? `${businesses.length} brands available` : 'Find brands to work with'}
          </Text>
        </View>
      </View>

      {/* ── Search + filter ── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={17} color={C.textSecondary} />
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
              <Ionicons name="close-circle" size={17} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.filterBtn, { backgroundColor: isFilterActive ? C.brinjal1 : C.surface, borderColor: isFilterActive ? C.brinjal1 : C.border }]}
          onPress={openFilter}>
          <Ionicons name="options-outline" size={19} color={isFilterActive ? '#fff' : C.brinjal1} />
          {isFilterActive && <View style={[styles.filterDot, { borderColor: isFilterActive ? C.brinjal1 : C.surface }]} />}
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
          data={businesses}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <BusinessCard item={item} />}
          contentContainerStyle={[styles.list, businesses.length === 0 && styles.listEmpty]}
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

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerCenter:   { flex: 1 },
  heading:        { fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  subheading:     { fontSize: 12, marginTop: 1 },

  // Search row
  searchRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  searchBox:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 13, height: 46 },
  searchInput:    { flex: 1, fontSize: 14 },
  filterBtn:      { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  filterDot:      { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5 },

  // Active filter pills
  activePills:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  activePill:     { flexDirection: 'row', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  activePillText: { fontSize: 12, fontWeight: '600' },
  clearAllText:   { fontSize: 12, fontWeight: '700' },

  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14 },
  list:           { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48, gap: 14 },
  listEmpty:      { flexGrow: 1 },

  // Card
  card:           { borderRadius: 16, padding: 14, gap: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardTop:        { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardInfo:       { flex: 1, gap: 4 },
  nameRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bizName:        { fontSize: 15, fontWeight: '800', flexShrink: 1, letterSpacing: -0.2 },
  checkBadge:     { width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  campaignPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  campaignPillTxt:{ fontSize: 12, fontWeight: '600' },
  desc:           { fontSize: 13, lineHeight: 18 },

  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:           { borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  chipTxt:        { fontSize: 11, fontWeight: '600' },

  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  footerTxt:      { fontSize: 12, fontWeight: '700' },
});
