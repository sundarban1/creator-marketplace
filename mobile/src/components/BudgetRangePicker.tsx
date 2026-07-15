import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RangeSlider } from '@/components/RangeSlider';
import { FilterChip } from '@/components/FilterChip';

export type BudgetPreset = { key: string; min: number; max: number; label: string };

// One-tap presets first, with the precise slider tucked behind an explicit
// "Custom" chip — the same "fast path first" concept used for every range
// filter in the app (budget, deadline, …), so opening a filter sheet doesn't
// always mean staring at a full slider before you can do anything.
export function BudgetRangePicker({
  visible, presets, min, max, onChange, sliderMin = 0, sliderMax, step = 10, currency = 'Rs', customLabel,
}: {
  /** Pass the sheet's own `visible` prop so a stale "custom open" flag from
   *  the previous visit doesn't linger once the sheet is reopened. */
  visible: boolean;
  presets: BudgetPreset[];
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
  /** Floor of the underlying slider (not to be confused with `min`, the currently selected value). Defaults to 0. */
  sliderMin?: number;
  sliderMax: number;
  step?: number;
  currency?: string;
  customLabel: string;
}) {
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (visible) setCustomOpen(false);
  }, [visible]);

  const matched = presets.find((p) => p.min === min && p.max === max) ?? null;
  const showCustom = customOpen || !matched;
  const selectedKey = matched?.key ?? (showCustom ? 'custom' : undefined);

  return (
    <View>
      <View style={s.row}>
        {presets.map((p) => (
          <FilterChip
            key={p.key}
            label={p.label}
            selected={selectedKey === p.key}
            onPress={() => { onChange(p.min, p.max); setCustomOpen(false); }}
          />
        ))}
        <FilterChip
          label={customLabel}
          icon="options-outline"
          selected={selectedKey === 'custom'}
          onPress={() => setCustomOpen(true)}
        />
      </View>
      {showCustom && (
        <View style={s.panel}>
          <RangeSlider
            minVal={min}
            maxVal={max}
            onMinChange={(v) => onChange(v, max)}
            onMaxChange={(v) => onChange(min, v)}
            currency={currency}
            min={sliderMin}
            max={sliderMax}
            step={step}
          />
        </View>
      )}
    </View>
  );
}

/** Preset matcher usable outside the picker too (e.g. for an active-filter summary chip). */
export function matchBudgetPreset(presets: BudgetPreset[], min: number, max: number) {
  return presets.find((p) => p.min === min && p.max === max) ?? null;
}

const s = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  panel: { marginTop: 12 },
});
