import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  ActivityIndicator,
  FlatList,
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
import { RangeSlider } from '@/components/RangeSlider';
import { useAppColors } from '@/context/ThemeContext';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';

const PAGE_SIZE = 10;
const SLIDER_MAX = 1000;
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const MAX_LOCS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type LocationEntry = { label: string; lat: number | null; lng: number | null };
type Prediction = { place_id: string; structured_formatting: { main_text: string; secondary_text: string } };

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', youtube: '▶️', tiktok: '🎵',
  twitter: '🐦', facebook: '📘', linkedin: '💼',
  snapchat: '👻', pinterest: '📌',
};

const CATEGORY_META: Record<string, { emoji: string; bg: string }> = {
  Fashion:     { emoji: '👗', bg: '#F2DCF0' },
  Food:        { emoji: '🍽️', bg: '#F2E6DC' },
  Tech:        { emoji: '💻', bg: '#DCE6F2' },
  Technology:  { emoji: '💻', bg: '#DCE6F2' },
  Beauty:      { emoji: '✨', bg: '#DCF2E6' },
  Travel:      { emoji: '✈️', bg: '#F2F2DC' },
  Fitness:     { emoji: '💪', bg: '#DCF2EE' },
  Lifestyle:   { emoji: '🌿', bg: '#E6F2DC' },
  Gaming:      { emoji: '🎮', bg: '#E6DCF2' },
  Music:       { emoji: '🎵', bg: '#F2DCE6' },
  Education:   { emoji: '📚', bg: '#FDEFD0' },
  Sports:      { emoji: '⚽', bg: '#E8F4DC' },
  Wellness:    { emoji: '🧘', bg: '#DCF2EE' },
  Adventure:   { emoji: '🏕️', bg: '#E8EFD4' },
};

function getPlatformEmoji(p: string) { return PLATFORM_EMOJI[p.toLowerCase()] ?? '📱'; }
function normalizePlatform(p: string) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }
function getCategoryMeta(cats: string[]) {
  for (const c of cats) { if (CATEGORY_META[c]) return CATEGORY_META[c]; }
  return { emoji: '🎯', bg: '#F0F0F0' };
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
  priceMin: number;
  priceMax: number;
  platforms: string[];
  categories: string[];
};

const DEFAULT_FILTER: FilterState = {
  locations: [],
  priceMin: 0,
  priceMax: SLIDER_MAX,
  platforms: [],
  categories: [],
};

function isFilterActive(f: FilterState) {
  return (
    f.locations.length > 0 ||
    f.priceMin > 0 ||
    f.priceMax < SLIDER_MAX ||
    f.platforms.length > 0 ||
    f.categories.length > 0
  );
}

// ─── Location Search Picker ───────────────────────────────────────────────────

function LocationPicker({ selected, onChange }: { selected: LocationEntry[]; onChange: (v: LocationEntry[]) => void }) {
  const C = useAppColors();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remoteSelected = selected.some((l) => l.label === 'Remote');
  const nonRemote = selected.filter((l) => l.label !== 'Remote');
  const atMax = selected.length >= MAX_LOCS;

  function toggleRemote() {
    if (remoteSelected) {
      onChange(selected.filter((l) => l.label !== 'Remote'));
    } else if (!atMax) {
      onChange([...selected, { label: 'Remote', lat: null, lng: null }]);
    }
  }

  function remove(label: string) { onChange(selected.filter((l) => l.label !== label)); }

  function onQueryChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(text), 350);
  }

  async function fetchPredictions(text: string) {
    if (!PLACES_KEY) return;
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&types=(cities)`;
      const data = (await (await fetch(url)).json()) as { predictions: Prediction[]; status: string };
      setPredictions(data.status === 'OK' ? data.predictions : []);
    } catch { setPredictions([]); }
    finally { setSearching(false); }
  }

  async function selectPrediction(pred: Prediction) {
    const label = pred.structured_formatting.main_text;
    if (selected.some((l) => l.label === label)) return;
    setQuery(''); setPredictions([]);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=geometry&key=${PLACES_KEY}`;
      const data = (await (await fetch(url)).json()) as { result: { geometry: { location: { lat: number; lng: number } } }; status: string };
      const { lat, lng } = data.status === 'OK' ? data.result.geometry.location : { lat: null as unknown as number, lng: null as unknown as number };
      onChange([...selected, { label, lat: data.status === 'OK' ? lat : null, lng: data.status === 'OK' ? lng : null }]);
    } catch {
      onChange([...selected, { label, lat: null, lng: null }]);
    }
  }

  return (
    <View style={lp.wrap}>
      {/* Remote chip */}
      <Pressable
        style={[lp.remoteChip, { borderColor: remoteSelected ? C.brinjal1 : C.border, backgroundColor: remoteSelected ? C.primaryLight : C.background }, !remoteSelected && atMax && { opacity: 0.35 }]}
        onPress={toggleRemote}
        disabled={!remoteSelected && atMax}>
        <Text style={lp.globeEmoji}>🌐</Text>
        <Text style={[lp.remoteText, { color: remoteSelected ? C.brinjal1 : C.text, fontWeight: remoteSelected ? '700' : '500' }]}>Remote</Text>
        {remoteSelected && <Text style={[lp.removeX, { color: C.brinjal1 }]}>✕</Text>}
      </Pressable>

      {/* Selected place chips */}
      {nonRemote.length > 0 && (
        <View style={lp.chips}>
          {nonRemote.map((loc) => (
            <View key={loc.label} style={[lp.locChip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[lp.locChipText, { color: C.brinjal1 }]}>📍 {loc.label}</Text>
              <Pressable onPress={() => remove(loc.label)} hitSlop={8}>
                <Text style={[lp.removeX, { color: C.brinjal1 }]}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Search input */}
      {!atMax && (
        <>
          <View style={[lp.searchRow, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={lp.searchIcon}>🔍</Text>
            <TextInput
              style={[lp.searchInput, { color: C.text }]}
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search city…"
              placeholderTextColor={C.textSecondary}
              returnKeyType="search"
            />
            {searching
              ? <ActivityIndicator size="small" color={C.brinjal1} />
              : query.length > 0
              ? <Pressable onPress={() => { setQuery(''); setPredictions([]); }} hitSlop={8}><Text style={{ color: C.textSecondary, fontSize: 15 }}>✕</Text></Pressable>
              : null}
          </View>
          {predictions.length > 0 && (
            <View style={[lp.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
              {predictions.slice(0, 5).map((pred, idx) => (
                <Pressable
                  key={pred.place_id}
                  style={[lp.dropRow, { borderBottomColor: idx < Math.min(predictions.length, 5) - 1 ? C.border : 'transparent' }]}
                  onPress={() => selectPrediction(pred)}>
                  <Text style={lp.dropPin}>📍</Text>
                  <View style={lp.dropTexts}>
                    <Text style={[lp.dropMain, { color: C.text }]}>{pred.structured_formatting.main_text}</Text>
                    <Text style={[lp.dropSec, { color: C.textSecondary }]} numberOfLines={1}>{pred.structured_formatting.secondary_text}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const lp = StyleSheet.create({
  wrap:        { gap: 10 },
  remoteChip:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
  globeEmoji:  { fontSize: 14 },
  remoteText:  { fontSize: 13 },
  removeX:     { fontSize: 12, fontWeight: '700' },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  locChipText: { fontSize: 13, fontWeight: '600' },
  searchRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:  { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14 },
  dropdown:    { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  dropRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  dropPin:     { fontSize: 16 },
  dropTexts:   { flex: 1 },
  dropMain:    { fontSize: 14, fontWeight: '600' },
  dropSec:     { fontSize: 11, marginTop: 1 },
});

// ─── Filter Modal ─────────────────────────────────────────────────────────────

function ExploreFilterModal({
  visible, temp, setTemp, availableCategories, availablePlatforms,
  onApply, onReset, onClose,
}: {
  visible: boolean;
  temp: FilterState;
  setTemp: (f: FilterState) => void;
  availableCategories: string[];
  availablePlatforms: string[];
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const C = useAppColors();

  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    setTemp({ ...temp, [key]: val });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fm.backdrop} onPress={onClose} />
      <View style={[fm.sheet, { backgroundColor: C.surface }]}>
        <View style={[fm.handle, { backgroundColor: C.border }]} />
        <View style={[fm.header, { borderBottomColor: C.border }]}>
          <Text style={[fm.title, { color: C.text }]}>Filter Creators</Text>
          <Pressable onPress={onReset}>
            <Text style={[fm.reset, { color: C.brinjal1 }]}>Reset all</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fm.body}>

          {/* Location */}
          <View style={fm.sectionRow}>
            <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>Location</Text>
            <Text style={[fm.sectionHint, { color: C.textSecondary }]}>{temp.locations.length}/{MAX_LOCS} allowed</Text>
          </View>
          <LocationPicker selected={temp.locations} onChange={(v) => set('locations', v)} />

          {/* Price Range */}
          <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>Price Range</Text>
          <RangeSlider
            minVal={temp.priceMin}
            maxVal={temp.priceMax}
            onMinChange={(v) => set('priceMin', v)}
            onMaxChange={(v) => set('priceMax', v)}
          />

          {/* Platform */}
          {availablePlatforms.length > 0 && (
            <>
              <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>Platform</Text>
              <View style={fm.chips}>
                {availablePlatforms.map((p) => {
                  const sel = temp.platforms.includes(p);
                  return (
                    <Pressable
                      key={p}
                      onPress={() => set('platforms', toggle(temp.platforms, p))}
                      style={[fm.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                      <Text style={fm.chipEmoji}>{getPlatformEmoji(p)}</Text>
                      <Text style={[fm.chipText, { color: sel ? C.brinjal1 : C.text, fontWeight: sel ? '700' : '500' }]}>{normalizePlatform(p)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Category */}
          {availableCategories.length > 0 && (
            <>
              <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>Category</Text>
              <View style={fm.chips}>
                {availableCategories.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const sel = temp.categories.includes(cat);
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => set('categories', toggle(temp.categories, cat))}
                      style={[fm.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                      {meta && <Text style={fm.chipEmoji}>{meta.emoji}</Text>}
                      <Text style={[fm.chipText, { color: sel ? C.brinjal1 : C.text, fontWeight: sel ? '700' : '500' }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

        </ScrollView>

        <View style={[fm.footer, { borderTopColor: C.border }]}>
          <Pressable
            style={({ pressed }) => [fm.applyBtn, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={onApply}>
            <Text style={fm.applyTxt}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:       { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:       { fontSize: 17, fontWeight: '800' },
  reset:       { fontSize: 14, fontWeight: '600' },
  body:        { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 16 },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel:{ fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHint: { fontSize: 11, fontWeight: '600' },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipEmoji:   { fontSize: 13 },
  chipText:    { fontSize: 13 },
  footer:      { padding: 20, borderTopWidth: 1 },
  applyBtn:    { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  applyTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator }: { creator: ApiCreatorListItem }) {
  const C = useAppColors();
  const meta = getCategoryMeta(creator.categories);
  const initials = (creator.fullName ?? 'C').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const hasBudget = creator.prefBudgetMin > 0 || creator.prefBudgetMax > 0;

  return (
    <Pressable
      style={({ pressed }) => [s.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.9 }]}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}>

      {/* Header row: avatar · name/location · chevron */}
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: meta.bg }]}>
          <Text style={s.avatarText}>{meta.emoji || initials}</Text>
        </View>
        <View style={s.cardMeta}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{creator.fullName ?? 'Creator'}</Text>
            {creator.isVerified && (
              <View style={s.verifiedBadge}>
                <Text style={s.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {creator.location ? (
            <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1}>📍 {creator.location}</Text>
          ) : null}
        </View>
        <Text style={[s.cardChevron, { color: C.textSecondary }]}>›</Text>
      </View>

      {/* Bio */}
      {creator.bio ? (
        <Text style={[s.bio, { color: C.textSecondary }]} numberOfLines={2}>{creator.bio}</Text>
      ) : null}

      {/* Platform / budget stat pills */}
      {(creator.socialAccounts.length > 0 || hasBudget) ? (
        <View style={s.statsRow}>
          {creator.socialAccounts.slice(0, 2).map((acc) => (
            <View key={acc.platform} style={[s.statPill, { backgroundColor: C.primaryLight }]}>
              <Text style={s.statEmoji}>{getPlatformEmoji(acc.platform)}</Text>
              <Text style={[s.statVal, { color: C.brinjal1 }]}>{formatFollowers(acc.followers)}</Text>
            </View>
          ))}
          {hasBudget && (
            <View style={[s.statPill, { backgroundColor: '#E8F5E9' }]}>
              <Text style={s.statEmoji}>💰</Text>
              <Text style={[s.statVal, { color: '#16A34A' }]}>
                ${creator.prefBudgetMin}–${creator.prefBudgetMax}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Category chips with per-category colours */}
      {creator.categories.length > 0 ? (
        <View style={s.catRow}>
          {creator.categories.slice(0, 4).map((cat) => {
            const m = CATEGORY_META[cat];
            return (
              <View key={cat} style={[s.catChip, { backgroundColor: m?.bg ?? C.primaryLight }]}>
                {m ? <Text style={s.catEmoji}>{m.emoji}</Text> : null}
                <Text style={[s.catLabel, { color: C.text }]}>{cat}</Text>
              </View>
            );
          })}
          {creator.categories.length > 4 ? (
            <View style={[s.catChip, { backgroundColor: C.background, borderWidth: 1, borderColor: C.border }]}>
              <Text style={[s.catLabel, { color: C.textSecondary }]}>+{creator.categories.length - 4}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreCreatorsScreen() {
  const C = useAppColors();

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
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);

  const filterActive = isFilterActive(activeFilter);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Load filter options once
  useEffect(() => {
    creatorService.getCreatorFilterOptions()
      .then(({ categories, platforms }) => {
        setAvailableCategories(categories);
        setAvailablePlatforms(platforms);
      })
      .catch(() => {});
  }, []);

  async function fetchCreators(p: number, replace: boolean, filter: FilterState, nameSearch: string) {
    if (p === 1 && replace) setLoading(true);
    else if (!replace) setLoadingMore(true);
    setError('');
    try {
      const locationText = filter.locations.length > 0
        ? filter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label).join(',')
        : undefined;

      const res = await creatorService.listCreators({
        page: p,
        limit: PAGE_SIZE,
        search: nameSearch.trim() || undefined,
        location: locationText || undefined,
        categories: filter.categories.length ? filter.categories : undefined,
        platforms: filter.platforms.length ? filter.platforms : undefined,
        priceMin: filter.priceMin > 0 ? filter.priceMin : undefined,
        priceMax: filter.priceMax < SLIDER_MAX ? filter.priceMax : undefined,
      });
      setTotal(res.total);
      setCreators((prev) => replace ? res.creators : [...prev, ...res.creators]);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load creators');
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    if (!loadingMore && page < Math.ceil(total / PAGE_SIZE)) {
      void fetchCreators(page + 1, false, activeFilter, searchDebounced);
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
    setTempFilter(DEFAULT_FILTER);
  }

  function removeActiveFilter<K extends keyof FilterState>(key: K, value?: unknown) {
    if (key === 'locations' && value !== undefined) {
      setActiveFilter({ ...activeFilter, locations: activeFilter.locations.filter((l) => l.label !== value) });
    } else if (key === 'platforms' && value !== undefined) {
      setActiveFilter({ ...activeFilter, platforms: activeFilter.platforms.filter((p) => p !== value) });
    } else if (key === 'categories' && value !== undefined) {
      setActiveFilter({ ...activeFilter, categories: activeFilter.categories.filter((c) => c !== value) });
    } else if (key === 'priceMin' || key === 'priceMax') {
      setActiveFilter({ ...activeFilter, priceMin: 0, priceMax: SLIDER_MAX });
    }
  }

  const hasMore = page < Math.ceil(total / PAGE_SIZE);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <BackButton fallback="/(business)/" />
        <Text style={[s.headerTitle, { color: C.text }]}>Explore Creators</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar — same design as creator home */}
      <View style={[s.searchCard, { backgroundColor: C.surface }]}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: C.text }]}
          placeholder="Search creators…"
          placeholderTextColor={C.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable
          style={[s.filterBtn, { backgroundColor: filterActive ? C.brinjal1 : C.primaryLight }]}
          onPress={openFilter}>
          <View style={s.filterLines}>
            <View style={[s.filterLine, { width: 16, backgroundColor: filterActive ? '#fff' : C.brinjal1 }]} />
            <View style={[s.filterLine, { width: 12, backgroundColor: filterActive ? '#fff' : C.brinjal1 }]} />
            <View style={[s.filterLine, { width: 8, backgroundColor: filterActive ? '#fff' : C.brinjal1 }]} />
          </View>
          {filterActive && <View style={[s.filterDot, { borderColor: C.surface }]} />}
        </Pressable>
      </View>

      {/* Active filter chips */}
      {filterActive && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {activeFilter.locations.map((loc) => (
            <Pressable key={loc.label} onPress={() => removeActiveFilter('locations', loc.label)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{loc.label === 'Remote' ? '🌐' : '📍'} {loc.label} ✕</Text>
            </Pressable>
          ))}
          {(activeFilter.priceMin > 0 || activeFilter.priceMax < SLIDER_MAX) && (
            <Pressable onPress={() => removeActiveFilter('priceMin')} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[s.chipText, { color: C.brinjal1 }]}>💰 ${activeFilter.priceMin}–{activeFilter.priceMax >= SLIDER_MAX ? '1K+' : `$${activeFilter.priceMax}`} ✕</Text>
            </Pressable>
          )}
          {activeFilter.platforms.map((p) => (
            <Pressable key={p} onPress={() => removeActiveFilter('platforms', p)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{getPlatformEmoji(p)} {normalizePlatform(p)} ✕</Text>
            </Pressable>
          ))}
          {activeFilter.categories.map((cat) => (
            <Pressable key={cat} onPress={() => removeActiveFilter('categories', cat)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{CATEGORY_META[cat]?.emoji} {cat} ✕</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setActiveFilter(DEFAULT_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>Clear all</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Result count */}
      {!loading && (
        <View style={s.countRow}>
          <Text style={[s.countText, { color: C.textSecondary }]}>
            {total} creator{total !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[s.loadingText, { color: C.textSecondary }]}>Finding creators…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => fetchCreators(1, true, activeFilter, searchDebounced)}>
            <Text style={[s.linkText, { color: C.brinjal1 }]}>Retry</Text>
          </Pressable>
        </View>
      ) : creators.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyEmoji}>🧑‍🎨</Text>
          <Text style={[s.emptyTitle, { color: C.text }]}>No creators found</Text>
          <Text style={[s.emptyHint, { color: C.textSecondary }]}>
            {filterActive || search ? 'Try adjusting your filters.' : 'No creators have joined yet.'}
          </Text>
          {(filterActive || search) && (
            <Pressable onPress={() => { setSearch(''); setActiveFilter(DEFAULT_FILTER); }} style={[s.clearBtn, { borderColor: C.brinjal1 }]}>
              <Text style={[s.linkText, { color: C.brinjal1 }]}>Clear filters</Text>
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
              <Text style={[s.footerText, { color: C.textSecondary }]}>Showing all {total} creator{total !== 1 ? 's' : ''}</Text>
            ) : null
          }
        />
      )}

      <ExploreFilterModal
        visible={filterVisible}
        temp={tempFilter}
        setTemp={setTempFilter}
        availableCategories={availableCategories}
        availablePlatforms={availablePlatforms}
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

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },

  // Matches creator home search card
  searchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14, height: 50, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  filterBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterLines: { gap: 4, alignItems: 'flex-end' },
  filterLine: { height: 2, borderRadius: 1 },
  filterDot: { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5 },

  chipRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },

  countRow: { paddingHorizontal: 20, marginBottom: 6 },
  countText: { fontSize: 12 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14 },
  errorText: { color: '#DC2626', fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '700' },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  clearBtn: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  card: { borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 24 },
  cardMeta: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '800', flex: 1 },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  verifiedText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  location: { fontSize: 12 },
  cardChevron: { fontSize: 24 },
  bio: { fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statEmoji: { fontSize: 12 },
  statVal: { fontSize: 12, fontWeight: '700' },
  catRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  catEmoji: { fontSize: 11 },
  catLabel: { fontSize: 11, fontWeight: '600' },

  footerText: { textAlign: 'center', fontSize: 13, paddingVertical: 20 },
});
