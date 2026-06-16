import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'LinkedIn'] as const;
const CATEGORIES = ['Fashion', 'Health & Fitness', 'Food & Drink', 'Gaming', 'Education', 'Travel', 'Tech', 'Beauty'];
const FOLLOWER_RANGES = ['< 1K', '1K–10K', '10K–50K', '50K–100K', '100K–500K', '500K+'];

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const CONTENT_TYPES = ['Reel / Short Video', 'Story', 'Static Post', 'Blog Article', 'Podcast Mention'];
const PAYMENT_TYPES = ['Fixed Fee', 'Commission', 'Product Exchange', 'Hybrid', 'Negotiable'];

const FOLLOWER_MIN_MAP: Record<string, number> = {
  '< 1K': 0, '1K–10K': 1000, '10K–50K': 10000, '50K–100K': 50000,
  '100K–500K': 100000, '500K+': 500000,
};

const TOTAL_STEPS = 4;
const ERROR_RED = '#EF4444';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  title: string;
  description: string;
  category: string;
  platform: string;
  location: string;
  creatorsNeeded: number;
  minFollowers: string;
  contentType: string;
  deliverables: string;
  deadline: Date | null;
  budgetMin: string;
  budgetMax: string;
  paymentType: string;
  isFeatured: boolean;
};

type PlacePrediction = { place_id: string; description: string };

type FormErrors = Partial<Record<keyof FormData, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Chip Group ───────────────────────────────────────────────────────────────

function ChipGroup({
  options, value, onChange, colors, error,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = value === opt;
          return (
            <Pressable
              key={opt}
              style={[cg.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.surface }]}
              onPress={() => onChange(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

const cg = StyleSheet.create({
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13 },
  error:    { fontSize: 12, color: ERROR_RED },
});

// ─── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({ value, onChange, colors }: {
  value: Date | null;
  onChange: (d: Date) => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const today = dayStart(new Date());
  const [calYear, setCalYear] = useState(value ? value.getFullYear() : today.getFullYear());
  const [calMonth, setCalMonth] = useState(value ? value.getMonth() : today.getMonth());

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function isPast(day: number) {
    return dayStart(new Date(calYear, calMonth, day)) < today;
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Month nav */}
      <View style={cal.monthNav}>
        <Pressable style={cal.navBtn} onPress={prevMonth}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[cal.monthTitle, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable style={cal.navBtn} onPress={nextMonth}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>›</Text>
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={cal.dayRow}>
        {DAY_SHORT.map((d) => (
          <Text key={d} style={[cal.dayHdr, { color: C.textSecondary }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;
          const past = isPast(day);
          const sel = value ? sameDay(value, dayStart(new Date(calYear, calMonth, day))) : false;
          const isToday = sameDay(dayStart(new Date(calYear, calMonth, day)), today);
          return (
            <Pressable
              key={`d${day}`}
              style={cal.cell}
              disabled={past}
              onPress={() => onChange(dayStart(new Date(calYear, calMonth, day)))}>
              <View style={[
                cal.dayCircle,
                sel && { backgroundColor: C.brinjal1 },
                isToday && !sel && { borderWidth: 1.5, borderColor: C.brinjal1 },
              ]}>
                <Text style={[
                  cal.dayNum,
                  { color: past ? C.border : sel ? '#fff' : isToday ? C.brinjal1 : C.text },
                  sel && { fontWeight: '700' },
                ]}>
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  monthNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTxt:    { fontSize: 28, lineHeight: 32 },
  monthTitle:{ fontSize: 15, fontWeight: '700' },
  dayRow:    { flexDirection: 'row' },
  dayHdr:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayNum:    { fontSize: 13, fontWeight: '500' },
});

// ─── Deadline Picker ──────────────────────────────────────────────────────────

function DeadlinePicker({ value, onChange, error, colors }: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  error?: string;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger — looks like a text input */}
      <Pressable
        style={[
          ddp.trigger,
          { backgroundColor: C.background, borderColor: error ? ERROR_RED : C.border },
        ]}
        onPress={() => setOpen(true)}>
        <Text style={[ddp.triggerText, { color: value ? C.text : C.textSecondary }]}>
          {value ? fmtDate(value) : 'Tap to select a date'}
        </Text>
        {value ? (
          <Pressable
            hitSlop={10}
            onPress={(e) => { e.stopPropagation(); onChange(null); }}>
            <Text style={[ddp.clearIcon, { color: C.textSecondary }]}>✕</Text>
          </Pressable>
        ) : (
          <Text style={ddp.calIcon}>📅</Text>
        )}
      </Pressable>
      {error && <Text style={ddp.error}>{error}</Text>}

      {/* Bottom-sheet calendar modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}>
        <View style={ddp.modalWrap}>
          {/* Scrim — tap to dismiss */}
          <Pressable style={ddp.scrim} onPress={() => setOpen(false)} />

          {/* Sheet */}
          <View style={[ddp.sheet, { backgroundColor: C.surface }]}>
            <View style={[ddp.sheetHandle, { backgroundColor: C.border }]} />
            <View style={ddp.sheetHeader}>
              <Text style={[ddp.sheetTitle, { color: C.text }]}>Application Deadline</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={[ddp.doneBtn, { color: C.brinjal1 }]}>Done</Text>
              </Pressable>
            </View>
            {value && (
              <View style={[ddp.selectedBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[ddp.selectedText, { color: C.brinjal1 }]}>Selected: {fmtDate(value)}</Text>
              </View>
            )}
            <CalendarGrid
              value={value}
              onChange={(d) => { onChange(d); setOpen(false); }}
              colors={C}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const ddp = StyleSheet.create({
  trigger:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, gap: 8 },
  triggerText:  { flex: 1, fontSize: 15 },
  clearIcon:    { fontSize: 14, fontWeight: '600' },
  calIcon:      { fontSize: 16 },
  error:        { fontSize: 12, color: ERROR_RED },

  modalWrap:    { flex: 1, justifyContent: 'flex-end' },
  scrim:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 16 },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle:   { fontSize: 16, fontWeight: '800' },
  doneBtn:      { fontSize: 15, fontWeight: '700' },
  selectedBadge:{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  selectedText: { fontSize: 13, fontWeight: '700' },
});

// ─── Google Places Input ──────────────────────────────────────────────────────

function PlacesInput({
  value, onChange, colors, error,
}: {
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || !GOOGLE_PLACES_KEY) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_KEY}&language=en&types=geocode`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.status === 'OK' ? json.predictions : []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  function selectPlace(place: PlacePrediction) {
    onChange(place.description);
    setSuggestions([]);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <View style={pl.wrap}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder="e.g. Kathmandu, New York or Remote"
        placeholderTextColor={C.textSecondary}
        style={[pl.input, { backgroundColor: C.background, borderColor: error ? ERROR_RED : C.border, color: C.text }]}
      />
      {error && <Text style={[pl.errorTxt]}>{error}</Text>}
      {suggestions.length > 0 && (
        <View style={[pl.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
          {suggestions.map((place, i) => (
            <Pressable
              key={place.place_id}
              style={[pl.item, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => selectPlace(place)}>
              <Text style={pl.pin}>📍</Text>
              <Text style={[pl.itemText, { color: C.text }]} numberOfLines={2}>{place.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const pl = StyleSheet.create({
  wrap:     { zIndex: 99 },
  input:    { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, fontSize: 15 },
  errorTxt: { fontSize: 12, color: ERROR_RED, marginTop: 4 },
  dropdown: { borderRadius: 12, borderWidth: 1.5, marginTop: 6, overflow: 'hidden', elevation: 10, zIndex: 100 },
  item:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  pin:      { fontSize: 14 },
  itemText: { fontSize: 13, flex: 1 },
});

// ─── Field Label ──────────────────────────────────────────────────────────────

function FieldLabel({ label, hint, color, hintColor }: {
  label: string; hint?: string; color: string; hintColor: string;
}) {
  return (
    <View style={fl.row}>
      <Text style={[fl.label, { color }]}>{label}</Text>
      {hint && <Text style={[fl.hint, { color: hintColor }]}>{hint}</Text>}
    </View>
  );
}
const fl = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600' },
  hint:  { fontSize: 11, fontWeight: '500' },
});

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 1, max = 50, colors }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  return (
    <View style={[st.wrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable
        style={[st.btn, { backgroundColor: value <= min ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}>
        <Text style={[st.btnTxt, { color: value <= min ? C.border : C.brinjal1 }]}>−</Text>
      </Pressable>
      <View style={st.center}>
        <Text style={[st.value, { color: C.brinjal1 }]}>{value}</Text>
        <Text style={[st.unit, { color: C.textSecondary }]}>creator{value !== 1 ? 's' : ''}</Text>
      </View>
      <Pressable
        style={[st.btn, { backgroundColor: value >= max ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}>
        <Text style={[st.btnTxt, { color: value >= max ? C.border : C.brinjal1 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  btn:    { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { fontSize: 24, fontWeight: '300', lineHeight: 28 },
  center: { flex: 1, alignItems: 'center' },
  value:  { fontSize: 24, fontWeight: '800' },
  unit:   { fontSize: 11, fontWeight: '500', marginTop: 1 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCampaignScreen() {
  const C = useAppColors();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const scrollRef = useRef<ScrollView>(null);

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  // Clear stale toast on unmount
  useEffect(() => () => { toastOpacity.stopAnimation(); }, []);

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    platform: '',
    location: '',
    creatorsNeeded: 1,
    minFollowers: '',
    contentType: '',
    deliverables: '',
    deadline: null,
    budgetMin: '',
    budgetMax: '',
    paymentType: '',
    isFeatured: false,
  });

  const STEP_LABELS = ['Campaign Details', 'Requirements', 'Budget & Payment', 'Review & Publish'];

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function getStepErrors(): FormErrors {
    const errs: FormErrors = {};
    if (step === 1) {
      if (!form.title.trim()) errs.title = 'Campaign title is required.';
      if (form.description.trim().length > 0 && form.description.trim().length < 10) {
        errs.description = 'Description must be at least 10 characters.';
      }
      if (!form.category) errs.category = 'Please select a category.';
      if (!form.platform) errs.platform = 'Please select a platform.';
    }
    if (step === 2) {
      if (!form.minFollowers) errs.minFollowers = 'Please select a minimum follower count.';
      if (!form.contentType) errs.contentType = 'Please select a content type.';
      if (!form.deliverables.trim()) errs.deliverables = 'Please describe the deliverables.';
      if (!form.deadline) errs.deadline = 'Please select an application deadline.';
    }
    if (step === 3) {
      if (!form.budgetMin.trim()) errs.budgetMin = 'Minimum budget is required.';
      if (!form.budgetMax.trim()) {
        errs.budgetMax = 'Maximum budget is required.';
      } else if (form.budgetMin.trim() && parseFloat(form.budgetMax) < parseFloat(form.budgetMin)) {
        errs.budgetMax = 'Must be ≥ minimum budget.';
      }
      if (!form.paymentType) errs.paymentType = 'Please select a payment type.';
    }
    return errs;
  }

  function handleNext() {
    const errs = getStepErrors();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleBack() {
    if (step > 1) {
      setErrors({});
      setStep((s) => s - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      router.canGoBack() ? router.back() : router.replace('/(business)/');
    }
  }

  async function handlePublish() {
    setLoading(true);
    try {
      await campaignService.create({
        title:          form.title.trim(),
        description:    form.description.trim(),
        category:       form.category,
        platform:       form.platform,
        location:       form.location.trim() || undefined,
        minFollowers:   FOLLOWER_MIN_MAP[form.minFollowers] ?? 0,
        contentType:    form.contentType,
        deliverables:   form.deliverables.trim(),
        deadline:       form.deadline!.toISOString(),
        budgetMin:      parseFloat(form.budgetMin) || 0,
        budgetMax:      parseFloat(form.budgetMax) || 0,
        paymentType:    form.paymentType,
        creatorsNeeded: form.creatorsNeeded,
        isFeatured:     form.isFeatured,
      });
      showToast('Campaign published successfully!');
      setTimeout(() => router.replace('/(business)/'), 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create campaign.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const reviewItems: { label: string; value: string; emoji: string }[] = [
    { emoji: '📣', label: 'Title',            value: form.title },
    { emoji: '🏷️', label: 'Category',         value: form.category },
    { emoji: '📱', label: 'Platform',         value: form.platform },
    { emoji: '📍', label: 'Location',         value: form.location || 'Remote' },
    { emoji: '👥', label: 'Min. Followers',   value: form.minFollowers },
    { emoji: '🎬', label: 'Content Type',     value: form.contentType },
    { emoji: '🧑‍🎨', label: 'Creators Needed', value: `${form.creatorsNeeded} creator${form.creatorsNeeded !== 1 ? 's' : ''}` },
    { emoji: '📅', label: 'Deadline',         value: form.deadline ? fmtDate(form.deadline) : '—' },
    { emoji: '💰', label: 'Budget Range',     value: form.budgetMin && form.budgetMax ? `$${form.budgetMin} – $${form.budgetMax}` : '—' },
    { emoji: '💳', label: 'Payment Type',     value: form.paymentType },
    { emoji: '⭐', label: 'Featured',         value: form.isFeatured ? 'Yes' : 'No' },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={handleBack} style={[s.backBtn, { backgroundColor: C.primaryLight }]}>
          <Ionicons name={step > 1 ? 'chevron-back' : 'close'} size={22} color={C.brinjal1} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.text }]}>Create Campaign</Text>
          <Text style={[s.headerSub, { color: C.textSecondary }]}>{STEP_LABELS[step - 1]}</Text>
        </View>
        <View style={[s.stepPill, { backgroundColor: C.primaryLight }]}>
          <Text style={[s.stepPillText, { color: C.brinjal1 }]}>{step}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[s.progressTrack, { backgroundColor: C.border }]}>
        <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any, backgroundColor: C.brinjal1 }]} />
      </View>

      {/* Step dots */}
      <View style={s.stepDots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[s.dot, i + 1 <= step ? { backgroundColor: C.brinjal1 } : { backgroundColor: C.border }]} />
        ))}
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <View style={s.stepContent}>
              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>📋 Basic Info</Text>

                <View style={s.field}>
                  <FieldLabel label="Campaign Title" hint="Required" color={C.text} hintColor={C.brinjal1} />
                  <TextInput
                    style={[s.input, { backgroundColor: C.background, borderColor: errors.title ? ERROR_RED : C.border, color: C.text }]}
                    value={form.title}
                    onChangeText={(v) => update('title', v)}
                    placeholder="e.g. Summer Fashion Collection 2026"
                    placeholderTextColor={C.textSecondary}
                  />
                  {errors.title && <Text style={s.errorText}>{errors.title}</Text>}
                </View>

                <View style={s.field}>
                  <FieldLabel label="Description" hint="Optional" color={C.text} hintColor={C.textSecondary} />
                  <TextInput
                    style={[s.textarea, { backgroundColor: C.background, borderColor: errors.description ? ERROR_RED : C.border, color: C.text }]}
                    value={form.description}
                    onChangeText={(v) => update('description', v)}
                    placeholder="Describe your brand story and what kind of content you're looking for…"
                    placeholderTextColor={C.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                  {errors.description && <Text style={s.errorText}>{errors.description}</Text>}
                </View>
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>🏷️ Category</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>What niche does this campaign belong to?</Text>
                <ChipGroup
                  options={CATEGORIES}
                  value={form.category}
                  onChange={(v) => update('category', v)}
                  colors={C}
                  error={errors.category}
                />
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>📱 Platform</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>Which social platform will creators post on?</Text>
                <ChipGroup
                  options={PLATFORMS}
                  value={form.platform}
                  onChange={(v) => update('platform', v)}
                  colors={C}
                  error={errors.platform}
                />
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface, zIndex: 10 }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>📍 Location</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>Where should the creator be based, or type "Remote".</Text>
                <PlacesInput
                  value={form.location}
                  onChange={(v) => update('location', v)}
                  colors={C}
                />
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>🧑‍🎨 Creators Required</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>How many content creators do you need for this campaign?</Text>
                <Stepper value={form.creatorsNeeded} onChange={(v) => update('creatorsNeeded', v)} colors={C} />
              </View>
            </View>
          )}

          {/* ── Step 2: Requirements ── */}
          {step === 2 && (
            <View style={s.stepContent}>
              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>👥 Creator Requirements</Text>
                <View style={s.field}>
                  <FieldLabel label="Minimum Followers" hint="Required" color={C.text} hintColor={C.brinjal1} />
                  <ChipGroup
                    options={FOLLOWER_RANGES}
                    value={form.minFollowers}
                    onChange={(v) => update('minFollowers', v)}
                    colors={C}
                    error={errors.minFollowers}
                  />
                </View>
                <View style={s.field}>
                  <FieldLabel label="Content Type" hint="Required" color={C.text} hintColor={C.brinjal1} />
                  <ChipGroup
                    options={CONTENT_TYPES}
                    value={form.contentType}
                    onChange={(v) => update('contentType', v)}
                    colors={C}
                    error={errors.contentType}
                  />
                </View>
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>📦 Deliverables</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>Describe exactly what content the creator must deliver.</Text>
                <TextInput
                  style={[s.textarea, { backgroundColor: C.background, borderColor: errors.deliverables ? ERROR_RED : C.border, color: C.text }]}
                  value={form.deliverables}
                  onChangeText={(v) => update('deliverables', v)}
                  placeholder="e.g. 2 Instagram Reels (30–60 sec) + 5 Stories with brand mention and link in bio"
                  placeholderTextColor={C.textSecondary}
                  multiline
                  numberOfLines={3}
                />
                {errors.deliverables && <Text style={s.errorText}>{errors.deliverables}</Text>}
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>📅 Application Deadline</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>Last date creators can apply to this campaign.</Text>
                <DeadlinePicker
                  value={form.deadline}
                  onChange={(d) => update('deadline', d)}
                  error={errors.deadline}
                  colors={C}
                />
              </View>
            </View>
          )}

          {/* ── Step 3: Budget & Payment ── */}
          {step === 3 && (
            <View style={s.stepContent}>
              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>💰 Campaign Budget</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>Budget range per creator (USD).</Text>

                <View style={s.budgetRow}>
                  <View style={s.budgetField}>
                    <FieldLabel label="Minimum ($)" hint="Required" color={C.text} hintColor={C.brinjal1} />
                    <View style={[s.currencyInput, { backgroundColor: C.background, borderColor: errors.budgetMin ? ERROR_RED : C.border }]}>
                      <Text style={[s.currencySymbol, { color: C.textSecondary }]}>$</Text>
                      <TextInput
                        style={[s.currencyText, { color: C.text }]}
                        value={form.budgetMin}
                        onChangeText={(v) => update('budgetMin', v.replace(/[^0-9.]/g, ''))}
                        placeholder="100"
                        placeholderTextColor={C.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    {errors.budgetMin && <Text style={s.errorText}>{errors.budgetMin}</Text>}
                  </View>

                  <View style={[s.budgetDivider, { backgroundColor: C.border }]} />

                  <View style={s.budgetField}>
                    <FieldLabel label="Maximum ($)" hint="Required" color={C.text} hintColor={C.brinjal1} />
                    <View style={[s.currencyInput, { backgroundColor: C.background, borderColor: errors.budgetMax ? ERROR_RED : C.border }]}>
                      <Text style={[s.currencySymbol, { color: C.textSecondary }]}>$</Text>
                      <TextInput
                        style={[s.currencyText, { color: C.text }]}
                        value={form.budgetMax}
                        onChangeText={(v) => update('budgetMax', v.replace(/[^0-9.]/g, ''))}
                        placeholder="500"
                        placeholderTextColor={C.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    {errors.budgetMax && <Text style={s.errorText}>{errors.budgetMax}</Text>}
                  </View>
                </View>

                {form.budgetMin && form.budgetMax && !errors.budgetMin && !errors.budgetMax && (
                  <View style={[s.budgetPreview, { backgroundColor: C.primaryLight }]}>
                    <Text style={[s.budgetPreviewText, { color: C.brinjal1 }]}>
                      ${form.budgetMin} – ${form.budgetMax} per creator
                    </Text>
                    {form.creatorsNeeded > 1 && (
                      <Text style={[s.budgetPreviewSub, { color: C.brinjal1 }]}>
                        Total est. ${(parseFloat(form.budgetMin) * form.creatorsNeeded).toFixed(0)} – ${(parseFloat(form.budgetMax) * form.creatorsNeeded).toFixed(0)} for {form.creatorsNeeded} creators
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>💳 Payment Type</Text>
                <Text style={[s.cardSub, { color: C.textSecondary }]}>How will you compensate creators?</Text>
                <ChipGroup
                  options={PAYMENT_TYPES}
                  value={form.paymentType}
                  onChange={(v) => update('paymentType', v)}
                  colors={C}
                  error={errors.paymentType}
                />
              </View>

              <Pressable
                style={[s.featuredToggle, { backgroundColor: form.isFeatured ? '#FFF8E8' : C.surface, borderColor: form.isFeatured ? '#F59E0B' : C.border }]}
                onPress={() => update('isFeatured', !form.isFeatured)}>
                <View style={s.featuredLeft}>
                  <Text style={s.featuredEmoji}>⭐</Text>
                  <View style={s.featuredInfo}>
                    <Text style={[s.featuredLabel, { color: C.text }]}>Feature this Campaign</Text>
                    <Text style={[s.featuredSub, { color: C.textSecondary }]}>Appears in the highlighted row on creator home</Text>
                  </View>
                </View>
                <View style={[s.toggle, { backgroundColor: form.isFeatured ? '#F59E0B' : C.border }]}>
                  <View style={[s.toggleThumb, { left: form.isFeatured ? 20 : 2 }]} />
                </View>
              </Pressable>
            </View>
          )}

          {/* ── Step 4: Review ── */}
          {step === 4 && (
            <View style={s.stepContent}>
              <View style={[s.reviewHeader, { backgroundColor: C.primaryLight }]}>
                <Text style={s.reviewHeaderEmoji}>🚀</Text>
                <View style={s.reviewHeaderText}>
                  <Text style={[s.reviewHeaderTitle, { color: C.brinjal1 }]}>Almost there!</Text>
                  <Text style={[s.reviewHeaderSub, { color: C.brinjal1 }]}>Review your campaign details before publishing.</Text>
                </View>
              </View>

              <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                {reviewItems.map(({ emoji, label, value }, i) => (
                  <View key={label} style={[s.reviewRow, i < reviewItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                    <View style={s.reviewLabelWrap}>
                      <Text style={s.reviewEmoji}>{emoji}</Text>
                      <Text style={[s.reviewLabel, { color: C.textSecondary }]}>{label}</Text>
                    </View>
                    <Text style={[s.reviewValue, { color: C.text }]} numberOfLines={2}>{value || '—'}</Text>
                  </View>
                ))}
              </View>

              {form.deliverables ? (
                <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                  <Text style={[s.cardTitle, { color: C.text }]}>📦 Deliverables</Text>
                  <Text style={[s.reviewBlock, { color: C.text }]}>{form.deliverables}</Text>
                </View>
              ) : null}

              {form.description ? (
                <View style={[s.stepCard, { backgroundColor: C.surface }]}>
                  <Text style={[s.cardTitle, { color: C.text }]}>📝 Description</Text>
                  <Text style={[s.reviewBlock, { color: C.text }]}>{form.description}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Actions */}
          <View style={s.actions}>
            {step < TOTAL_STEPS ? (
              <Pressable
                style={({ pressed }) => [s.primaryBtn, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
                onPress={handleNext}>
                <Text style={s.primaryBtnText}>Continue →</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [s.primaryBtn, { backgroundColor: loading ? C.border : C.brinjal1 }, pressed && !loading && { opacity: 0.88 }]}
                onPress={handlePublish}
                disabled={loading}>
                <Text style={s.primaryBtnText}>{loading ? 'Publishing…' : '🚀 Publish Campaign'}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            s.toast,
            { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444' },
          ]}
          pointerEvents="none">
          <Text style={s.toastText}>{toast.type === 'success' ? '✓  ' : '✕  '}{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  flex:      { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '800' },
  headerSub:    { fontSize: 11, marginTop: 1 },
  stepPill:     { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  stepPillText: { fontSize: 12, fontWeight: '700' },

  progressTrack: { height: 3 },
  progressFill:  { height: 3 },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot:      { width: 7, height: 7, borderRadius: 3.5 },

  scroll:      { padding: 20, paddingBottom: 48 },
  stepContent: { gap: 16 },

  stepCard:  { borderRadius: 16, padding: 18, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub:   { fontSize: 12, lineHeight: 18, marginTop: -6 },

  field:     { gap: 8 },
  input:     { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, fontSize: 15 },
  textarea:  { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 90, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: ERROR_RED },

  budgetRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  budgetField:   { flex: 1, gap: 8 },
  budgetDivider: { width: 1, height: 48, marginHorizontal: 12, marginTop: 26 },
  currencyInput: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 48, gap: 4 },
  currencySymbol:{ fontSize: 16, fontWeight: '600' },
  currencyText:  { flex: 1, fontSize: 15 },
  budgetPreview: { borderRadius: 10, padding: 12, gap: 4 },
  budgetPreviewText: { fontSize: 13, fontWeight: '700' },
  budgetPreviewSub:  { fontSize: 11, fontWeight: '500' },

  featuredToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, borderWidth: 1.5 },
  featuredLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  featuredEmoji:  { fontSize: 24 },
  featuredInfo:   { flex: 1, gap: 3 },
  featuredLabel:  { fontSize: 14, fontWeight: '700' },
  featuredSub:    { fontSize: 12, lineHeight: 17 },
  toggle:         { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb:    { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },

  reviewHeader:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16 },
  reviewHeaderEmoji: { fontSize: 32 },
  reviewHeaderText:  { flex: 1, gap: 3 },
  reviewHeaderTitle: { fontSize: 16, fontWeight: '800' },
  reviewHeaderSub:   { fontSize: 12, lineHeight: 18 },

  reviewRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  reviewLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewEmoji:     { fontSize: 15, width: 22 },
  reviewLabel:     { fontSize: 13 },
  reviewValue:     { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  reviewBlock:     { fontSize: 13, lineHeight: 20 },

  actions:        { marginTop: 24 },
  primaryBtn:     { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', shadowColor: '#6C3DE0', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
});
