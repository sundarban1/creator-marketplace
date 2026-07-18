import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FilterSheet, FilterSectionHeader, ActiveFilterChips, type ActiveFilterChip } from '@/components/FilterSheet';
import { FilterChip, FilterChipGroup } from '@/components/FilterChip';
import { BudgetRangePicker, matchBudgetPreset, type BudgetPreset } from '@/components/BudgetRangePicker';
import { LocationSearchPicker, type LocationEntry, type LocationFilter } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';
import { useEffect, useState } from 'react';

export { LocationSearchPicker, type LocationEntry, type LocationFilter };

const MAX_LOCS = 3;
const BUDGET_MAX = 100000;

// ─── Constants ────────────────────────────────────────────────────────────────

function getMonths(t: TFn) {
  return Array.from({ length: 12 }, (_, i) => t(`filterModal.month${i}`));
}
function getMonthsShort(t: TFn) {
  return Array.from({ length: 12 }, (_, i) => t(`filterModal.monthShort${i}`));
}
function getDaysShort(t: TFn) {
  return Array.from({ length: 7 }, (_, i) => t(`filterModal.day${i}`));
}

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
function fmtDate(d: Date | null, monthsShort: string[]) {
  if (!d) return '—';
  return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Quick-pick presets ───────────────────────────────────────────────────────
// Budget and Deadline both follow the same "fast path first" concept: a row of
// one-tap presets covering the common cases, with a trailing "Custom" chip that
// reveals the precise slider/calendar only when someone actually needs it —
// instead of always showing a full slider + inline calendar on open.

function budgetPresets(t: TFn): BudgetPreset[] {
  return [
    { key: 'any',      min: 0,     max: BUDGET_MAX, label: t('filterModal.presetAnyBudget') },
    { key: 'under10k', min: 0,     max: 10000,      label: t('filterModal.presetUnder10k')  },
    { key: '10to30k',  min: 10000, max: 30000,      label: t('filterModal.preset10to30k')   },
    { key: '30kplus',  min: 30000, max: BUDGET_MAX, label: t('filterModal.preset30kPlus')   },
  ];
}

type DeadlinePreset = { key: string; days: number | null; labelKey: string };
const DEADLINE_PRESETS: DeadlinePreset[] = [
  { key: 'any',     days: null, labelKey: 'filterModal.presetAnyTime'            },
  { key: 'week',    days: 7,    labelKey: 'filterModal.presetEndingThisWeek'     },
  { key: 'month',   days: 30,   labelKey: 'filterModal.presetEndingThisMonth'    },
  { key: 'quarter', days: 90,   labelKey: 'filterModal.presetEndingIn3Months'   },
];

function matchDeadlinePreset(today: Date, from: Date | null, to: Date | null) {
  if (!from && !to) return DEADLINE_PRESETS[0];
  if (!from || !to || !sameDay(from, today)) return null;
  return DEADLINE_PRESETS.find((p) => {
    if (p.days == null) return false;
    const expectedTo = new Date(today);
    expectedTo.setDate(today.getDate() + p.days);
    return sameDay(to, expectedTo);
  }) ?? null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type EventTypeFilter = 'ALL' | 'PAID_CAMPAIGN' | 'OPEN_EVENT';

const EVENT_TYPE_OPTS: { value: EventTypeFilter; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',           labelKey: 'filterModal.optionAll',  icon: 'apps-outline'   },
  { value: 'PAID_CAMPAIGN', labelKey: 'filterModal.optionPaid', icon: 'cash-outline'   },
  { value: 'OPEN_EVENT',    labelKey: 'filterModal.optionFree', icon: 'gift-outline'   },
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

// ─── DateRangePicker ──────────────────────────────────────────────────────────
// Custom calendar for the Deadline filter — only rendered once someone taps
// "Custom" on the preset row above, since a full month grid doesn't need to be
// the first thing everyone sees.

function DateRangePicker({
  dateFrom, dateTo, onFromChange, onToChange,
}: {
  dateFrom: Date | null; dateTo: Date | null;
  onFromChange: (d: Date | null) => void; onToChange: (d: Date | null) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const months = getMonths(t);
  const monthsShort = getMonthsShort(t);
  const daysShort = getDaysShort(t);
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

  return (
    <View style={dp.container}>
      {/* From / To inputs with calendar icon */}
      <View style={dp.inputsRow}>
        {(['from', 'to'] as const).map((field) => {
          const date   = field === 'from' ? dateFrom : dateTo;
          const active = activePicker === field;
          return (
            <View key={field} style={dp.inputGroup}>
              <Text style={[dp.inputLabel, { color: C.textSecondary }]}>
                {field === 'from' ? t('filterModal.fromLabel') : t('filterModal.toLabel')}
              </Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[dp.inputBox, { borderColor: active ? C.brinjal1 : date ? C.brinjal1 + '60' : C.border, backgroundColor: C.background }]}
                onPress={() => togglePicker(field)}>
                <Text style={[dp.inputValue, { color: date ? C.text : C.textSecondary }]} numberOfLines={1}>
                  {date ? fmtDate(date, monthsShort) : t('filterModal.datePlaceholder')}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={active ? C.brinjal1 : C.textSecondary} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Calendar — only shown when a picker is active */}
      {activePicker && (
        <View style={[dp.cal, { backgroundColor: C.background, borderColor: C.border }]}>
          <Text style={[dp.calTitle, { color: C.brinjal1 }]}>
            {activePicker === 'from' ? t('filterModal.selectStartDate') : t('filterModal.selectEndDate')}
          </Text>

          <View style={dp.monthNav}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={dp.navBtn} onPress={prevMonth}>
              <Text style={[dp.navBtnTxt, { color: C.brinjal1 }]}>‹</Text>
            </Pressable>
            <Text style={[dp.monthTitle, { color: C.text }]}>{months[calMonth]} {calYear}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={dp.navBtn} onPress={nextMonth}>
              <Text style={[dp.navBtnTxt, { color: C.brinjal1 }]}>›</Text>
            </Pressable>
          </View>

          <View style={dp.dayRow}>
            {daysShort.map((d, i) => (
              <Text key={i} style={[dp.dayHdr, { color: C.textSecondary }]}>{d}</Text>
            ))}
          </View>

          <View style={dp.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={dp.cell} />;
              const st = dayStatus(day);
              const isEnd = st === 'from' || st === 'to';
              return (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
  const { t } = useLanguage();
  const today = dayStart(new Date());
  const monthsShort = getMonthsShort(t);
  const BUDGET_PRESETS = budgetPresets(t);

  const [deadlineCustomOpen, setDeadlineCustomOpen] = useState(false);

  // Re-derive from scratch every time the sheet opens — the parent already
  // re-syncs temp values from the committed filters on open, so a stale
  // "custom panel is open" flag from the last visit shouldn't carry over.
  useEffect(() => {
    if (visible) setDeadlineCustomOpen(false);
  }, [visible]);

  function handleReset() {
    setDeadlineCustomOpen(false);
    onReset();
  }

  const matchedBudget   = matchBudgetPreset(BUDGET_PRESETS, tempPriceMin, tempPriceMax);
  const matchedDeadline = matchDeadlinePreset(today, tempDateFrom, tempDateTo);
  const showDeadlineCustom = deadlineCustomOpen || !matchedDeadline;
  const selectedDeadlineKey = matchedDeadline?.key ?? (showDeadlineCustom ? 'custom' : undefined);

  function applyDeadlinePreset(p: DeadlinePreset) {
    if (p.days == null) {
      setTempDateFrom(null);
      setTempDateTo(null);
    } else {
      const to = new Date(today);
      to.setDate(today.getDate() + p.days);
      setTempDateFrom(today);
      setTempDateTo(to);
    }
    setDeadlineCustomOpen(false);
  }

  const activeChips: ActiveFilterChip[] = [];
  if (tempEventType !== 'ALL') {
    activeChips.push({
      key: 'type',
      label: t(EVENT_TYPE_OPTS.find((o) => o.value === tempEventType)!.labelKey),
      onClear: () => setTempEventType('ALL'),
    });
  }
  if (!matchedBudget || matchedBudget.key !== 'any') {
    activeChips.push({
      key: 'budget',
      label: matchedBudget ? matchedBudget.label : `Rs ${Math.round(tempPriceMin / 1000)}k–${Math.round(tempPriceMax / 1000)}k`,
      onClear: () => { setTempPriceMin(0); setTempPriceMax(BUDGET_MAX); },
    });
  }
  if (!matchedDeadline || matchedDeadline.key !== 'any') {
    activeChips.push({
      key: 'deadline',
      label: matchedDeadline ? t(matchedDeadline.labelKey) : `${fmtDate(tempDateFrom, monthsShort)} – ${fmtDate(tempDateTo, monthsShort)}`,
      onClear: () => { setTempDateFrom(null); setTempDateTo(null); setDeadlineCustomOpen(false); },
    });
  }
  for (const loc of tempLocation) {
    activeChips.push({
      key: `loc-${loc.label}`,
      label: loc.label === 'Remote' ? t('filterModal.remote') : loc.label,
      onClear: () => setTempLocation(tempLocation.filter((l) => l.label !== loc.label)),
    });
  }

  const applyLabel = activeChips.length > 0
    ? t('filterModal.applyFiltersCount', { n: activeChips.length })
    : t('filterModal.showAllEvents');

  return (
    <FilterSheet
      visible={visible}
      title={t('filterModal.title')}
      resetLabel={t('filterModal.resetAll')}
      applyLabel={applyLabel}
      onApply={onApply}
      onReset={handleReset}
      onClose={onClose}
    >
      <ActiveFilterChips chips={activeChips} />

      {/* Event Type */}
      <View>
        <FilterSectionHeader icon="pricetag-outline" label={t('filterModal.sectionEventType')} />
        <FilterChipGroup
          options={EVENT_TYPE_OPTS.map(({ value, labelKey, icon }) => ({ value, label: t(labelKey), icon }))}
          selected={[tempEventType]}
          onToggle={(vals) => setTempEventType((vals[0] as typeof tempEventType) ?? 'ALL')}
          equalWidth
        />
      </View>

      {/* Budget — one-tap presets first, precise slider tucked behind "Custom" */}
      <View>
        <FilterSectionHeader icon="cash-outline" label={t('filterModal.sectionBudget')} />
        <BudgetRangePicker
          visible={visible}
          presets={BUDGET_PRESETS}
          min={tempPriceMin}
          max={tempPriceMax}
          onChange={(min, max) => { setTempPriceMin(min); setTempPriceMax(max); }}
          sliderMax={BUDGET_MAX}
          step={1000}
          customLabel={t('filterModal.customLabel')}
        />
      </View>

      {/* Deadline — same "presets first" concept as Budget */}
      <View>
        <FilterSectionHeader icon="calendar-outline" label={t('filterModal.sectionDeadlineRange')} />
        <View style={styles.presetRow}>
          {DEADLINE_PRESETS.map((p) => (
            <FilterChip
              key={p.key}
              label={t(p.labelKey)}
              selected={selectedDeadlineKey === p.key}
              onPress={() => applyDeadlinePreset(p)}
            />
          ))}
          <FilterChip
            label={t('filterModal.customLabel')}
            icon="options-outline"
            selected={selectedDeadlineKey === 'custom'}
            onPress={() => setDeadlineCustomOpen(true)}
          />
        </View>
        {showDeadlineCustom && (
          <View style={styles.customPanel}>
            <DateRangePicker dateFrom={tempDateFrom} dateTo={tempDateTo} onFromChange={setTempDateFrom} onToChange={setTempDateTo} />
          </View>
        )}
      </View>

      {/* Location */}
      <View>
        <FilterSectionHeader
          icon="location-outline"
          label={t('filterModal.sectionLocation')}
          hint={t('filterModal.locationsAllowed', { n: tempLocation.length, max: MAX_LOCS })}
        />
        <LocationSearchPicker selected={tempLocation} onSelect={setTempLocation} />
      </View>
    </FilterSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const dp = StyleSheet.create({
  container:   { gap: 12 },
  // From / To input row
  inputsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputGroup:  { flex: 1, gap: 4 },
  inputLabel:  { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 2, fontFamily: F.bold },
  inputBox:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, gap: 6 },
  inputValue:  { flex: 1, fontSize: 13, fontFamily: F.semibold },
  // Inline calendar
  cal:         { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8, marginTop: 2 },
  calTitle:    { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center', fontFamily: F.bold },
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navBtnTxt:   { fontSize: 24, lineHeight: 28 },
  monthTitle:  { fontSize: 15, fontFamily: F.bold },
  dayRow:      { flexDirection: 'row' },
  dayHdr:      { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: F.semibold },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle:   { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayNum:      { fontSize: 13, fontFamily: F.medium },
});

const styles = StyleSheet.create({
  presetRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customPanel: { marginTop: 12 },
});
