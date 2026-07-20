import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FilterSheet, FilterSectionHeader, ActiveFilterChips, type ActiveFilterChip } from '@/components/FilterSheet';
import { LocationSearchPicker, type LocationFilter } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS } from '@/utilities/constants';
import { useCategories } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';

// Shared Platform / Category / Location filter sheet for browsing businesses —
// used by both the "Explore Businesses" and "Saved Brands" (favorites) screens
// so the two stay in lockstep instead of drifting into near-duplicate copies.

type Props = {
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
};

export function BusinessFilterModal({
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
}: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: businessCategories } = useCategories('BUSINESS');
  const { platforms: allPlatforms } = usePlatforms();

  const activeChips: ActiveFilterChip[] = [];
  if (tempPlatform) activeChips.push({ key: 'platform', label: tempPlatform, onClear: () => setTempPlatform('') });
  if (tempCategory) activeChips.push({ key: 'category', label: tempCategory, onClear: () => setTempCategory('') });
  for (const loc of tempLocation) {
    activeChips.push({
      key: `loc-${loc.label}`,
      label: loc.label === 'Remote' ? t('filterModal.remote') : loc.label,
      onClear: () => setTempLocation(tempLocation.filter((l) => l.label !== loc.label)),
    });
  }

  const applyLabel = activeChips.length > 0
    ? t('explore.businesses.filterApplyCount', { n: activeChips.length })
    : t('explore.businesses.filterShowAll');

  return (
    <FilterSheet
      visible={visible}
      title={t('explore.businesses.filterTitle')}
      resetLabel={t('explore.businesses.filterResetAll')}
      applyLabel={applyLabel}
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <ActiveFilterChips chips={activeChips} />

      {/* Platform */}
      <View>
        <FilterSectionHeader icon="phone-portrait-outline" label={t('explore.businesses.filterPlatform')} />
        <View style={s.chipGrid}>
          {allPlatforms.map((p) => {
            const active = tempPlatform === p.name;
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={p.id}
                onPress={() => setTempPlatform(active ? '' : p.name)}
                style={[s.filterChip, { borderColor: active ? p.color : C.border, backgroundColor: active ? p.iconBg : C.background }]}>
                <FontAwesome5 name={p.icon} size={12} color={active ? p.color : C.textSecondary} />
                <Text style={[s.filterChipText, { color: active ? p.color : C.text, fontWeight: active ? '700' : '400' }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Category */}
      <View>
        <FilterSectionHeader icon="pricetag-outline" label={t('explore.businesses.filterCategory')} />
        <View style={s.chipGrid}>
          {businessCategories.map((cat) => {
            const active = tempCategory === cat.name;
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={cat.id}
                onPress={() => setTempCategory(active ? '' : cat.name)}
                style={[s.filterChip, { borderColor: active ? cat.color : C.border, backgroundColor: active ? cat.iconBg : C.background }]}>
                <FontAwesome5 name={cat.icon} size={12} color={active ? cat.color : C.textSecondary} />
                <Text style={[s.filterChipText, { color: active ? cat.color : C.text, fontWeight: active ? '700' : '400' }]}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Location */}
      <View>
        <FilterSectionHeader
          icon="location-outline"
          label={t('explore.businesses.filterLocation')}
          hint={t('explore.businesses.filterLocationCount', { n: tempLocation.length })}
        />
        <LocationSearchPicker selected={tempLocation} onSelect={setTempLocation} />
      </View>
    </FilterSheet>
  );
}

const s = StyleSheet.create({
  chipGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipText: { fontSize: 13, fontFamily: F.medium },
});
