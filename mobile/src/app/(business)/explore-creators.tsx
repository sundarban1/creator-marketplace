import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackButton } from '@/components/BackButton';
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
import { RangeSlider } from '@/components/RangeSlider';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';
import { F } from '@/utilities/constants';

const PAGE_SIZE = 10;
const SLIDER_MAX = 1000;
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const MAX_LOCS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type LocationEntry = { label: string; lat: number | null; lng: number | null };
type Prediction = { place_id: string; structured_formatting: { main_text: string; secondary_text: string } };

// ─── Constants ────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PLATFORM_ICON: Record<string, { icon: IoniconName; color: string }> = {
  instagram: { icon: 'logo-instagram', color: '#E1306C' },
  youtube:   { icon: 'logo-youtube',   color: '#FF0000' },
  twitter:   { icon: 'logo-twitter',   color: '#1DA1F2' },
  facebook:  { icon: 'logo-facebook',  color: '#1877F2' },
  linkedin:  { icon: 'logo-linkedin',  color: '#0A66C2' },
  snapchat:  { icon: 'logo-snapchat',  color: '#FFBF00' },
  pinterest: { icon: 'logo-pinterest', color: '#E60023' },
  tiktok:    { icon: 'musical-notes',  color: '#010101' },
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

function getPlatformMeta(p: string) { return PLATFORM_ICON[p.toLowerCase()] ?? { icon: 'phone-portrait-outline' as IoniconName, color: '#6B7280' }; }
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
  const { t } = useLanguage();
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
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&types=(cities)&components=country:np`;
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
        <Text style={[lp.remoteText, { color: remoteSelected ? C.brinjal1 : C.text, fontWeight: remoteSelected ? '700' : '500' }]}>{t('campaignDetail.remoteLocation')}</Text>
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
              placeholder={t('explore.searchCity')}
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
  remoteChip:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  globeEmoji:  { fontSize: 14 },
  remoteText:  { fontSize: 13, fontFamily: F.regular },
  removeX:     { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5 },
  locChipText: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  searchRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:  { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.regular },
  dropdown:    { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  dropRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  dropPin:     { fontSize: 16 },
  dropTexts:   { flex: 1 },
  dropMain:    { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  dropSec:     { fontSize: 11, marginTop: 1, fontFamily: F.regular },
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
  const { t } = useLanguage();

  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    setTemp({ ...temp, [key]: val });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fm.backdrop} onPress={onClose} />
      <View style={[fm.sheet, { backgroundColor: C.surface }]}>
        <View style={[fm.handle, { backgroundColor: C.border }]} />
        <View style={[fm.header, { borderBottomColor: C.border }]}>
          <Text style={[fm.title, { color: C.text }]}>{t('explore.filterCreators')}</Text>
          <Pressable onPress={onReset}>
            <Text style={[fm.reset, { color: C.brinjal1 }]}>{t('explore.resetAll')}</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fm.body}>

          {/* Location */}
          <View style={fm.sectionRow}>
            <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>{t('explore.location')}</Text>
            <Text style={[fm.sectionHint, { color: C.textSecondary }]}>{t('explore.locationsAllowed', { count: temp.locations.length, max: MAX_LOCS })}</Text>
          </View>
          <LocationPicker selected={temp.locations} onChange={(v) => set('locations', v)} />

          {/* Price Range */}
          <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>{t('explore.priceRange')}</Text>
          <RangeSlider
            minVal={temp.priceMin}
            maxVal={temp.priceMax}
            onMinChange={(v) => set('priceMin', v)}
            onMaxChange={(v) => set('priceMax', v)}
          />

          {/* Platform */}
          {availablePlatforms.length > 0 && (
            <>
              <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>{t('explore.platform')}</Text>
              <View style={fm.chips}>
                {availablePlatforms.map((p) => {
                  const sel = temp.platforms.includes(p);
                  return (
                    <Pressable
                      key={p}
                      onPress={() => set('platforms', toggle(temp.platforms, p))}
                      style={[fm.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                      <Ionicons name={getPlatformMeta(p).icon} size={14} color={sel ? C.brinjal1 : getPlatformMeta(p).color} />
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
              <Text style={[fm.sectionLabel, { color: C.textSecondary }]}>{t('explore.category')}</Text>
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
            <Text style={fm.applyTxt}>{t('explore.applyFilters')}</Text>
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
  title:       { fontSize: 17, fontWeight: '700', fontFamily: F.bold },
  reset:       { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  body:        { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 16 },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel:{ fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0, fontFamily: F.bold },
  sectionHint: { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  chipEmoji:   { fontSize: 13 },
  chipText:    { fontSize: 13, fontFamily: F.medium },
  footer:      { padding: 20, borderTopWidth: 1 },
  applyBtn:    { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  applyTxt:    { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});

// ─── Creator Avatar ───────────────────────────────────────────────────────────

function CreatorAvatar({ avatarUrl, bg }: { avatarUrl: string | null; bg: string }) {
  const [failed, setFailed] = useState(false);
  if (avatarUrl && !failed) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={s.avatar}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[s.avatar, s.avatarPlaceholder, { backgroundColor: bg }]}>
      <View style={s.avatarIconWrap}>
        <Ionicons name="person" size={30} color="rgba(91,33,182,0.55)" />
      </View>
    </View>
  );
}

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator, isSaved, onToggleSave }: {
  creator: ApiCreatorListItem;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const C = useAppColors();
  const meta = getCategoryMeta(creator.categories);
  const hasBudget = creator.prefBudgetMin > 0 || creator.prefBudgetMax > 0;
  const topPlatforms = creator.socialAccounts.slice(0, 3);

  return (
    <Pressable
      style={({ pressed }) => [s.card, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}>

      {/* Header row */}
      <View style={s.cardHeader}>
        <CreatorAvatar avatarUrl={creator.avatarUrl} bg={meta.bg} />

        <View style={s.cardMeta}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{creator.fullName ?? 'Creator'}</Text>
            {creator.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            )}
          </View>
          {creator.location ? (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={12} color={C.textSecondary} />
              <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1}>{creator.location}</Text>
            </View>
          ) : null}

          {/* Platform icons row */}
          {topPlatforms.length > 0 ? (
            <View style={s.platformRow}>
              {topPlatforms.map((acc) => {
                const pm = getPlatformMeta(acc.platform);
                return (
                  <View key={acc.platform} style={[s.platformPill, { backgroundColor: pm.color + '18' }]}>
                    <Ionicons name={pm.icon} size={12} color={pm.color} />
                    <Text style={[s.platformCount, { color: pm.color }]}>{formatFollowers(acc.followers)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <Pressable
          style={[s.saveBtn, { backgroundColor: isSaved ? C.primaryLight : C.background, borderColor: isSaved ? C.brinjal1 : C.border }]}
          onPress={onToggleSave}
          hitSlop={8}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={isSaved ? C.brinjal1 : C.textSecondary} />
        </Pressable>
      </View>

      {/* Bio */}
      {creator.bio ? (
        <Text style={[s.bio, { color: C.textSecondary }]} numberOfLines={2}>{creator.bio}</Text>
      ) : null}

      {/* Bottom row: categories + budget */}
      <View style={s.cardFooter}>
        <View style={s.catRow}>
          {creator.categories.slice(0, 3).map((cat) => {
            const m = CATEGORY_META[cat];
            return (
              <View key={cat} style={[s.catChip, { backgroundColor: m?.bg ?? C.primaryLight }]}>
                {m ? <Text style={s.catEmoji}>{m.emoji}</Text> : null}
                <Text style={[s.catLabel, { color: C.text }]}>{cat}</Text>
              </View>
            );
          })}
          {creator.categories.length > 3 ? (
            <View style={[s.catChip, { backgroundColor: C.background, borderWidth: 1, borderColor: C.border }]}>
              <Text style={[s.catLabel, { color: C.textSecondary }]}>+{creator.categories.length - 3}</Text>
            </View>
          ) : null}
        </View>
        {hasBudget ? (
          <View style={s.budgetPill}>
            <Ionicons name="cash-outline" size={11} color="#16A34A" />
            <Text style={s.budgetText}>${creator.prefBudgetMin}–{creator.prefBudgetMax}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExploreCreatorsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();

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

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    creatorService.getSavedCreatorIds()
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => {});
  }, []));

  async function handleToggleSave(creatorId: string) {
    const wasSaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(creatorId) : next.add(creatorId);
      return next;
    });
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(creatorId) : next.delete(creatorId);
        return next;
      });
    }
  }

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
      <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.gradientHeader}>
        {/* Header */}
        <View style={s.header}>
          <BackButton fallback="/(business)/" />
          <View style={s.headerMiddle}>
            <Text style={[s.headerTitle, { color: '#fff' }]}>{t('explore.exploreCreators')}</Text>
            <Text style={s.headerSub}>{t('explore.businesses.exploreCreatorsSub')}</Text>
          </View>
          <Pressable
            style={s.savedLink}
            onPress={() => router.push('/(business)/saved-creators' as Parameters<typeof router.push>[0])}>
            <Ionicons name="bookmark" size={14} color="#fff" />
            <Text style={s.savedLinkText}>{t('explore.saved')}</Text>
          </Pressable>
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
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[s.filterBtn, { backgroundColor: filterActive ? C.brinjal1 : C.surface, borderColor: filterActive ? C.brinjal1 : C.border }]}
          onPress={openFilter}>
          <Ionicons name="options-outline" size={20} color={filterActive ? '#fff' : C.brinjal1} />
          {filterActive && <View style={s.filterDot} />}
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
              <Ionicons name={getPlatformMeta(p).icon} size={12} color={C.brinjal1} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{normalizePlatform(p)} ✕</Text>
            </Pressable>
          ))}
          {activeFilter.categories.map((cat) => (
            <Pressable key={cat} onPress={() => removeActiveFilter('categories', cat)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{CATEGORY_META[cat]?.emoji} {cat} ✕</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setActiveFilter(DEFAULT_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>{t('common.clearAll')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Result count */}
      {!loading && creators.length > 0 && (
        <View style={s.countRow}>
          <View style={[s.countPill, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
            <Ionicons name="people" size={13} color={C.brinjal1} />
            <Text style={[s.countText, { color: C.brinjal1 }]}>
              {total !== 1 ? t('explore.creatorsFoundPlural', { count: total }) : t('explore.creatorsFound', { count: total })}
            </Text>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[s.loadingText, { color: C.textSecondary }]}>{t('explore.findingCreators')}</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={() => fetchCreators(1, true, activeFilter, searchDebounced)}>
            <Text style={[s.linkText, { color: C.brinjal1 }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : creators.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyEmoji}>🧑‍🎨</Text>
          <Text style={[s.emptyTitle, { color: C.text }]}>{t('explore.noCreators')}</Text>
          <Text style={[s.emptyHint, { color: C.textSecondary }]}>
            {filterActive || search ? t('explore.adjustFilters') : t('explore.noCreatorsYet')}
          </Text>
          {(filterActive || search) && (
            <Pressable onPress={() => { setSearch(''); setActiveFilter(DEFAULT_FILTER); }} style={[s.clearBtn, { borderColor: C.brinjal1 }]}>
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
          renderItem={({ item }) => (
            <CreatorCard
              creator={item}
              isSaved={savedIds.has(item.id)}
              onToggleSave={() => handleToggleSave(item.id)}
            />
          )}
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
  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 12 },
  headerMiddle: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', fontFamily: F.bold, color: '#fff', lineHeight: 24 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular, textAlign: 'center' },
  savedLink: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  savedLinkText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  searchCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn: { width: 50, height: 50, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },

  chipRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  countRow: { paddingHorizontal: 20, marginTop: 10, marginBottom: 8, alignItems: 'flex-end' },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5 },
  countText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  loadingText: { fontSize: 14, fontFamily: F.regular },
  errorText: { color: '#DC2626', fontSize: 14, fontFamily: F.regular },
  linkText: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: F.bold },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  clearBtn: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },

  card: { borderRadius: 14, padding: 16, gap: 11, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 68, height: 68, borderRadius: 34, flexShrink: 0 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarIconWrap: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  cardMeta: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1, fontFamily: F.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 12, fontFamily: F.regular },
  platformRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  platformPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  platformCount: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  saveBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bio: { fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  catRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', flex: 1 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  catEmoji: { fontSize: 11 },
  catLabel: { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  budgetPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: '#DCFCE7', flexShrink: 0 },
  budgetText: { fontSize: 11, fontWeight: '700', color: '#16A34A', fontFamily: F.bold },

  footerWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 8, marginBottom: 36, gap: 10 },
  footerLine: { flex: 1, height: 1 },
  footerPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  footerText: { fontSize: 12, fontFamily: F.regular },
});
