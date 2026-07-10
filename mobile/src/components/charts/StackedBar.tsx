import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

export interface StackedBarSegment {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  segments: StackedBarSegment[];
}

// Single horizontal bar split into colored segments by proportion — a
// dependency-free substitute for a pie/donut chart (see BarChart.tsx).
export function StackedBar({ segments }: StackedBarProps) {
  const C = useAppColors();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  if (total === 0) {
    return (
      <View style={s.emptyWrap}>
        <Text style={[s.emptyText, { color: C.textSecondary }]}>No data for this range.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.track, { backgroundColor: C.border }]}>
        {visible.map((seg, i) => (
          <View key={i} style={{ flex: seg.value, backgroundColor: seg.color, height: '100%' }} />
        ))}
      </View>
      <View style={s.legend}>
        {visible.map((seg, i) => (
          <View key={i} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: seg.color }]} />
            <Text style={[s.legendLabel, { color: C.text }]}>{seg.label}</Text>
            <Text style={[s.legendValue, { color: C.textSecondary }]}>{seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { gap: 12 },
  track:       { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: F.medium },
  legendValue: { fontSize: 12, fontFamily: F.regular },
  emptyWrap:   { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  emptyText:   { fontSize: 12, fontFamily: F.regular },
});
