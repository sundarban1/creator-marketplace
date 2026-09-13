import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/BottomSheet';
import { dayStart, fmtDate, getDaysInMonth, getFirstWeekday, sameDay } from '@/features/business/utils/campaignFormMappers';
import { F, RADIUS } from '@/utilities/constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const ERROR_RED = '#EF4444';

// A single-date picker for the Create Promotion form (Valid from / Valid
// until) — same trigger + BottomSheet + month-grid shape as create-campaign's
// DeadlinePicker/CalendarGrid, kept as its own small component here rather
// than reusing that file's private (unexported) versions verbatim.
export function DatePickerField({
  label, value, onChange, error, minDate, placeholder,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  error?: string;
  /** Dates before this are disabled — used to keep "Valid until" after "Valid from". */
  minDate?: Date;
  placeholder?: string;
}) {
  const C = useAppColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: C.text }]}>{label}</Text>
      <Pressable
        style={[styles.trigger, { borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border, backgroundColor: C.background }]}
        onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, { color: value ? C.text : C.textSecondary }]}>
          {value ? fmtDate(value) : (placeholder ?? '—')}
        </Text>
        <FontAwesome5 name="calendar-alt" size={16} color={C.textSecondary} />
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label} maxHeightPct={0.7}>
        <CalendarGrid
          value={value}
          minDate={minDate}
          onChange={(d) => { onChange(d); setOpen(false); }}
        />
      </BottomSheet>
    </View>
  );
}

function CalendarGrid({ value, minDate, onChange }: { value: Date | null; minDate?: Date; onChange: (d: Date) => void }) {
  const C = useAppColors();
  const today = dayStart(new Date());
  const floor = minDate ? dayStart(minDate) : today;
  const [calYear, setCalYear] = useState(value ? value.getFullYear() : floor.getFullYear());
  const [calMonth, setCalMonth] = useState(value ? value.getMonth() : floor.getMonth());

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function isDisabled(day: number) {
    return dayStart(new Date(calYear, calMonth, day)) < floor;
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={() => {
          if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1);
        }}>
          <Text style={[styles.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[styles.monthTitle, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable style={styles.navBtn} onPress={() => {
          if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); } else setCalMonth((m) => m + 1);
        }}>
          <Text style={[styles.navTxt, { color: C.brinjal1 }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.dayRow}>
        {DAY_SHORT.map((d) => <Text key={d} style={[styles.dayHdr, { color: C.textSecondary }]}>{d}</Text>)}
      </View>
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={styles.cell} />;
          const disabled = isDisabled(day);
          const cellDate = dayStart(new Date(calYear, calMonth, day));
          const sel = value ? sameDay(value, cellDate) : false;
          const isToday = sameDay(cellDate, today);
          return (
            <Pressable key={`d${day}`} style={styles.cell} disabled={disabled} onPress={() => onChange(cellDate)}>
              <View style={[styles.dayCircle, sel && { backgroundColor: C.brinjal1 }, isToday && !sel && { borderWidth: 1.5, borderColor: C.brinjal1 }]}>
                <Text style={[styles.dayNum, { color: disabled ? C.border : sel ? '#fff' : isToday ? C.brinjal1 : C.text }]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: F.semibold },
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: RADIUS.md, height: 50, paddingHorizontal: 14 },
  triggerText: { fontSize: 15, fontFamily: F.regular },
  error: { fontSize: 12, color: ERROR_RED, fontFamily: F.medium },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTxt: { fontSize: 28, lineHeight: 42 },
  monthTitle: { fontSize: 15, fontFamily: F.bold },
  dayRow: { flexDirection: 'row' },
  dayHdr: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: F.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontSize: 13, fontFamily: F.medium },
});
