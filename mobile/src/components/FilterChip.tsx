import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS } from '@/utilities/constants';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

export type ChipOption = { value: string; label: string; icon?: IoniconName };

type ChipProps = {
  label: string;
  icon?: IoniconName;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
  /** Show a trailing check-circle once selected — off by default so existing
   *  filter sheets keep their current look; opt in per screen. */
  showCheck?: boolean;
};

// Single selectable chip — the one "selected" visual language shared by every
// filter modal in the app (event-type, platform, category, etc.), so it can't
// silently drift between screens again.
export function FilterChip({ label, icon, selected, onPress, flex, showCheck }: ChipProps) {
  const C = useAppColors();
  return (
    <Pressable
      style={[
        s.chip,
        flex && s.chipFlex,
        { borderColor: selected ? C.brinjal1 : C.border, backgroundColor: selected ? C.primaryLight : C.background },
      ]}
      onPress={onPress}>
      {icon && <FontAwesome5 name={icon} size={13} color={selected ? C.brinjal1 : C.textSecondary} />}
      <Text style={[s.chipTxt, { color: selected ? C.brinjal1 : C.textSecondary, fontWeight: selected ? '700' : '500' }]}>
        {label}
      </Text>
      {showCheck && selected && <FontAwesome5 name="check-circle" solid size={13} color={C.brinjal1} />}
    </Pressable>
  );
}

type GroupProps = {
  options: ChipOption[];
  selected: string[];
  onToggle: (values: string[]) => void;
  multi?: boolean;
  equalWidth?: boolean;
  showCheck?: boolean;
};

// Row of FilterChips. `multi` allows several selections at once (platform,
// category); single-select mode (event type) toggles exclusively and allows
// de-selecting back to "none" by tapping the active chip again.
export function FilterChipGroup({ options, selected, onToggle, multi = false, equalWidth = false, showCheck = false }: GroupProps) {
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
          showCheck={showCheck}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipFlex:{ flex: 1, justifyContent: 'center' },
  chipTxt: { fontSize: 13, fontFamily: F.medium },
});
