import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FilterSheet, FilterSectionHeader, ActiveFilterChips, type ActiveFilterChip } from '@/components/FilterSheet';
import { BudgetRangePicker, matchBudgetPreset, type BudgetPreset } from '@/components/BudgetRangePicker';
import { LocationSearchPicker, type LocationEntry } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { F, RADIUS } from '@/utilities/constants';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';

// Shared Category / Location / Budget / Platform filter sheet for browsing
// creators — used by both "Explore Creators" and "Saved Creators" so the two
// stay in lockstep instead of drifting into near-duplicate copies.

export const CREATOR_SLIDER_MIN = 1000;
export const CREATOR_SLIDER_MAX = 100000;
export const CREATOR_MAX_LOCS = 3;

export type CreatorFilterState = {
  locations:  LocationEntry[];
  priceMin:   number;
  priceMax:   number;
  platforms:  string[];
  categories: string[];
};

export const DEFAULT_CREATOR_FILTER: CreatorFilterState = {
  locations:  [],
  priceMin:   CREATOR_SLIDER_MIN,
  priceMax:   CREATOR_SLIDER_MAX,
  platforms:  [],
  categories: [],
};

export function formatCreatorRate(v: number): string {
  if (v >= 100000) return `Rs ${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `Rs ${(v / 1000).toFixed(0)}K`;
  return `Rs ${v}`;
}

export function creatorFilterActiveCount(f: CreatorFilterState): number {
  return [
    f.locations.length > 0,
    f.priceMin > CREATOR_SLIDER_MIN || f.priceMax < CREATOR_SLIDER_MAX,
    f.platforms.length > 0,
    f.categories.length > 0,
  ].filter(Boolean).length;
}
export function isCreatorFilterActive(f: CreatorFilterState): boolean {
  return creatorFilterActiveCount(f) > 0;
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// Same "fast path first" concept as every other range filter in the app —
// scaled to this screen's own rate range (Rs 1K–1L), not the campaign-budget
// scale used on the home feed.
function budgetPresets(t: TFn): BudgetPreset[] {
  return [
    { key: 'any',     min: CREATOR_SLIDER_MIN, max: CREATOR_SLIDER_MAX, label: t('explore.presetAnyRate')     },
    { key: 'u10k',    min: CREATOR_SLIDER_MIN, max: 10000,              label: t('explore.presetUnder10k')    },
    { key: '10to50k', min: 10000,              max: 50000,              label: t('explore.preset10kTo50k')    },
    { key: '50kp',    min: 50000,              max: CREATOR_SLIDER_MAX, label: t('explore.preset50kPlus')      },
  ];
}

type Props = {
  visible: boolean;
  temp: CreatorFilterState;
  setTemp: (f: CreatorFilterState) => void;
  availableCategories: string[];
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function CreatorFilterModal({
  visible, temp, setTemp, availableCategories,
  onApply, onReset, onClose,
}: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const BUDGET_PRESETS = budgetPresets(t);

  function set<K extends keyof CreatorFilterState>(key: K, val: CreatorFilterState[K]) {
    setTemp({ ...temp, [key]: val });
  }

  const matchedBudget = matchBudgetPreset(BUDGET_PRESETS, temp.priceMin, temp.priceMax);

  const activeChips: ActiveFilterChip[] = [];
  for (const loc of temp.locations) {
    activeChips.push({
      key: `loc-${loc.label}`,
      label: loc.label === 'Remote' ? t('filterModal.remote') : loc.label,
      onClear: () => set('locations', temp.locations.filter((l) => l.label !== loc.label)),
    });
  }
  if (!matchedBudget || matchedBudget.key !== 'any') {
    activeChips.push({
      key: 'budget',
      label: matchedBudget ? matchedBudget.label : `${formatCreatorRate(temp.priceMin)}–${temp.priceMax >= CREATOR_SLIDER_MAX ? `${formatCreatorRate(CREATOR_SLIDER_MAX)}+` : formatCreatorRate(temp.priceMax)}`,
      onClear: () => { set('priceMin', CREATOR_SLIDER_MIN); set('priceMax', CREATOR_SLIDER_MAX); },
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
          <View style={s.chips}>
            {availableCategories.map((cat) => {
              const meta = getCategoryMeta(allCategories, cat);
              const sel = temp.categories.includes(cat);
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={cat}
                  onPress={() => set('categories', toggle(temp.categories, cat))}
                  style={[s.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                  <FontAwesome5 name={meta.icon} size={12} color={sel ? meta.color : C.textSecondary} />
                  <Text style={[s.chipText, { color: sel ? C.brinjal1 : C.text, fontWeight: sel ? '700' : '500' }]}>{cat}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Location */}
      <View>
        <FilterSectionHeader
          icon="location-outline"
          label={t('explore.location')}
          hint={t('explore.locationsAllowed', { count: temp.locations.length, max: CREATOR_MAX_LOCS })}
        />
        <LocationSearchPicker selected={temp.locations} onSelect={(v) => set('locations', v)} />
      </View>

      {/* Budget — one-tap presets first, precise slider tucked behind "Custom" */}
      <View>
        <FilterSectionHeader icon="cash-outline" label={t('explore.priceRange')} />
        <BudgetRangePicker
          visible={visible}
          presets={BUDGET_PRESETS}
          min={temp.priceMin}
          max={temp.priceMax}
          onChange={(min, max) => setTemp({ ...temp, priceMin: min, priceMax: max })}
          sliderMin={CREATOR_SLIDER_MIN}
          sliderMax={CREATOR_SLIDER_MAX}
          customLabel={t('filterModal.customLabel')}
        />
      </View>

      {/* Platform — sourced from the admin platform catalog so every supported
          platform is always selectable, not just ones a creator already connected. */}
      {allPlatforms.length > 0 && (
        <View>
          <FilterSectionHeader
            icon="phone-portrait-outline"
            label={t('explore.platform')}
            hint={temp.platforms.length > 0 ? t('filterModal.selectedCount', { count: temp.platforms.length }) : undefined}
          />
          <View style={s.chips}>
            {allPlatforms.map((p) => {
              const sel = temp.platforms.includes(p.key);
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={p.key}
                  onPress={() => set('platforms', toggle(temp.platforms, p.key))}
                  style={[s.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}>
                  <FontAwesome5 name={p.icon} size={13} color={sel ? C.brinjal1 : p.color} />
                  <Text style={[s.chipText, { color: sel ? C.brinjal1 : C.text, fontWeight: sel ? '700' : '500' }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </FilterSheet>
  );
}

const s = StyleSheet.create({
  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: F.medium },
});
