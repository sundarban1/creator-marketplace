import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SPACING } from '@/utilities/constants';

// "HH:mm" (24h) -> "h:mm AM/PM" for display. Returns '' on anything malformed.
export function formatEventTime(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return '';
  let h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${period}`;
}

// 30-minute slots across the day, value = "HH:mm".
const SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

// Bottom sheet list of 30-minute time slots. Controlled — `visible`/`onClose`
// owned by the caller. onChange gets "HH:mm" or null ("no specific time").
export function EventTimeSheet({
  visible,
  onClose,
  value,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('createEvent.eventTimeLabel')} maxHeightPct={0.75}>
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.row, { borderBottomColor: C.border }]}
          onPress={() => { onChange(null); onClose(); }}>
          <Text style={[styles.rowTxt, { color: C.textSecondary, fontFamily: F.medium }]}>
            {t('createEvent.eventTimeNone')}
          </Text>
          {!value ? <FontAwesome5 name="check" size={14} color={C.brinjal1} /> : null}
        </Pressable>
        {SLOTS.map((slot) => {
          const selected = slot === value;
          return (
            <Pressable
              key={slot}
              style={[styles.row, { borderBottomColor: C.border }, selected && { backgroundColor: C.primaryLight }]}
              onPress={() => { onChange(slot); onClose(); }}>
              <Text style={[styles.rowTxt, { color: selected ? C.brinjal1 : C.text, fontFamily: selected ? F.semibold : F.regular }]}>
                {formatEventTime(slot)}
              </Text>
              {selected ? <FontAwesome5 name="check" size={14} color={C.brinjal1} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

// Self-contained event-time picker: a tappable trigger row + EventTimeSheet.
// `disabled` renders it read-only (used on the edit screen once a creator is
// confirmed and the backend locks the time).
export function EventTimeField({
  value,
  onChange,
  disabled = false,
  lockedNote,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  lockedNote?: string;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const display = useMemo(() => formatEventTime(value), [value]);

  return (
    <>
      <Pressable
        disabled={disabled}
        style={[
          styles.trigger,
          { borderColor: value ? C.brinjal1 : C.border, backgroundColor: C.background },
          disabled && { opacity: 0.55 },
        ]}
        onPress={() => setOpen(true)}>
        <FontAwesome5 name="clock" size={16} color={C.textSecondary} />
        <Text style={[styles.triggerTxt, { color: display ? C.text : C.textSecondary }]}>
          {display || t('createEvent.eventTimeTapToSelect')}
        </Text>
        {value && !disabled ? (
          <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onChange(null); }}>
            <FontAwesome5 name="times-circle" solid size={18} color={C.textSecondary} />
          </Pressable>
        ) : disabled ? (
          <FontAwesome5 name="lock" solid size={13} color={C.textSecondary} />
        ) : (
          <FontAwesome5 name="chevron-down" size={13} color={C.textSecondary} />
        )}
      </Pressable>
      {disabled && lockedNote ? (
        <Text style={[styles.lockedNote, { color: C.textSecondary }]}>{lockedNote}</Text>
      ) : null}

      <EventTimeSheet visible={open} onClose={() => setOpen(false)} value={value} onChange={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  trigger:    { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderWidth: 1, borderRadius: RADIUS.md },
  triggerTxt: { flex: 1, fontSize: 15, fontFamily: F.regular },
  lockedNote: { fontSize: 12, fontFamily: F.regular, marginTop: 6 },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: SPACING.sm, borderBottomWidth: 1 },
  rowTxt:     { fontSize: 15 },
});
