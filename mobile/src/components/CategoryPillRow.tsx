import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { getCategoryMeta } from '@/hooks/useCategories';
import type { ApiCategory } from '@/services/category';
import { F, RADIUS, SCREEN_GUTTER } from '@/utilities/constants';

type Props = {
  categories: ApiCategory[];
  activeLabels: string[];
  onToggle: (label: string) => void;
  // Lays every pill out in a wrapping grid (multiple lines, no scrolling)
  // instead of the default single horizontally-scrollable row — for callers
  // (e.g. search's "Popular on Kolab") where every category should be visible
  // on the page at once rather than requiring a swipe to discover the rest.
  wrap?: boolean;
  // Prepends a plain "All" pill (no icon), active whenever activeLabels is
  // empty — matches the All/Categories chip row style used across the
  // Opportunities/Businesses/People tabs. onAllPress is separate from
  // onToggle since "clear every category" isn't the same shape as toggling
  // one specific label (single- vs. multi-select callers handle it differently).
  showAll?: boolean;
  allLabel?: string;
  onAllPress?: () => void;
};

// Category chips styled to match the pill row already used on Discover's
// "Opportunities" tab (icon + label, rounded-full, filled when active) —
// shared here so Opportunities/Businesses/People show categories the exact
// same way instead of each tab inventing its own look.
export function CategoryPillRow({ categories, activeLabels, onToggle, wrap, showAll, allLabel = 'All', onAllPress }: Props) {
  const C = useAppColors();

  const allActive = activeLabels.length === 0;
  const allPill = showAll && (
    <Pressable
      key="__all"
      style={[s.pill, { backgroundColor: allActive ? C.brinjal1 : C.surface, borderColor: allActive ? C.brinjal1 : C.border }]}
      onPress={onAllPress}>
      <Text style={[s.label, { color: allActive ? '#fff' : C.text }]} numberOfLines={1}>{allLabel}</Text>
    </Pressable>
  );

  const pills = categories.map((cat) => {
    const meta = getCategoryMeta(categories, cat.name);
    const isActive = activeLabels.includes(cat.name);
    return (
      <Pressable
        key={cat.id}
        style={[s.pill, { backgroundColor: isActive ? meta.color : C.surface, borderColor: isActive ? meta.color : C.border }]}
        onPress={() => onToggle(cat.name)}>
        <FontAwesome5 name={meta.icon} size={13} color={isActive ? '#fff' : meta.color} />
        <Text style={[s.label, { color: isActive ? '#fff' : C.text }]} numberOfLines={1}>{displayCategory(cat.name)}</Text>
      </Pressable>
    );
  });

  if (wrap) {
    return <View style={s.wrapRow}>{allPill}{pills}</View>;
  }

  return (
    <ScrollView style={s.scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {allPill}
      {pills}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Without an explicit `style` here (contentContainerStyle alone isn't
  // enough), a horizontal ScrollView embedded next to other flex:1 siblings
  // doesn't reliably shrink-wrap to its content height — it can stretch
  // taller than the 38px pills, reading as a big gap underneath the row.
  // Pinning it to the pill height removes that ambiguity entirely.
  scroll:  { height: 38, flexGrow: 0 },
  row:     { paddingHorizontal: SCREEN_GUTTER, gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: RADIUS.full, paddingHorizontal: 12, borderWidth: 1 },
  label:   { fontSize: 13, fontFamily: F.semibold },
});
