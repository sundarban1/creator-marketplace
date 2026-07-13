import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type ChipOption = { value: string; label: string; icon?: IoniconName };

type ChipProps = {
  label: string;
  icon?: IoniconName;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
};

// Single selectable chip — the one "selected" visual language shared by every
// filter modal in the app (event-type, platform, category, etc.), so it can't
// silently drift between screens again.
export function FilterChip({ label, icon, selected, onPress, flex }: ChipProps) {
  const C = useAppColors();
  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={[
        s.chip,
        flex && s.chipFlex,
        { borderColor: selected ? C.brinjal1 : C.border, backgroundColor: selected ? C.primaryLight : C.background },
      ]}
      onPress={onPress}>
      {icon && <Ionicons name={icon} size={13} color={selected ? C.brinjal1 : C.textSecondary} />}
      <Text style={[s.chipTxt, { color: selected ? C.brinjal1 : C.textSecondary, fontWeight: selected ? '700' : '500' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type GroupProps = {
  options: ChipOption[];
  selected: string[];
  onToggle: (values: string[]) => void;
  multi?: boolean;
  equalWidth?: boolean;
};

// Row of FilterChips. `multi` allows several selections at once (platform,
// category); single-select mode (event type) toggles exclusively and allows
// de-selecting back to "none" by tapping the active chip again.
export function FilterChipGroup({ options, selected, onToggle, multi = false, equalWidth = false }: GroupProps) {
  function handlePress(value: string) {
    if (multi) {
      onToggle(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onToggle(selected.includes(value) ? [] : [value]);
    }
  }

  return (
    <View style={s.row}>
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          selected={selected.includes(opt.value)}
          onPress={() => handlePress(opt.value)}
          flex={equalWidth}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  chipFlex:{ flex: 1, justifyContent: 'center' },
  chipTxt: { fontSize: 13, fontFamily: F.medium },
});
