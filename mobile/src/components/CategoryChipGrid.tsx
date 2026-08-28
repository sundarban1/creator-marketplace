import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { sortOtherLast } from '@/hooks/useCategories';
import { F, FONT_SIZE, RADIUS } from '@/utilities/constants';

// Looser than ApiCategory — icon/color are optional so a caller can render a
// "stale" selected value that no longer exists in the current options list
// (e.g. a category an admin deactivated after the user picked it) as a plain
// unstyled chip, exactly as the edit-categories screens already did before
// this was extracted.
export type ChipCategory = { id: string; name: string; icon?: string; color?: string };

type Props = {
  categories: ChipCategory[];
  selected: string[];
  onToggle: (name: string) => void;
  max: number;
  /** Business onboarding sorts shortest-name-first so the greedy wrap doesn't
   *  leave a short label stranded on its own row behind a long one. */
  sortByLength?: boolean;
  /** 'default' (rounded-rect + trailing check-circle) is the onboarding-wizard
   *  look; 'pill' (fully-rounded, no check-circle, bolder selected label) is
   *  what the edit-categories settings screens use. */
  variant?: 'default' | 'pill';
  /** Fires when a past-the-cap chip is tapped — lets a caller show its own
   *  "max reached" toast/warning instead of the tap silently no-opping. */
  onMaxReached?: () => void;
};

// Capped, color-coded multi-select chip grid — the "pick up to N categories"
// pattern shared by provider onboarding (services), business onboarding
// (industry, service interests) and both edit-categories screens. Distinct
// from the app's generic FilterChip/FilterChipGroup (used for filter modals):
// this variant needs a selection cap with disabled-past-cap chips and a
// per-category icon color, neither of which FilterChipGroup supports.
export function CategoryChipGrid({ categories, selected, onToggle, max, sortByLength, variant = 'default', onMaxReached }: Props) {
  const C = useAppColors();
  // "Other" is always pinned last, after any length sort the caller asked for.
  const list = sortOtherLast(
    sortByLength ? [...categories].sort((a, b) => a.name.length - b.name.length) : categories,
  );
  const pill = variant === 'pill';

  return (
    <View style={s.grid}>
      {list.map((cat) => {
        const isSelected = selected.includes(cat.name);
        const isDisabled = !isSelected && selected.length >= max;
        return (
          <Pressable
            key={cat.id}
            style={[
              s.chip,
              pill ? s.chipPill : s.chipDefault,
              { borderColor: C.border, backgroundColor: C.surface },
              isSelected && { borderColor: C.brinjal1, backgroundColor: C.primaryLight },
              isDisabled && s.chipDisabled,
            ]}
            onPress={() => { if (isDisabled) onMaxReached?.(); else onToggle(cat.name); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled: isDisabled }}
            accessibilityLabel={cat.name}>
            {cat.icon && <FontAwesome5 name={cat.icon as any} size={pill ? 12 : 14} color={cat.color ?? C.textSecondary} />}
            <Text style={[s.label, { color: isSelected ? C.brinjal1 : C.text }, isSelected && { fontFamily: F.bold }]}>
              {cat.name}
            </Text>
            {!pill && isSelected && <FontAwesome5 name="check-circle" solid size={14} color={C.brinjal1} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5 },
  chipDefault: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm },
  chipPill: { paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, borderRadius: RADIUS.full },
  chipDisabled: { opacity: 0.35 },
  label: { fontSize: FONT_SIZE.sm, fontFamily: F.medium },
});
