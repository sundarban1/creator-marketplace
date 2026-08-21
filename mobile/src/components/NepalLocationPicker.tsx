import { useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { F, RADIUS } from '@/utilities/constants';
import {
  MAJOR_CITIES_BY_DISTRICT,
  NEPAL_PROVINCES,
  districtsOf,
} from '@/utilities/nepalAdministrative';

export type NepalLocationValue = {
  province: string | null;
  district: string | null;
  city: string;
};

type Props = {
  value: NepalLocationValue;
  onChange: (next: NepalLocationValue) => void;
  errors?: { province?: string; district?: string; city?: string };
};

// Province → District → City / Municipality, the structure the spec (§14) asks
// for. The two upper levels are fixed lists (see nepalAdministrative.ts for why
// the third isn't); the city level is a text field with one-tap suggestions for
// the districts whose metropolitan/sub-metropolitan city we know.
//
// The cascade clears downward: changing province drops the district and city,
// changing district drops the city. Anything else would let "Bagmati /
// Sunsari / Dharan" be assembled by editing one level at a time.
export function NepalLocationPicker({ value, onChange, errors }: Props) {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const [sheet, setSheet] = useState<'province' | 'district' | null>(null);

  const districts  = districtsOf(value.province);
  const suggestions = value.district ? MAJOR_CITIES_BY_DISTRICT[value.district] ?? [] : [];

  function provinceLabel(name: string) {
    const p = NEPAL_PROVINCES.find((x) => x.name === name);
    return language === 'ne' && p ? p.nameNe : name;
  }

  function selectProvince(name: string) {
    onChange({ province: name, district: null, city: '' });
    setSheet(null);
  }

  function selectDistrict(name: string) {
    onChange({ ...value, district: name, city: '' });
    setSheet(null);
  }

  return (
    <>
      {/* ── Province ── */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: C.text }]}>
          {t('nepalLocation.provinceLabel')} <Text style={{ color: C.error }}>*</Text>
        </Text>
        <Pressable
          onPress={() => setSheet('province')}
          style={[styles.select, { backgroundColor: C.surface, borderColor: errors?.province ? C.error : C.border }]}
          accessibilityRole="button"
          accessibilityLabel={t('nepalLocation.provinceLabel')}>
          <FontAwesome5 name="map" size={15} color={C.textSecondary} />
          <Text style={[styles.selectText, { color: value.province ? C.text : C.textSecondary }]}>
            {value.province ? provinceLabel(value.province) : t('nepalLocation.provincePlaceholder')}
          </Text>
          <FontAwesome5 name="chevron-down" size={13} color={C.textSecondary} />
        </Pressable>
        {errors?.province ? <Text style={[styles.error, { color: C.error }]}>{errors.province}</Text> : null}
      </View>

      {/* ── District ── */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: C.text }]}>
          {t('nepalLocation.districtLabel')} <Text style={{ color: C.error }}>*</Text>
        </Text>
        <Pressable
          onPress={() => value.province && setSheet('district')}
          disabled={!value.province}
          style={[
            styles.select,
            { backgroundColor: C.surface, borderColor: errors?.district ? C.error : C.border },
            !value.province && styles.selectDisabled,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !value.province }}
          accessibilityLabel={t('nepalLocation.districtLabel')}>
          <FontAwesome5 name="map-marked-alt" size={15} color={C.textSecondary} />
          <Text style={[styles.selectText, { color: value.district ? C.text : C.textSecondary }]}>
            {value.district
              ?? (value.province ? t('nepalLocation.districtPlaceholder') : t('nepalLocation.districtLocked'))}
          </Text>
          <FontAwesome5 name="chevron-down" size={13} color={C.textSecondary} />
        </Pressable>
        {errors?.district ? <Text style={[styles.error, { color: C.error }]}>{errors.district}</Text> : null}
      </View>

      {/* ── City / Municipality ── */}
      <View style={styles.field}>
        <TextInputWithLabel
          label={`${t('nepalLocation.cityLabel')} *`}
          leftIcon="city"
          value={value.city}
          onChangeText={(v) => onChange({ ...value, city: v })}
          placeholder={t('nepalLocation.cityPlaceholder')}
          autoCapitalize="words"
          editable={!!value.district}
          error={errors?.city}
          hint={value.district ? undefined : t('nepalLocation.cityLocked')}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestRow}>
            {suggestions.map((s) => {
              const active = value.city.trim() === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => onChange({ ...value, city: s })}
                  style={[styles.suggestChip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}>
                  <Text style={[styles.suggestText, { color: active ? C.brinjal1 : C.textSecondary }]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <BottomSheet
        visible={sheet === 'province'}
        onClose={() => setSheet(null)}
        title={t('nepalLocation.provinceSheetTitle')}
        scrollable
        maxHeightPct={0.7}>
        {NEPAL_PROVINCES.map((p) => (
          <OptionRow
            key={p.name}
            label={language === 'ne' ? p.nameNe : p.name}
            sublabel={language === 'ne' ? p.name : undefined}
            selected={value.province === p.name}
            onPress={() => selectProvince(p.name)}
          />
        ))}
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'district'}
        onClose={() => setSheet(null)}
        title={t('nepalLocation.districtSheetTitle')}
        subtitle={value.province ? provinceLabel(value.province) : undefined}
        scrollable
        maxHeightPct={0.7}>
        {districts.map((d) => (
          <OptionRow key={d} label={d} selected={value.district === d} onPress={() => selectDistrict(d)} />
        ))}
      </BottomSheet>
    </>
  );
}

function OptionRow({
  label, sublabel, selected, onPress,
}: { label: string; sublabel?: string; selected: boolean; onPress: () => void }) {
  const C = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, { borderBottomColor: C.border }]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, { color: selected ? C.brinjal1 : C.text }]}>{label}</Text>
        {sublabel ? <Text style={[styles.optionSub, { color: C.textSecondary }]}>{sublabel}</Text> : null}
      </View>
      {selected && <FontAwesome5 name="check" size={14} color={C.brinjal1} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontFamily: F.bold, marginBottom: 8 },
  select: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 13,
    // Matches TextInputWithLabel's touch target so the three rows line up.
    minHeight: 50,
  },
  selectDisabled: { opacity: 0.55 },
  // 15 * 1.5 = 22.5 -> 23, so Nepali matras aren't clipped.
  selectText: { flex: 1, fontSize: 15, lineHeight: 23, fontFamily: F.regular },
  error: { fontSize: 12, fontFamily: F.medium, marginTop: 5 },

  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestChip: { borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  suggestText: { fontSize: 12.5, lineHeight: 19, fontFamily: F.medium },

  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, lineHeight: 23, fontFamily: F.semibold },
  optionSub: { fontSize: 12, lineHeight: 18, fontFamily: F.regular, marginTop: 2 },
});
