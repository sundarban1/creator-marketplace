import { View } from 'react-native';
import { FilterSheet, FilterSectionHeader, ActiveFilterChips, type ActiveFilterChip } from '@/components/FilterSheet';
import { LocationSearchPicker, type LocationFilter } from '@/components/LocationSearchPicker';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();

  const activeChips: ActiveFilterChip[] = [];
  if (tempPlatform) activeChips.push({ key: 'platform', label: tempPlatform, onClear: () => setTempPlatform('') });
  if (tempCategory) activeChips.push({ key: 'category', label: tempCategory, onClear: () => setTempCategory('') });
  for (const loc of tempLocation) {
    activeChips.push({
      key: `loc-${loc.label}`,
      label: loc.label,
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

      {/* Location */}
      <View>
        <FilterSectionHeader
          icon="map-marker-alt"
          label={t('explore.businesses.filterLocation')}
          hint={t('explore.businesses.filterLocationCount', { n: tempLocation.length })}
        />
        {/* No Remote chip — a business is filtered by where it actually is,
            so "Remote" was never a location a business could match. */}
        <LocationSearchPicker selected={tempLocation} onSelect={setTempLocation} showRemoteOption={false} />
      </View>
    </FilterSheet>
  );
}
