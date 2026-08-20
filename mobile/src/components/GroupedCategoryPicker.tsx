import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F, FONT_SIZE } from '@/utilities/constants';
import { CategoryChipGrid, type ChipCategory } from '@/components/CategoryChipGrid';

type GroupedChipCategory = ChipCategory & { group?: string | null };

type Props = {
  categories: GroupedChipCategory[];
  selected: string[];
  onToggle: (name: string) => void;
  max: number;
  onMaxReached?: () => void;
  variant?: 'default' | 'pill';
};

// Same "pick up to N" chip grid as CategoryChipGrid, but sectioned by the
// category's `group` (e.g. "Photography", "Events") so a large provider-role
// taxonomy (~50 roles) reads as ~10 broad categories with the specific roles
// underneath, instead of one long flat wall of chips. Rows with no group
// (or when nothing has a group — e.g. the industry list) render as a single
// ungrouped section.
export function GroupedCategoryPicker({ categories, selected, onToggle, max, onMaxReached, variant }: Props) {
  const C = useAppColors();
  const groups = new Map<string, GroupedChipCategory[]>();
  const ungrouped: GroupedChipCategory[] = [];

  for (const cat of categories) {
    const key = cat.group;
    if (key) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(cat);
    } else {
      ungrouped.push(cat);
    }
  }

  if (groups.size === 0) {
    return <CategoryChipGrid categories={ungrouped} selected={selected} onToggle={onToggle} max={max} onMaxReached={onMaxReached} variant={variant} />;
  }

  return (
    <View style={s.wrap}>
      {ungrouped.length > 0 && (
        <CategoryChipGrid categories={ungrouped} selected={selected} onToggle={onToggle} max={max} onMaxReached={onMaxReached} variant={variant} />
      )}
      {[...groups.entries()].map(([group, items]) => (
        <View key={group} style={s.section}>
          <Text style={[s.sectionTitle, { color: C.textSecondary }]}>{group.toUpperCase()}</Text>
          <CategoryChipGrid categories={items} selected={selected} onToggle={onToggle} max={max} onMaxReached={onMaxReached} variant={variant} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: FONT_SIZE.xs, fontFamily: F.bold, letterSpacing: 0.5 },
});
