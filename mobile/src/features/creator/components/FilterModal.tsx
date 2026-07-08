import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RangeSlider } from '@/components/RangeSlider';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationEntry = { label: string; lat: number | null; lng: number | null };
export type LocationFilter = LocationEntry[];

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const MAX_LOCS = 3;

type Prediction = {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isBetween(d: Date, from: Date, to: Date) {
  return d.getTime() > from.getTime() && d.getTime() < to.getTime();
}
function fmtDate(d: Date | null) {
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type EventTypeFilter = 'ALL' | 'PAID_CAMPAIGN' | 'OPEN_EVENT';

const EVENT_TYPE_OPTS: { value: EventTypeFilter; label: string }[] = [
  { value: 'ALL',           label: 'All'    },
  { value: 'PAID_CAMPAIGN', label: '$ Paid' },
  { value: 'OPEN_EVENT',    label: 'Free'   },
];

type Props = {
  visible: boolean;
  tempEventType: EventTypeFilter;
  tempPriceMin: number;
  tempPriceMax: number;
  tempLocation: LocationFilter;
  tempDateFrom: Date | null;
  tempDateTo: Date | null;
  setTempEventType: (v: EventTypeFilter) => void;
  setTempPriceMin: (v: number) => void;
  setTempPriceMax: (v: number) => void;
  setTempLocation: (v: LocationFilter) => void;
  setTempDateFrom: (v: Date | null) => void;
  setTempDateTo: (v: Date | null) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

// ─── LocationSearchPicker ─────────────────────────────────────────────────────

export function LocationSearchPicker({
  selected,
  onSelect,
}: {
  selected: LocationFilter;
  onSelect: (v: LocationFilter) => void;
}) {
  const C = useAppColors();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remoteSelected = selected.some((l) => l.label === 'Remote');
  const nonRemote = selected.filter((l) => l.label !== 'Remote');
  const atMax = selected.length >= MAX_LOCS;

  function toggleRemote() {
    if (remoteSelected) {
      onSelect(selected.filter((l) => l.label !== 'Remote'));
    } else if (!atMax) {
      onSelect([...selected, { label: 'Remote', lat: null, lng: null }]);
    }
  }

  function remove(label: string) {
    onSelect(selected.filter((l) => l.label !== label));
  }

  function handleSearchChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(text), 350);
  }

  async function fetchPredictions(text: string) {
    if (!PLACES_KEY) return;
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&types=(cities)&components=country:np`;
      const res = await fetch(url);
      const data = (await res.json()) as { predictions: Prediction[]; status: string };
      setPredictions(data.status === 'OK' ? data.predictions : []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectPrediction(pred: Prediction) {
    const label = pred.structured_formatting.main_text;
    if (selected.some((l) => l.label === label)) return;
    setQuery('');
    setPredictions([]);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=geometry&key=${PLACES_KEY}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        result: { geometry: { location: { lat: number; lng: number } } };
        status: string;
      };
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        onSelect([...selected, { label, lat, lng }]);
      } else {
        onSelect([...selected, { label, lat: null, lng: null }]);
      }
    } catch {
      onSelect([...selected, { label, lat: null, lng: null }]);
    }
  }

  return (
    <View style={ls.container}>
      {/* Remote — separate standalone chip */}
      <Pressable
        style={[ls.remoteChip, { borderColor: remoteSelected ? C.brinjal1 : C.border, backgroundColor: remoteSelected ? C.primaryLight : C.background }, !remoteSelected && atMax && { opacity: 0.35 }]}
        onPress={toggleRemote}
        disabled={!remoteSelected && atMax}>
        <Ionicons name="globe-outline" size={14} color={remoteSelected ? C.brinjal1 : C.textSecondary} />
        <Text style={[ls.remoteText, { color: remoteSelected ? C.brinjal1 : C.text, fontWeight: remoteSelected ? '700' : '500' }]}>
          Remote
        </Text>
        {remoteSelected && <Ionicons name="close" size={14} color={C.brinjal1} />}
      </Pressable>

      {/* Selected place chips */}
      {nonRemote.length > 0 && (
        <View style={ls.selectedChips}>
          {nonRemote.map((loc) => (
            <View key={loc.label} style={[ls.selectedChip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Ionicons name="location" size={12} color={C.brinjal1} />
              <Text style={[ls.selectedChipText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <Pressable onPress={() => remove(loc.label)} hitSlop={8}>
                <Ionicons name="close" size={13} color={C.brinjal1} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Search input — hidden when limit reached */}
      {!atMax && (
        <>
          <View style={[ls.searchRow, { backgroundColor: C.background, borderColor: C.border }]}>
            <Ionicons name="search" size={15} color={C.textSecondary} />
            <TextInput
              style={[ls.searchInput, { color: C.text }]}
              value={query}
              onChangeText={handleSearchChange}
              placeholder="Search city…"
              placeholderTextColor={C.textSecondary}
              returnKeyType="search"
            />
            {searching
              ? <ActivityIndicator size="small" color={C.brinjal1} />
              : query.length > 0
              ? <Pressable onPress={() => { setQuery(''); setPredictions([]); }} hitSlop={8}>
                  <Ionicons name="close" size={15} color={C.textSecondary} />
                </Pressable>
              : null}
          </View>

          {predictions.length > 0 && (
            <View style={[ls.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
              {predictions.slice(0, 5).map((pred, idx) => (
                <Pressable
                  key={pred.place_id}
                  style={[ls.dropRow, { borderBottomColor: idx < Math.min(predictions.length, 5) - 1 ? C.border : 'transparent' }]}
                  onPress={() => handleSelectPrediction(pred)}>
                  <Ionicons name="location" size={16} color={C.textSecondary} />
                  <View style={ls.dropTexts}>
                    <Text style={[ls.dropMain, { color: C.text }]}>{pred.structured_formatting.main_text}</Text>
                    <Text style={[ls.dropSec, { color: C.textSecondary }]} numberOfLines={1}>{pred.structured_formatting.secondary_text}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const ls = StyleSheet.create({
  container:       { gap: 10 },
  remoteChip:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
  remoteText:      { fontSize: 13, fontFamily: F.regular },
  selectedChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  selectedChipText:{ fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  searchRow:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput:     { flex: 1, fontSize: 14, fontFamily: F.regular },
  dropdown:        { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  dropRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  dropTexts:       { flex: 1 },
  dropMain:        { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  dropSec:         { fontSize: 11, marginTop: 1, fontFamily: F.regular },
});

// ─── DateRangePicker ──────────────────────────────────────────────────────────

function DateRangePicker({
  dateFrom, dateTo, onFromChange, onToChange,
}: {
  dateFrom: Date | null; dateTo: Date | null;
  onFromChange: (d: Date | null) => void; onToChange: (d: Date | null) => void;
}) {
  const C = useAppColors();
  const today = dayStart(new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  function togglePicker(field: 'from' | 'to') {
    setActivePicker((prev) => (prev === field ? null : field));
  }

  function handleDayTap(day: number) {
    const tapped = dayStart(new Date(calYear, calMonth, day));
    if (activePicker === 'from') {
      onFromChange(tapped);
      if (dateTo && tapped > dateTo) onToChange(null);
      setActivePicker(null);
    } else if (activePicker === 'to') {
      if (dateFrom && tapped < dateFrom) {
        onFromChange(tapped);
        onToChange(null);
      } else {
        onToChange(tapped);
      }
      setActivePicker(null);
    }
  }

  function dayStatus(day: number): 'from' | 'to' | 'range' | 'today' | 'none' {
    const d = dayStart(new Date(calYear, calMonth, day));
    if (dateFrom && sameDay(d, dateFrom)) return 'from';
    if (dateTo   && sameDay(d, dateTo))   return 'to';
    if (dateFrom && dateTo && isBetween(d, dateFrom, dateTo)) return 'range';
    if (sameDay(d, today)) return 'today';
    return 'none';
  }

  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const PRESETS = [
    { label: 'Today',      days: 0 },
    { label: 'Last week',  days: 7 },
    { label: 'Last month', days: 30 },
  ];

  function applyPreset(days: number) {
    const from = new Date(today);
    if (days > 0) from.setDate(today.getDate() - days);
    onFromChange(dayStart(from));
    onToChange(new Date(today));
    setActivePicker(null);
  }

  function isPresetActive(days: number) {
    if (!dateFrom || !dateTo) return false;
    const expectedFrom = new Date(today);
    if (days > 0) expectedFrom.setDate(today.getDate() - days);
    return sameDay(dayStart(expectedFrom), dateFrom) && sameDay(today, dateTo);
  }

  return (
    <View style={dp.container}>

      {/* Quick presets */}
      <View style={dp.presets}>
        {PRESETS.map((p) => {
          const active = isPresetActive(p.days);
          return (
            <Pressable
              key={p.label}
              style={[dp.preset, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.background }]}
              onPress={() => applyPreset(p.days)}>
              <Text style={[dp.presetTxt, { color: active ? C.brinjal1 : C.textSecondary, fontWeight: active ? '700' : '500' }]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* From / To inputs with calendar icon */}
      <View style={dp.inputsRow}>
        {(['from', 'to'] as const).map((field) => {
          const date   = field === 'from' ? dateFrom : dateTo;
          const active = activePicker === field;
          return (
            <View key={field} style={dp.inputGroup}>
              <Text style={[dp.inputLabel, { color: C.textSecondary }]}>
                {field === 'from' ? 'From' : 'To'}
              </Text>
              <View style={[dp.inputBox, { borderColor: active ? C.brinjal1 : date ? C.brinjal1 + '60' : C.border, backgroundColor: C.background }]}>
                <Text style={[dp.inputValue, { color: date ? C.text : C.textSecondary }]} numberOfLines={1}>
                  {date ? fmtDate(date) : 'DD MMM YYYY'}
                </Text>
                <Pressable onPress={() => togglePicker(field)} hitSlop={8}>
                  <Ionicons name="calendar-outline" size={16} color={active ? C.brinjal1 : C.textSecondary} />
                </Pressable>
              </View>
            </View>
          );
        })}

        {(dateFrom || dateTo) && (
          <Pressable
            style={dp.clearBtn}
            onPress={() => { onFromChange(null); onToChange(null); setActivePicker(null); }}>
            <Ionicons name="close" size={16} color={C.error} />
          </Pressable>
        )}
      </View>

      {/* Calendar — only shown when a picker is active */}
      {activePicker && (
        <View style={[dp.cal, { backgroundColor: C.background, borderColor: C.border }]}>
          <Text style={[dp.calTitle, { color: C.brinjal1 }]}>
            {activePicker === 'from' ? 'Select start date' : 'Select end date'}
          </Text>

          <View style={dp.monthNav}>
            <Pressable style={dp.navBtn} onPress={prevMonth}>
              <Text style={[dp.navBtnTxt, { color: C.brinjal1 }]}>‹</Text>
            </Pressable>
            <Text style={[dp.monthTitle, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
            <Pressable style={dp.navBtn} onPress={nextMonth}>
              <Text style={[dp.navBtnTxt, { color: C.brinjal1 }]}>›</Text>
            </Pressable>
          </View>

          <View style={dp.dayRow}>
            {DAY_SHORT.map((d) => (
              <Text key={d} style={[dp.dayHdr, { color: C.textSecondary }]}>{d}</Text>
            ))}
          </View>

          <View style={dp.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={dp.cell} />;
              const st = dayStatus(day);
              const isEnd = st === 'from' || st === 'to';
              return (
                <Pressable
                  key={`d${day}`}
                  style={[dp.cell, (st === 'range' || isEnd) && { backgroundColor: C.primaryLight }]}
                  onPress={() => handleDayTap(day)}>
                  <View style={[dp.dayCircle, isEnd && { backgroundColor: C.brinjal1 }, st === 'today' && { borderWidth: 1.5, borderColor: C.brinjal1 }]}>
                    <Text style={[dp.dayNum, { color: isEnd ? '#fff' : st === 'today' ? C.brinjal1 : C.text }, (isEnd || st === 'today') && { fontWeight: '700' }]}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

    </View>
  );
}

// ─── FilterModal ──────────────────────────────────────────────────────────────

export function FilterModal({
  visible,
  tempEventType,
  tempPriceMin, tempPriceMax,
  tempLocation,
  tempDateFrom, tempDateTo,
  setTempEventType,
  setTempPriceMin, setTempPriceMax,
  setTempLocation,
  setTempDateFrom, setTempDateTo,
  onApply, onReset, onClose,
}: Props) {
  const C = useAppColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: C.surface }]}>
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>Filters</Text>
          <Pressable onPress={onReset}>
            <Text style={[styles.reset, { color: C.brinjal1 }]}>Reset all</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

          <Text style={[styles.section, { color: C.textSecondary }]}>Price Range</Text>
          <RangeSlider minVal={tempPriceMin} maxVal={tempPriceMax} onMinChange={setTempPriceMin} onMaxChange={setTempPriceMax} currency="Rs" max={100000} step={1000} />

          <Text style={[styles.section, { color: C.textSecondary }]}>Event Type</Text>
          <View style={styles.eventTypeRow}>
            {EVENT_TYPE_OPTS.map(({ value, label }) => {
              const sel = tempEventType === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.eventChip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}
                  onPress={() => setTempEventType(value)}>
                  <Text style={[styles.eventChipTxt, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.section, { color: C.textSecondary }]}>Deadline Range</Text>
          <DateRangePicker dateFrom={tempDateFrom} dateTo={tempDateTo} onFromChange={setTempDateFrom} onToChange={setTempDateTo} />

          <View style={styles.sectionRow}>
            <Text style={[styles.section, { color: C.textSecondary, marginBottom: 0 }]}>Location</Text>
            <Text style={[styles.sectionHint, { color: C.textSecondary }]}>{tempLocation.length}/{MAX_LOCS} allowed</Text>
          </View>
          <LocationSearchPicker selected={tempLocation} onSelect={setTempLocation} />

        </ScrollView>

        <View style={[styles.footer, { borderTopColor: C.border }]}>
          <Pressable
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={onApply}>
            <Text style={styles.applyTxt}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const dp = StyleSheet.create({
  container:   { gap: 12 },
  // Quick presets
  presets:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset:      { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  presetTxt:   { fontSize: 12, fontFamily: F.regular },
  // From / To input row
  inputsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputGroup:  { flex: 1, gap: 4 },
  inputLabel:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 2, fontFamily: F.bold },
  inputBox:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, gap: 6 },
  inputValue:  { flex: 1, fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  clearBtn:    { width: 32, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  // Inline calendar
  cal:         { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8, marginTop: 2 },
  calTitle:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center', fontFamily: F.bold },
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navBtnTxt:   { fontSize: 24, lineHeight: 28 },
  monthTitle:  { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  dayRow:      { flexDirection: 'row' },
  dayHdr:      { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle:   { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayNum:      { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
});

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:    { fontSize: 17, fontWeight: '800', fontFamily: F.extrabold },
  reset:    { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  body:     { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 24 },
  eventTypeRow:  { flexDirection: 'row', gap: 10 },
  eventChip:     { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, alignItems: 'center' },
  eventChipTxt:  { fontSize: 13, fontFamily: F.medium },
  section:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: -8, fontFamily: F.bold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 },
  sectionHint:{ fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  footer:   { padding: 20, borderTopWidth: 1 },
  applyBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyTxt: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});
