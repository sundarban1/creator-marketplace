import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

export interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  valueFormatter?: (v: number) => string;
  barColor?: string;
  height?: number;
}

// Plain flexbox bar chart — no react-native-svg / charting lib dependency,
// deliberately, to avoid a native module + Expo prebuild requirement.
export function BarChart({ data, valueFormatter, barColor, height = 140 }: BarChartProps) {
  const C = useAppColors();
  const color = barColor ?? C.brinjal1;
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString());

  if (data.length === 0) {
    return (
      <View style={[s.emptyWrap, { height }]}>
        <Text style={[s.emptyText, { color: C.textSecondary }]}>No data for this range.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.barsRow, { height }]}>
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / max) * (height - 20));
          return (
            <View key={i} style={s.barCol}>
              <Text style={[s.valueLabel, { color: C.text }]} numberOfLines={1}>{fmt(d.value)}</Text>
              <View style={[s.bar, { height: barHeight, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={s.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={[s.axisLabel, { color: C.textSecondary }]} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { gap: 6 },
  barsRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar:         { width: '70%', minWidth: 8, borderRadius: 4 },
  valueLabel:  { fontSize: 9, fontFamily: F.medium },
  labelsRow:   { flexDirection: 'row', gap: 6 },
  axisLabel:   { flex: 1, fontSize: 9, fontFamily: F.regular, textAlign: 'center' },
  emptyWrap:   { alignItems: 'center', justifyContent: 'center' },
  emptyText:   { fontSize: 12, fontFamily: F.regular },
});
