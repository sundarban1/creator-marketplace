import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';
import { formatNpt, fromNptWall, toNptWall } from './model';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;

/**
 * Date + time field edited in Nepal time — the native counterpart of web's
 * NptDateTimeField. Reads and writes ISO instants.
 */
export function DateTimeField({ label, value, onChange, disabled }: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  // Edited as an NPT wall clock (UTC fields), committed on "Done".
  const [draft, setDraft] = useState(() => toNptWall(value));
  const [month, setMonth] = useState({ y: draft.getUTCFullYear(), m: draft.getUTCMonth() });

  function show() {
    const w = toNptWall(value);
    setDraft(w);
    setMonth({ y: w.getUTCFullYear(), m: w.getUTCMonth() });
    setOpen(true);
  }
  const patch = (fn: (d: Date) => void) => setDraft((prev) => { const d = new Date(prev); fn(d); return d; });
  const shiftMonth = (by: number) => setMonth(({ y, m }) => {
    const n = m + by;
    return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
  });

  const firstWeekday = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const selected = (day: number) => draft.getUTCFullYear() === month.y && draft.getUTCMonth() === month.m && draft.getUTCDate() === day;
  const minute = MINUTES.includes(draft.getUTCMinutes()) ? draft.getUTCMinutes() : null;

  return (
    <View>
      <Text style={[s.label, { color: C.text }]}>{label}</Text>
      <Pressable
        onPress={show}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatNpt(value)}`}
        style={({ pressed }) => [s.trigger, { borderColor: C.border, backgroundColor: C.surface, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
        <Text style={[s.value, { color: C.text }]}>{formatNpt(value)}</Text>
        <FontAwesome5 name="calendar-alt" size={16} color={C.textSecondary} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        maxHeightPct={0.85}
        footer={<Button label={t('competition.done')} onPress={() => { onChange(fromNptWall(draft)); setOpen(false); }} />}>
        <View style={s.monthNav}>
          <Pressable onPress={() => shiftMonth(-1)} style={s.navBtn} accessibilityLabel={t('competition.prevMonth')}>
            <FontAwesome5 name="chevron-left" size={14} color={C.brinjal1} />
          </Pressable>
          <Text style={[s.monthTitle, { color: C.text }]}>{MONTHS[month.m]} {month.y}</Text>
          <Pressable onPress={() => shiftMonth(1)} style={s.navBtn} accessibilityLabel={t('competition.nextMonth')}>
            <FontAwesome5 name="chevron-right" size={14} color={C.brinjal1} />
          </Pressable>
        </View>
        <View style={s.row}>
          {DAYS.map((d) => <Text key={d} style={[s.dayHdr, { color: C.textSecondary }]}>{d}</Text>)}
        </View>
        <View style={s.grid}>
          {cells.map((day, i) => (
            <View key={i} style={s.cell}>
              {day ? (
                <Pressable
                  onPress={() => patch((d) => d.setUTCFullYear(month.y, month.m, day))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected(day) }}
                  style={[s.dayCircle, selected(day) && { backgroundColor: C.brinjal1 }]}>
                  <Text style={[s.dayNum, { color: selected(day) ? '#fff' : C.text }]}>{day}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <Text style={[s.label, { color: C.text, marginTop: SPACING.lg }]}>{t('competition.time')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {HOURS.map((h) => (
            <Chip key={h} label={hourLabel(h)} active={draft.getUTCHours() === h} onPress={() => patch((d) => d.setUTCHours(h))} />
          ))}
        </ScrollView>
        <View style={[s.chips, { marginTop: SPACING.sm }]}>
          {MINUTES.map((m) => (
            <Chip key={m} label={`:${String(m).padStart(2, '0')}`} active={minute === m} onPress={() => patch((d) => d.setUTCMinutes(m, 0, 0))} />
          ))}
        </View>
        <Text style={[s.preview, { color: C.textSecondary }]}>{formatNpt(fromNptWall(draft))}</Text>
      </BottomSheet>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const C = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[s.chip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}>
      <Text style={[s.chipTxt, { color: active ? C.brinjal1 : C.text }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  label:      { fontSize: FONT_SIZE.sm + 1, lineHeight: lineHeightFor(FONT_SIZE.sm + 1), fontFamily: F.medium, marginBottom: 6 },
  trigger:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 48, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md },
  value:      { flex: 1, fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md), fontFamily: F.regular },
  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:     { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md), fontFamily: F.semibold },
  row:        { flexDirection: 'row' },
  dayHdr:     { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.xs, lineHeight: lineHeightFor(FONT_SIZE.xs), fontFamily: F.semibold },
  grid:       { flexDirection: 'row', flexWrap: 'wrap' },
  cell:       { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle:  { width: 38, height: 38, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  dayNum:     { fontSize: FONT_SIZE.sm + 1, lineHeight: lineHeightFor(FONT_SIZE.sm + 1), fontFamily: F.medium },
  chips:      { flexDirection: 'row', gap: SPACING.sm },
  chip:       { minHeight: 40, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipTxt:    { fontSize: FONT_SIZE.sm + 1, lineHeight: lineHeightFor(FONT_SIZE.sm + 1), fontFamily: F.medium },
  preview:    { marginTop: SPACING.md, fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm), fontFamily: F.regular },
});
