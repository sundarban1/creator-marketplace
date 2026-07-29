import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { EVENT_LOADING_SVG } from '@/lib/eventLoadingSvg';
import { profileService } from '@/services/profile';
import { useCategories } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';
import { FeatureImagePicker } from '@/features/creator/components/FeatureImagePicker';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { pickAndUpload } from '@/utilities/uploadImage';
import { RecommendedCreatorsModal } from '@/features/business/components/RecommendedCreatorsModal';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabSlider } from '@/components/TabSlider';
import { TabColors } from '@/utilities/tabColors';
import {
  GOAL_OPTIONS, CREATOR_TYPES, DELIVERABLE_TYPES, DEFAULT_DELIVERABLES, summarizeDeliverables,
} from '@/features/business/constants/campaignForm';
import {
  SectionCard, ChipGroup, ChipMultiGroup, PlatformChipGroup, BudgetTierPicker, Stepper,
  DeliverablesCounterList, HashtagEditor, FeaturedToggle, sc, cg,
} from '@/features/business/components/CampaignFormControls';

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_PROMPT_EXAMPLES = [
  "Let's collaborate: Looking for 5 food vloggers to review our new cafe in Kathmandu.",
  'Join our creator family: 3 fashion influencers needed for our upcoming Dashain outfit campaign.',
  'Explore with us: Inviting travel vloggers to experience and review our resort in Pokhara.',
  'Team up with us: Seeking makeup artists and creators for a get-ready-with-me collaboration.',
  'आउनुहोस् सहकार्य गरौं: हाम्रो नयाँ शैक्षिक एप रिभ्यु गर्नका लागि ३ जना इन्फ्लुएन्सरहरूको आवश्यकता छ।',
  'हामीसँग जोडिनुहोस्: हाम्रो फिटनेस सेन्टरको अनुभव र प्रवर्द्धन गर्नका लागि हेल्थ एण्ड फिटनेस क्रिएटरहरू खोज्दैछौं।',
  'सहकार्यको लागि आमन्त्रण: हाम्रो अटोमोबाइल वर्कशप र गाडी सर्भिसिङको भिडियो बनाउनका लागि २ जना बाइक/कार राइडर ब्लगरहरू चाहिएको छ।',
];

const ERROR_RED = '#EF4444';
const MIN_BUDGET_PER_CREATOR = 500;

// Used when generateWithAi() throws outright (network down, request timeout, backend
// error unrelated to the AI call itself) — the backend's own dummy-template fallback
// already covers OpenAI-specific failures (bad key, quota, malformed response), so this
// only kicks in when the whole request never came back. Keeps campaign creation working
// end-to-end even with zero connectivity to the AI provider.
const GENERIC_AI_TEMPLATE = {
  title: 'New Promotional Campaign',
  description: "Creators will create engaging content that introduces your brand to their audience, highlighting what makes it worth trying and encouraging followers to check it out.",
  objective: 'Increase brand awareness and drive engagement',
  contentGuidelines: [
    'Introduce the brand naturally within the content',
    'Highlight one clear reason to try it',
    'Keep the tone authentic and conversational',
    'Include a clear call-to-action in the caption',
  ],
  targetAudience: ['Any Creator'],
  suggestedDurationDays: 14,
  creatorsNeeded: 4,
  budgetMin: 6000,
  budgetMax: 15000,
  deliverables: { REEL: 1, STORY: 2 } as Record<string, number>,
  hashtags: ['NewBrand', 'MustTry', 'SupportLocal'],
  sampleCaption: "Just discovered this and had to share \u{1F440} If you're into this kind of thing, you're going to love it.",
  approvalRequirements: 'Brand will review draft content before it’s posted',
};

// Used when generateEventWithAi() throws outright (network down, request timeout,
// backend error unrelated to the AI call itself) — the backend's own dummy-template
// fallback already covers OpenAI-specific failures. Mirrors GENERIC_AI_TEMPLATE above,
// but for OPEN_EVENT drafts (no budget/deliverables, has benefits/capacity instead).
const GENERIC_FREE_EVENT_TEMPLATE = {
  title: 'Exclusive Creator Event',
  description: "We're inviting creators to an exclusive event to experience our brand firsthand and create authentic content. Enjoy complimentary access, connect with our team, and share your genuine experience with your audience.",
  benefits: ['Community & Culture', 'Brand Networking', 'Freebies & PR Packages'],
  capacity: 20,
};

// Kept in sync with BENEFIT_OPTIONS in backend/campaign-ai.schema.ts — the AI-generated
// event draft's `benefits` field only ever returns these exact labels.
const BENEFITS = [
  'Free food & drinks',
  'Free product / service',
  'Event access',
  'Gift hampers',
  'Networking opportunities',
  'Future collaboration',
  'Skill Workshops',
  'Brand Networking',
  'Freebies & PR Packages',
  'Community & Culture',
];

const EVENT_CONTENT_TYPES = [
  'Instagram Reel',
  'Instagram Story',
  'TikTok Video',
  'Photo Post',
  'Event Coverage Video',
  'Tag Business',
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  template: string;
  goals: string[];
  budget: string;
  creatorType: string[];
  platforms: string[];
  location: string;
  creatorsNeeded: number;
  deliverables: Record<string, number>;
  title: string;
  description: string;
  featureImageUrl: string | null;
  deadline: Date | null;
  isFeatured: boolean;
  // Open Event fields
  eventType:    'PAID_CAMPAIGN' | 'OPEN_EVENT';
  eventDate:    Date | null;
  venue:        string;
  capacity:     number;
  benefits:     string[];
  eventContent: string[];
  // AI-generated fields (PAID_CAMPAIGN only)
  objective: string;
  contentGuidelines: string[];
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string;
  approvalRequirements: string;
  aiGenerated: boolean;
  aiPrompt: string;
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  needsInput: string[];
  aiBudgetMin: number;
  aiBudgetMax: number;
};

type ReviewErrors = Partial<Record<'title' | 'deadline' | 'platform' | 'eventDate' | 'budget', string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

// Shared dropdown-trigger/bottom-sheet styles, used by MultiCheckboxDropdown below.
const dp = StyleSheet.create({
  trigger:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  triggerText:  { flex: 1, fontSize: 14, fontFamily: F.medium },
  error:        { fontSize: 12, color: ERROR_RED, fontFamily: F.regular, marginTop: 4 },
  modalWrap:  { flex: 1, justifyContent: 'flex-end' },
  scrim:      { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontFamily: F.bold, marginBottom: 12 },
});

// ─── MultiCheckboxDropdown ────────────────────────────────────────────────────

function MultiCheckboxDropdown({
  values, onChange, options, placeholder, colors, error,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder: string;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }

  const label = values.length === 0 ? placeholder : values.length === 1 ? values[0] : `${values[0]} +${values.length - 1} ${t('createEvent.multiMore')}`;

  return (
    <>
      <Pressable
        style={[dp.trigger, { backgroundColor: C.background, borderColor: error ? ERROR_RED : values.length > 0 ? C.brinjal1 : C.border }]}
        onPress={() => setOpen(true)}>
        <Ionicons name="flag-outline" size={16} color={values.length > 0 ? C.brinjal1 : C.textSecondary} />
        <Text style={[dp.triggerText, { color: values.length > 0 ? C.text : C.textSecondary }]} numberOfLines={1}>{label}</Text>
        {values.length > 0 && (
          <View style={[mc.badge, { backgroundColor: C.brinjal1 }]}>
            <Text style={mc.badgeText}>{values.length}</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dp.modalWrap}>
          <Pressable style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={mc.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={[mc.done, { color: C.brinjal1 }]}>{t('createEvent.multiSelectDone')}</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {options.map((opt) => {
                const checked = values.includes(opt);
                return (
                  <Pressable
                    key={opt}
                    style={[mc.row, { backgroundColor: checked ? C.primaryLight : 'transparent' }]}
                    onPress={() => toggle(opt)}>
                    <View style={[mc.checkbox, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.brinjal1 : 'transparent' }]}>
                      {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <Text style={[mc.rowLabel, { color: checked ? C.brinjal1 : C.text, fontFamily: checked ? F.semibold : F.regular }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const mc = StyleSheet.create({
  badge:      { width: 20, height: 20, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  badgeText:  { fontSize: 11, color: '#fff', fontFamily: F.bold },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  done:       { fontSize: 15, fontFamily: F.bold },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12, borderRadius: RADIUS.md, marginBottom: 4 },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  rowLabel:   { flex: 1, fontSize: 14 },
});

// ─── RadioGroup ───────────────────────────────────────────────────────────────

function RadioGroup({
  value, onChange, options, colors, error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  return (
    <View style={{ gap: 6 }}>
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <Pressable
            key={opt}
            style={[rg.row, { backgroundColor: sel ? C.primaryLight : C.background, borderColor: sel ? C.brinjal1 : C.border }]}
            onPress={() => onChange(opt)}>
            <View style={[rg.outer, { borderColor: sel ? C.brinjal1 : C.border }]}>
              {sel && <View style={[rg.inner, { backgroundColor: C.brinjal1 }]} />}
            </View>
            <Text style={[rg.label, { color: sel ? C.brinjal1 : C.text, fontFamily: sel ? F.semibold : F.regular }]}>{opt}</Text>
          </Pressable>
        );
      })}
      {error && <Text style={rg.error}>{error}</Text>}
    </View>
  );
}

const rg = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: RADIUS.md, borderWidth: 1.5 },
  outer: { width: 20, height: 20, borderRadius: RADIUS.full, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  inner: { width: 10, height: 10, borderRadius: RADIUS.full },
  label: { flex: 1, fontSize: 14 },
  error: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },
});

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

function CalendarGrid({ value, onChange, colors }: {
  value: Date | null;
  onChange: (d: Date) => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const today = dayStart(new Date());
  const [calYear, setCalYear] = useState(value ? value.getFullYear() : today.getFullYear());
  const [calMonth, setCalMonth] = useState(value ? value.getMonth() : today.getMonth());

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function isPast(day: number) { return dayStart(new Date(calYear, calMonth, day)) < today; }

  return (
    <View style={{ gap: 10 }}>
      <View style={cal.monthNav}>
        <Pressable style={cal.navBtn} onPress={() => {
          if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
          else setCalMonth((m) => m - 1);
        }}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[cal.monthTitle, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable style={cal.navBtn} onPress={() => {
          if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
          else setCalMonth((m) => m + 1);
        }}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>›</Text>
        </Pressable>
      </View>
      <View style={cal.dayRow}>
        {DAY_SHORT.map((d) => <Text key={d} style={[cal.dayHdr, { color: C.textSecondary }]}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;
          const past = isPast(day);
          const sel = value ? sameDay(value, dayStart(new Date(calYear, calMonth, day))) : false;
          const isToday = sameDay(dayStart(new Date(calYear, calMonth, day)), today);
          return (
            <Pressable key={`d${day}`} style={cal.cell} disabled={past}
              onPress={() => onChange(dayStart(new Date(calYear, calMonth, day)))}>
              <View style={[cal.dayCircle, sel && { backgroundColor: C.brinjal1 }, isToday && !sel && { borderWidth: 1.5, borderColor: C.brinjal1 }]}>
                <Text style={[cal.dayNum, { color: past ? C.border : sel ? '#fff' : isToday ? C.brinjal1 : C.text }, sel && { fontWeight: '700' }]}>
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
  monthTitle:{ fontSize: 15, fontFamily: F.bold },
  dayRow:    { flexDirection: 'row' },
  dayHdr:    { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: F.semibold },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  dayNum:    { fontSize: 13, fontFamily: F.medium },
});

// ─── DeadlinePicker ───────────────────────────────────────────────────────────

function DeadlinePicker({ value, onChange, error, colors, label }: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  error?: string;
  colors: ReturnType<typeof useAppColors>;
  label?: string;
}) {
  const C = colors;
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        style={[dp.trigger, { flexDirection: 'row', alignItems: 'center', borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border, backgroundColor: C.background, height: 50 }]}
        onPress={() => setOpen(true)}>
        <Text style={[{ flex: 1, fontSize: 15, fontFamily: F.regular, color: value ? C.text : C.textSecondary }]}>
          {value ? fmtDate(value) : t('createEvent.deadlineTapToSelect')}
        </Text>
        {value ? (
          <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onChange(null); }}>
            <Ionicons name="close-circle" size={18} color={C.textSecondary} />
          </Pressable>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={C.textSecondary} />
        )}
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dp.modalWrap}>
          <Pressable style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={mc.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{label ?? t('createEvent.deadlineDefaultLabel')}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={[mc.done, { color: C.brinjal1 }]}>{t('createEvent.deadlineDone')}</Text>
              </Pressable>
            </View>
            {value && (
              <View style={[{ borderRadius: RADIUS.sm, padding: 10, marginTop: 12, backgroundColor: C.primaryLight }]}>
                <Text style={[{ fontSize: 13, fontFamily: F.bold, color: C.brinjal1 }]}>{t('createEvent.deadlineSelected', { date: fmtDate(value) })}</Text>
              </View>
            )}
            <View style={{ marginTop: 16 }}>
              <CalendarGrid value={value} onChange={(d) => { onChange(d); setOpen(false); }} colors={C} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── ListingHeroCard (Airbnb-style confirm screen header) ──────────────────────

function ListingHeroCard({
  featureImageUrl, title, category, colors,
}: {
  featureImageUrl: string | null;
  title: string;
  category?: string;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const image = featureImageUrl ?? getTemplateImage(category, category);
  return (
    // Shadow (unclipped) and rounded-corner clip are split across two views —
    // same as the home feed's campaignCardWrap/campaignCard split, since
    // overflow:hidden on the same view as the shadow clips it off on Android.
    <View style={[lh.wrap, { backgroundColor: C.surface }]}>
      <View style={lh.card}>
        {image && <Image source={{ uri: image }} style={lh.image} resizeMode="cover" />}
        <View style={lh.body}>
          {category && (
            <View style={[lh.categoryPill, { backgroundColor: C.primaryLight }]}>
              <Text style={[lh.categoryPillText, { color: C.brinjal1 }]}>{category}</Text>
            </View>
          )}
          <Text style={[lh.title, { color: C.text }]} numberOfLines={2}>{title}</Text>
        </View>
      </View>
    </View>
  );
}

const lh = StyleSheet.create({
  // Matches the home feed's campaign-card treatment — a raised shadow
  // instead of a flat border, so the finished listing looks like it'll
  // sit among the other cards on the home feed.
  wrap:            { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:            { borderRadius: RADIUS.lg, overflow: 'hidden' },
  image:           { width: '100%', height: 160 },
  body:            { padding: 14, gap: 6 },
  categoryPill:    { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  categoryPillText:{ fontSize: 11, fontFamily: F.bold },
  title:           { fontSize: 18, fontFamily: F.bold },
});

// ─── AiGeneratingOverlay (full-screen loader while AI drafts the event) ────────

const AI_OVERLAY_STEP_KEYS = ['aiOverlayStep1', 'aiOverlayStep2', 'aiOverlayStep3', 'aiOverlayStep4'] as const;

// SMIL <animate>/<animateTransform> elements in the SVG only play in a real
// browser engine — react-native-svg doesn't execute them — so the artwork is
// rendered through a WebView instead, which uses the platform's own engine.
const EVENT_LOADING_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;height:100%;width:100%;}svg{width:100%;height:100%;display:block;}</style></head><body>${EVENT_LOADING_SVG}</body></html>`;

function AiGeneratingOverlay({ visible, t }: {
  visible: boolean;
  t: TFn;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const stepFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(stepFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(stepFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepIndex((i) => (i + 1) % AI_OVERLAY_STEP_KEYS.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={ov.backdrop}>
        <View style={ov.artWrap}>
          {visible && (
            <WebView
              style={ov.art}
              containerStyle={{ backgroundColor: 'transparent' }}
              source={{ html: EVENT_LOADING_HTML }}
              originWhitelist={['*']}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              pointerEvents="none"
            />
          )}
        </View>
        <Text style={ov.title}>{t('createEvent.aiOverlayTitle')}</Text>
        <Animated.Text style={[ov.step, { opacity: stepFade }]}>
          {t(`createEvent.${AI_OVERLAY_STEP_KEYS[stepIndex]}`)}
        </Animated.Text>
      </View>
    </Modal>
  );
}

const ov = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  artWrap:  { width: 260, height: 260 },
  art:      { flex: 1, backgroundColor: 'transparent' },
  title:    { fontSize: 17, fontFamily: F.bold, textAlign: 'center', color: '#fff', marginTop: 8 },
  step:     { fontSize: 13, fontFamily: F.regular, textAlign: 'center', color: 'rgba(255,255,255,0.75)', minHeight: 18, marginTop: 6 },
});

// ─── PreviewRow (read-only recap line, confirm screen) ─────────────────────────

function PreviewRow({
  icon, label, value, colors, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useAppColors>;
  last?: boolean;
}) {
  const C = colors;
  return (
    <View style={[s.summaryRow, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 140 }}>
        <Ionicons name={icon} size={15} color={C.textSecondary} />
        <Text style={[s.summaryLabel, { width: undefined, color: C.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCampaignScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const notRequiredLabel = t('createEvent.notRequired');
  const [phase, setPhase] = useState<'setup' | 'review' | 'confirm'>('setup');
  const [loading, setLoading] = useState(false);
  const [publishWarnVisible, setPublishWarnVisible] = useState(false);
  const [publishedCampaign, setPublishedCampaign] = useState<{ id: string; category: string; lat: number | null; lng: number | null; budgetMin?: number; budgetMax?: number } | null>(null);

  function handleRecommendedDone() {
    setPublishedCampaign(null);
    router.replace('/(business)/');
  }
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const scrollRef = useRef<ScrollView>(null);
  const { categories: liveCategories } = useCategories('BUSINESS');
  const categoryOptions = liveCategories.map((c) => ({ label: c.name, icon: c.icon, color: c.color }));
  const { platforms: livePlatforms } = usePlatforms();
  const platformOptions = livePlatforms.map((p) => p.name);

  useEffect(() => {
    profileService.getBusinessProfile().then((profile) => {
      if (profile.location) {
        setForm((prev) => ({ ...prev, location: profile.location!, venue: profile.location! }));
      }
    }).catch(() => { /* location stays empty */ });
  }, []);

  // Fails open (stays null → toggle isn't locked) if this errors — the
  // backend still enforces the quota server-side on publish either way.
  const [featuredQuota, setFeaturedQuota] = useState<{ freeQuota: number; used: number; remaining: number; price: number; unlimited: boolean } | null>(null);
  useEffect(() => {
    campaignService.getFeaturedQuota().then(setFeaturedQuota).catch(() => {});
  }, []);
  const featuredLocked = featuredQuota !== null && !featuredQuota.unlimited && featuredQuota.remaining <= 0;

  const [form, setForm] = useState<FormData>({
    template: '',
    goals: [],
    budget: '',
    creatorType: [],
    platforms: ['Instagram'],
    location: '',
    creatorsNeeded: 1,
    deliverables: { ...DEFAULT_DELIVERABLES },
    title: '',
    description: '',
    featureImageUrl: null,
    deadline: dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isFeatured: false,
    // Open Event fields
    eventType:    'PAID_CAMPAIGN',
    eventDate:    dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    venue:        '',
    capacity:     20,
    benefits:     [],
    eventContent: [],
    // AI-generated fields
    objective: '',
    contentGuidelines: [],
    targetAudience: [],
    hashtags: [],
    sampleCaption: '',
    approvalRequirements: '',
    aiGenerated: false,
    aiPrompt: '',
    aiSuggestedCategories: [],
    aiSuggestedPlatforms: [],
    needsInput: [],
    aiBudgetMin: 0,
    aiBudgetMax: 0,
  });

  const [aiPromptText, setAiPromptText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlaceholder] = useState(() => AI_PROMPT_EXAMPLES[Math.floor(Math.random() * AI_PROMPT_EXAMPLES.length)]);
  const [aiLocationError, setAiLocationError] = useState<string | undefined>();
  const [descSuggestLoading, setDescSuggestLoading] = useState(false);
  const [featureImageUploading, setFeatureImageUploading] = useState(false);

  async function handlePickFeatureImage() {
    if (featureImageUploading) return;
    setFeatureImageUploading(true);
    try {
      const result = await pickAndUpload('campaign-feature');
      if (result?.url) update('featureImageUrl', result.url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.featureImageUploadFailed'), 'error');
    } finally {
      setFeatureImageUploading(false);
    }
  }

  function handleClearFeatureImage() {
    update('featureImageUrl', null);
  }

  // Coordinates for the campaign's location/venue — resolved from the selected
  // Places suggestion so "Nearby Events" can compute distance from creators.
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);

  // Same tap-to-open search modal used by the business's "search creators"
  // location filter, instead of an inline autocomplete dropdown — one field
  // (eventType is mutually exclusive between paid/open-event forms) drives
  // whichever of `location`/`venue` is currently on screen.
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocationModalOpen(false);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    if (form.eventType === 'OPEN_EVENT') {
      update('venue', address);
    } else {
      update('location', address);
    }
    if (aiLocationError) setAiLocationError(undefined);
  }

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

  useEffect(() => () => { toastOpacity.stopAnimation(); }, []);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetFormForType(newType: 'PAID_CAMPAIGN' | 'OPEN_EVENT') {
    const eventDate   = dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
    setForm((prev) => ({
      template:       '',
      goals:          [],
      budget:         '',
      creatorType:    [],
      platforms:      ['Instagram'],
      location:       prev.location,
      creatorsNeeded: 1,
      deliverables:   { ...DEFAULT_DELIVERABLES },
      title:          '',
      description:    '',
      featureImageUrl: null,
      deadline:       newType === 'OPEN_EVENT' ? regDeadline : dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      isFeatured:     false,
      eventType:      newType,
      eventDate,
      venue:          prev.venue,
      capacity:       20,
      benefits:       [],
      eventContent:   [],
      objective: '',
      contentGuidelines: [],
      targetAudience: [],
      hashtags: [],
      sampleCaption: '',
      approvalRequirements: '',
      aiGenerated: false,
      aiPrompt: '',
      aiSuggestedCategories: [],
      aiSuggestedPlatforms: [],
      needsInput: [],
      aiBudgetMin: 0,
      aiBudgetMax: 0,
    }));
    setReviewErrors({});
    setAiPromptText('');
    setAiLocationError(undefined);
    setPhase('setup');
  }

  async function handleGenerateWithAi() {
    if (!aiPromptText.trim() || aiLoading) return;
    if (!form.location.trim()) {
      setAiLocationError(t('createEvent.errNoLocation'));
      return;
    }
    setAiLocationError(undefined);
    setAiLoading(true);
    try {
      const draft = await campaignService.generateWithAi(aiPromptText.trim());
      setForm((prev) => ({
        ...prev,
        template:    draft.category,
        platforms:   draft.platforms.slice(0, 3),
        title:       draft.title,
        description: draft.description,
        goals:       [draft.goal],
        budget:      '',
        creatorsNeeded: draft.creatorsNeeded,
        deadline:    dayStart(new Date(Date.now() + draft.suggestedDurationDays * 24 * 60 * 60 * 1000)),
        objective:            draft.objective,
        contentGuidelines:    draft.contentGuidelines,
        targetAudience:       draft.targetAudience,
        deliverables:         { ...DEFAULT_DELIVERABLES, ...draft.deliverables },
        hashtags:             draft.hashtags,
        sampleCaption:        draft.sampleCaption,
        approvalRequirements: draft.approvalRequirements,
        featureImageUrl:      prev.featureImageUrl ?? getTemplateImage(draft.category, draft.category) ?? null,
        aiGenerated:           true,
        aiPrompt:              aiPromptText.trim(),
        aiSuggestedCategories: draft.aiSuggestedCategories,
        aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
        needsInput:            draft.needsInput,
        aiBudgetMin: draft.budgetMin,
        aiBudgetMax: draft.budgetMax,
      }));
      setAiPromptText('');
      setPhase('review');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch {
      // The backend already falls back to a dummy draft for OpenAI-specific failures
      // (bad key, quota, malformed response) — reaching this catch means the request
      // itself never came back (network down, timeout, unrelated server error). Load a
      // generic template locally instead of leaving the user stuck with an empty form.
      const fallbackCategory = categoryOptions.find((c) => c.label === 'Lifestyle')?.label ?? categoryOptions[0]?.label ?? '';
      const fallbackPlatform = platformOptions.find((p) => p === 'Instagram') ?? platformOptions[0] ?? '';
      setForm((prev) => ({
        ...prev,
        template:    fallbackCategory,
        platforms:   fallbackPlatform ? [fallbackPlatform] : [],
        title:       GENERIC_AI_TEMPLATE.title,
        description: GENERIC_AI_TEMPLATE.description,
        goals:       [GOAL_OPTIONS[0]!],
        budget:      '',
        creatorsNeeded: GENERIC_AI_TEMPLATE.creatorsNeeded,
        deadline:    dayStart(new Date(Date.now() + GENERIC_AI_TEMPLATE.suggestedDurationDays * 24 * 60 * 60 * 1000)),
        objective:            GENERIC_AI_TEMPLATE.objective,
        contentGuidelines:    GENERIC_AI_TEMPLATE.contentGuidelines,
        targetAudience:       GENERIC_AI_TEMPLATE.targetAudience,
        deliverables:         { ...DEFAULT_DELIVERABLES, ...GENERIC_AI_TEMPLATE.deliverables },
        hashtags:             GENERIC_AI_TEMPLATE.hashtags,
        sampleCaption:        GENERIC_AI_TEMPLATE.sampleCaption,
        approvalRequirements: GENERIC_AI_TEMPLATE.approvalRequirements,
        featureImageUrl:      prev.featureImageUrl ?? getTemplateImage(fallbackCategory, fallbackCategory) ?? null,
        aiGenerated:           true,
        aiPrompt:              aiPromptText.trim(),
        aiSuggestedCategories: [],
        aiSuggestedPlatforms:  [],
        needsInput:            ['budgetMin', 'category'],
        aiBudgetMin: GENERIC_AI_TEMPLATE.budgetMin,
        aiBudgetMax: GENERIC_AI_TEMPLATE.budgetMax,
      }));
      setAiPromptText('');
      setPhase('review');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      showToast(t('createEvent.aiGenerateFallback'), 'error');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSuggestDescription() {
    if (descSuggestLoading) return;
    const deliverables = form.eventType === 'PAID_CAMPAIGN'
      ? summarizeDeliverables(form.deliverables, form.goals, t)
      : form.benefits.join(', ');
    if (!form.title.trim() && !form.template && !deliverables) {
      showToast(t('createEvent.descSuggestNeedsInfo'), 'error');
      return;
    }
    setDescSuggestLoading(true);
    try {
      const description = await campaignService.suggestDescription({
        title:        form.title.trim() || undefined,
        category:     form.template || undefined,
        platform:     form.platforms.length > 0 ? form.platforms.join(', ') : undefined,
        deliverables: deliverables || undefined,
      });
      update('description', description);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.descSuggestFailed'), 'error');
    } finally {
      setDescSuggestLoading(false);
    }
  }

  async function handleGenerateEventWithAi() {
    if (!aiPromptText.trim() || aiLoading) return;
    if (!form.venue.trim()) {
      setAiLocationError(t('createEvent.errNoVenue'));
      return;
    }
    setAiLocationError(undefined);
    setAiLoading(true);
    const defaultEventDate = dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    try {
      const draft = await campaignService.generateEventWithAi(aiPromptText.trim());
      setForm((prev) => {
        const eventDate = prev.eventDate ?? defaultEventDate;
        const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
        return {
          ...prev,
          template:    draft.category,
          platforms:   draft.platforms.slice(0, 1),
          title:       draft.title,
          description: draft.description,
          benefits:    draft.benefits,
          capacity:    draft.capacity,
          eventDate,
          deadline:    regDeadline,
          featureImageUrl:       prev.featureImageUrl ?? getTemplateImage(draft.category, draft.category) ?? null,
          aiGenerated:           true,
          aiPrompt:              aiPromptText.trim(),
          aiSuggestedCategories: draft.aiSuggestedCategories,
          aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
          needsInput:            draft.needsInput,
        };
      });
      setAiPromptText('');
      setPhase('review');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch {
      // Same reasoning as handleGenerateWithAi's catch above: the backend already
      // falls back to a dummy draft for OpenAI-specific failures, so reaching this
      // catch means the request itself never came back.
      const fallbackCategory = categoryOptions.find((c) => c.label === 'Lifestyle')?.label ?? categoryOptions[0]?.label ?? '';
      const fallbackPlatform = platformOptions.find((p) => p === 'Instagram') ?? platformOptions[0] ?? '';
      setForm((prev) => {
        const eventDate = prev.eventDate ?? defaultEventDate;
        const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
        return {
          ...prev,
          template:    fallbackCategory,
          platforms:   fallbackPlatform ? [fallbackPlatform] : [],
          title:       GENERIC_FREE_EVENT_TEMPLATE.title,
          description: GENERIC_FREE_EVENT_TEMPLATE.description,
          benefits:    GENERIC_FREE_EVENT_TEMPLATE.benefits,
          capacity:    GENERIC_FREE_EVENT_TEMPLATE.capacity,
          eventDate,
          deadline:    regDeadline,
          featureImageUrl:       prev.featureImageUrl ?? getTemplateImage(fallbackCategory, fallbackCategory) ?? null,
          aiGenerated:           true,
          aiPrompt:              aiPromptText.trim(),
          aiSuggestedCategories: [],
          aiSuggestedPlatforms:  [],
          needsInput:            [],
        };
      });
      setAiPromptText('');
      setPhase('review');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      showToast(t('createEvent.aiGenerateFallback'), 'error');
    } finally {
      setAiLoading(false);
    }
  }

  function buildPaidCampaignPayload() {
    const budget = { min: form.aiBudgetMin, max: form.aiBudgetMax, payment: 'Fixed Fee' };
    return {
      title:          form.title.trim() || t('createEvent.untitledEvent'),
      description:    form.description.trim(),
      template:       form.template,
      featureImageUrl: form.featureImageUrl ?? undefined,
      category:       form.template,
      goals:          form.goals,
      platforms:      form.platforms,
      location:       form.location.trim() || undefined,
      locationLat:    locationLat ?? undefined,
      locationLng:    locationLng ?? undefined,
      minFollowers:   0,
      contentType:    form.goals[0] ?? '',
      deliverables:   summarizeDeliverables(form.deliverables, form.goals, t),
      deadline:       form.deadline!.toISOString(),
      budgetMin:      budget.min,
      budgetMax:      budget.max,
      paymentType:    budget.payment,
      creatorsNeeded: form.creatorsNeeded,
      isFeatured:     form.isFeatured,
      campaignType:   'PAID_CAMPAIGN' as const,
      objective:            form.objective || undefined,
      contentGuidelines:    form.contentGuidelines,
      targetAudience:       form.targetAudience,
      hashtags:             form.hashtags,
      aiGenerated:           form.aiGenerated,
      aiPrompt:              form.aiGenerated ? form.aiPrompt : undefined,
      aiSuggestedCategories: form.aiGenerated ? form.aiSuggestedCategories : undefined,
      aiSuggestedPlatforms:  form.aiGenerated ? form.aiSuggestedPlatforms : undefined,
    };
  }

  async function handleSaveDraft() {
    if (form.eventType !== 'PAID_CAMPAIGN' || loading) return;
    setLoading(true);
    try {
      await campaignService.create({ ...buildPaidCampaignPayload(), status: 'DRAFT' });
      showToast(t('createEvent.toastDraftSaved'));
      setTimeout(() => router.replace('/(business)/'), 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.toastDraftFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function validatePaidReview(): ReviewErrors {
    const errs: ReviewErrors = {};
    if (!form.title.trim())        errs.title    = t('createEvent.errNoTitle');
    if (form.platforms.length < 1) errs.platform = t('createEvent.errNoPlatform');
    else if (form.platforms.length > 3) errs.platform = t('createEvent.errMaxPlatform');
    if (!form.deadline)     errs.deadline = t('createEvent.errNoDeadline');
    if (form.aiBudgetMin < MIN_BUDGET_PER_CREATOR) errs.budget = t('createEvent.errBudgetMin');
    return errs;
  }

  function handleContinueToConfirm() {
    const errs = validatePaidReview();
    if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
    setReviewErrors({});
    setPhase('confirm');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function handlePublish() {
    if (form.eventType === 'PAID_CAMPAIGN') {
      const errs = validatePaidReview();
      if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
      setReviewErrors({});

      setLoading(true);
      try {
        const campaign = await campaignService.create({ ...buildPaidCampaignPayload(), status: 'ACTIVE' });
        showToast(t('createEvent.toastPublished'));
        setPublishedCampaign({ id: campaign.id, category: form.template, lat: locationLat, lng: locationLng, budgetMin: form.aiBudgetMin, budgetMax: form.aiBudgetMax });
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('createEvent.toastPublishFailed'), 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Open Event publish
      const errs: ReviewErrors = {};
      if (!form.title.trim()) errs.title     = t('createEvent.errNoTitle');
      if (!form.eventDate)    errs.eventDate = t('createEvent.errNoEventDate');
      if (!form.deadline)     errs.deadline  = t('createEvent.errNoRegDeadline');
      else if (form.eventDate && form.deadline >= form.eventDate)
        errs.deadline = t('createEvent.errDeadlineOrder');
      if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
      setReviewErrors({});

      setLoading(true);
      try {
        const campaign = await campaignService.create({
          title:          form.title.trim(),
          description:    form.description.trim(),
          template:       form.template,
          featureImageUrl: form.featureImageUrl ?? undefined,
          category:       form.template,
          goals:          ['Event Promotion', 'Brand Awareness'],
          platforms:      form.platforms,
          location:       form.venue.trim() || undefined,
          locationLat:    locationLat ?? undefined,
          locationLng:    locationLng ?? undefined,
          minFollowers:   0,
          contentType:    form.eventContent.join(', ') || 'Event Coverage',
          deliverables:   form.benefits.join(', '),
          deadline:       form.deadline!.toISOString(),
          budgetMin:      0,
          budgetMax:      0,
          paymentType:    'Non-monetary',
          creatorsNeeded: form.capacity,
          isFeatured:     form.isFeatured,
          campaignType:   'OPEN_EVENT',
          capacity:       form.capacity,
          eventDate:      form.eventDate?.toISOString(),
          venue:          form.venue.trim() || undefined,
          benefits:       form.benefits,
        });
        showToast(t('createEvent.toastPublished'));
        setPublishedCampaign({ id: campaign.id, category: form.template, lat: locationLat, lng: locationLng });
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('createEvent.toastPublishFailed'), 'error');
      } finally {
        setLoading(false);
      }
    }
  }

  const selectedTemplate = categoryOptions.find((t) => t.label === form.template);

  const totalPhases = form.eventType === 'PAID_CAMPAIGN' ? 3 : 2;
  const currentPhaseNum = phase === 'setup' ? 1 : phase === 'review' ? 2 : 3;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable
          onPress={() => {
            if (phase === 'confirm') setPhase('review');
            else if (phase === 'review') setPhase('setup');
            else if (router.canGoBack()) router.back();
            else router.replace('/(business)/');
          }}
          style={[s.backBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
          <Ionicons name={phase === 'setup' ? 'close' : 'chevron-back'} size={22} color={C.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.text }]}>{t('createEvent.headerTitle')}</Text>
          <Text style={[s.headerSub, { color: C.textSecondary }]}>
            {phase === 'setup' ? t('createEvent.headerSubSetup') : phase === 'review' ? t('createEvent.headerSubReview') : t('createEvent.headerSubConfirm')}
          </Text>
        </View>
        <View style={[s.phasePill, { backgroundColor: C.primaryLight }]}>
          <Text style={[s.phasePillText, { color: C.brinjal1 }]}>{currentPhaseNum}/{totalPhases}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[s.progressTrack, { backgroundColor: C.border }]}>
        <View style={[s.progressFill, { width: `${(currentPhaseNum / totalPhases) * 100}%`, backgroundColor: C.brinjal1 }]} />
      </View>

      {/* No `behavior` prop — the ScrollView's `automaticallyAdjustKeyboardInsets` already
          handles iOS precisely on its own; stacking KeyboardAvoidingView's `padding` on top
          of that double-compensates for the same keyboard, pushing content up too far. */}
      <KeyboardAvoidingView style={s.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets>

          {/* ── Phase 1: Setup ── */}
          {phase === 'setup' && (
            <View style={s.content}>

              {/* Event Type Tab Slider — same TabSlider + color system as the
                  business home feed's type filter, for a consistent feel. */}
              <View style={{ gap: 12 }}>
                <Text style={[s.stepSectionHeading, { color: C.text }]}>{t('createEvent.eventTypeHeading')}</Text>

                <TabSlider
                  justify
                  tabs={[
                    { key: 'PAID_CAMPAIGN', label: t('createEvent.tabPaidEvent'), icon: 'cash-outline',     color: TabColors.brand.color },
                    { key: 'OPEN_EVENT',    label: t('createEvent.tabOpenEvent'), icon: 'calendar-outline', color: TabColors.info.color },
                  ]}
                  active={form.eventType}
                  onChange={(key) => { if (form.eventType !== key) resetFormForType(key as FormData['eventType']); }}
                />

                {/* Info banner for the selected type — icon box + left accent,
                    matching the home feed's banner/attentionBanner pattern. */}
                <View
                  style={[
                    s.etInfoPanel,
                    { backgroundColor: C.surface, borderLeftColor: form.eventType === 'PAID_CAMPAIGN' ? TabColors.brand.color : TabColors.info.color },
                  ]}
                >
                  <View
                    style={[
                      s.etInfoIconWrap,
                      {
                        backgroundColor: form.eventType === 'PAID_CAMPAIGN' ? TabColors.brand.bg : TabColors.info.bg,
                        shadowColor: form.eventType === 'PAID_CAMPAIGN' ? TabColors.brand.color : TabColors.info.color,
                      },
                    ]}
                  >
                    <Ionicons
                      name={form.eventType === 'PAID_CAMPAIGN' ? 'cash-outline' : 'calendar-outline'}
                      size={18}
                      color={form.eventType === 'PAID_CAMPAIGN' ? TabColors.brand.color : TabColors.info.color}
                    />
                  </View>
                  <Text style={[s.etInfoSub, { color: C.text }]}>
                    {form.eventType === 'PAID_CAMPAIGN' ? t('createEvent.paidEventSub') : t('createEvent.openEventSub')}
                  </Text>
                </View>
              </View>

              {/* Paid Campaign form */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Describe & generate */}
                  <SectionCard title={t('createEvent.aiPromptLabel')} sub={t('createEvent.aiPromptSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={aiPromptText}
                      onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                      placeholder={aiPlaceholder}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={4}
                      editable={!aiLoading}
                    />
                    <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiExamplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {AI_PROMPT_EXAMPLES.map((ex) => (
                        <Pressable
                          key={ex}
                          style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => setAiPromptText(ex)}
                          disabled={aiLoading}>
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </SectionCard>

                  {/* Location */}
                  <SectionCard title={t('createEvent.secLocationTitle')} sub={t('createEvent.secLocationSub')} colors={C}>
                    <Pressable
                      style={[s.locationBtn, { backgroundColor: C.background, borderColor: aiLocationError ? ERROR_RED : C.border }]}
                      onPress={() => setLocationModalOpen(true)}>
                      <Text style={[s.locationBtnTxt, { color: form.location ? C.text : C.textSecondary }]} numberOfLines={2}>
                        {form.location || t('createEvent.locationPlaceholder')}
                      </Text>
                      <Text style={s.locationArrow}>›</Text>
                    </Pressable>
                    {aiLocationError ? <Text style={s.errorText}>{aiLocationError}</Text> : null}
                  </SectionCard>

                  {/* Create Event */}
                  <Pressable
                    style={[s.generateBtn, { backgroundColor: (!aiPromptText.trim() || aiLoading) ? C.border : C.brinjal1 }]}
                    onPress={handleGenerateWithAi}
                    disabled={!aiPromptText.trim() || aiLoading}>
                    {aiLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.generateBtnText}>{t('createEvent.createEventBtn')}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {/* Open Event form — same describe-and-generate flow as Paid Campaign,
                  minus budget: brand just enters a prompt + location, AI fills in
                  the rest including what the event offers (Creator Benefits). */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Describe & generate */}
                  <SectionCard title={t('createEvent.aiPromptLabel')} sub={t('createEvent.aiPromptSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={aiPromptText}
                      onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                      placeholder={aiPlaceholder}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={4}
                      editable={!aiLoading}
                    />
                    <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiExamplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {AI_PROMPT_EXAMPLES.map((ex) => (
                        <Pressable
                          key={ex}
                          style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => setAiPromptText(ex)}
                          disabled={aiLoading}>
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </SectionCard>

                  {/* Venue / Location */}
                  <SectionCard title={t('createEvent.secVenueTitle')} sub={t('createEvent.secVenueSub')} colors={C}>
                    <Pressable
                      style={[s.locationBtn, { backgroundColor: C.background, borderColor: aiLocationError ? ERROR_RED : C.border }]}
                      onPress={() => setLocationModalOpen(true)}>
                      <Text style={[s.locationBtnTxt, { color: form.venue ? C.text : C.textSecondary }]} numberOfLines={2}>
                        {form.venue || t('createEvent.locationPlaceholder')}
                      </Text>
                      <Text style={s.locationArrow}>›</Text>
                    </Pressable>
                    {aiLocationError ? <Text style={s.errorText}>{aiLocationError}</Text> : null}
                  </SectionCard>

                  {/* Create Event */}
                  <Pressable
                    style={[s.generateBtn, { backgroundColor: (!aiPromptText.trim() || aiLoading) ? C.border : C.brinjal1 }]}
                    onPress={handleGenerateEventWithAi}
                    disabled={!aiPromptText.trim() || aiLoading}>
                    {aiLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.generateBtnText}>{t('createEvent.createEventBtn')}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* ── Phase 2: Review ── */}
          {phase === 'review' && (
            <View style={s.content}>

              {/* Paid Campaign review */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Step 2 review header — icon box + left accent, matching
                      the Open Event banner below and the home feed's banner style. */}
                  <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                    <View style={[s.reviewBannerIconWrap, { backgroundColor: C.primaryLight, shadowColor: C.brinjal1 }]}>
                      <Ionicons name="sparkles-outline" size={20} color={C.brinjal1} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.reviewBannerTitle, { color: C.text }]}>{t('createEvent.paidBannerTitle')}</Text>
                      <Text style={[s.reviewBannerSub, { color: C.textSecondary }]}>{t('createEvent.paidBannerSub')}</Text>
                    </View>
                  </View>

                  {/* Editable title */}
                  <SectionCard title={t('createEvent.secEventTitlePaid')} colors={C}>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: reviewErrors.title ? ERROR_RED : C.border, color: C.text }]}
                      value={form.title}
                      onChangeText={(v) => {
                        update('title', v);
                        if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined }));
                      }}
                      placeholder={t('createEvent.eventTitlePlaceholder')}
                      placeholderTextColor={C.textSecondary}
                    />
                    {reviewErrors.title && <Text style={s.errorText}>{reviewErrors.title}</Text>}
                  </SectionCard>

                  {/* Feature image */}
                  <SectionCard title={t('createEvent.secFeatureImageTitle')} sub={t('createEvent.secFeatureImageSub')} colors={C}>
                    <FeatureImagePicker
                      imageUrl={form.featureImageUrl}
                      category={form.template}
                      uploading={featureImageUploading}
                      onPick={handlePickFeatureImage}
                      onClear={handleClearFeatureImage}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Editable description */}
                  <SectionCard colors={C}>
                    <View style={s.descHeaderRow}>
                      <Text style={[sc.title, s.descHeaderText, { color: C.text }]}>{t('createEvent.secDescPaid')}</Text>
                      <Pressable
                        style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1 }]}
                        onPress={handleSuggestDescription}
                        disabled={descSuggestLoading}>
                        {descSuggestLoading
                          ? <ActivityIndicator size="small" color={C.brinjal1} />
                          : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
                      </Pressable>
                    </View>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder={t('createEvent.descriptionPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Objective */}
                  <SectionCard title={t('createEvent.secObjectiveTitle')} sub={t('createEvent.secObjectiveSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text, minHeight: 70 }]}
                      value={form.objective}
                      onChangeText={(v) => update('objective', v)}
                      multiline
                      placeholderTextColor={C.textSecondary}
                    />
                  </SectionCard>

                  {/* Goal */}
                  <SectionCard title={t('createEvent.secGoalsTitle')} sub={t('createEvent.secGoalsSub')} colors={C}>
                    <ChipGroup
                      options={GOAL_OPTIONS}
                      value={form.goals[0] ?? GOAL_OPTIONS[0]!}
                      onChange={(v) => update('goals', [v])}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Target Audience */}
                  <SectionCard title={t('createEvent.secTargetAudienceTitle')} sub={t('createEvent.secTargetAudienceSub')} colors={C}>
                    <ChipMultiGroup
                      options={CREATOR_TYPES}
                      values={form.targetAudience}
                      onChange={(v) => update('targetAudience', v)}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Platform */}
                  <SectionCard title={t('createEvent.secPlatformTitle')} sub={t('createEvent.secPlatformSub')} colors={C}>
                    <PlatformChipGroup
                      options={platformOptions}
                      values={form.platforms}
                      onChange={(v) => {
                        update('platforms', v);
                        if (reviewErrors.platform) setReviewErrors((e) => ({ ...e, platform: undefined }));
                      }}
                      colors={C}
                      error={reviewErrors.platform}
                      max={3}
                    />
                  </SectionCard>

                  {/* Deliverables */}
                  <SectionCard title={t('createEvent.secDeliverablesTitle')} sub={t('createEvent.secDeliverablesSub')} colors={C}>
                    <DeliverablesCounterList
                      value={form.deliverables}
                      onChange={(v) => update('deliverables', v)}
                      colors={C}
                      t={t}
                    />
                  </SectionCard>

                  {/* Hashtags */}
                  <SectionCard title={t('createEvent.secHashtagsTitle')} colors={C}>
                    <HashtagEditor
                      hashtags={form.hashtags}
                      onChange={(v) => update('hashtags', v)}
                      colors={C}
                      t={t}
                    />
                  </SectionCard>

                  {/* Budget */}
                  <SectionCard title={t('createEvent.secBudgetTitle')} sub={t('createEvent.secBudgetSub')} colors={C}>
                    <BudgetTierPicker
                      budgetMin={form.aiBudgetMin}
                      budgetMax={form.aiBudgetMax}
                      onChange={(min, max) => {
                        update('aiBudgetMin', min);
                        update('aiBudgetMax', max);
                        if (reviewErrors.budget) setReviewErrors((e) => ({ ...e, budget: undefined }));
                      }}
                      colors={C}
                      error={reviewErrors.budget}
                    />
                  </SectionCard>

                  {/* Applications Close */}
                  <SectionCard title={t('createEvent.secDeadlineTitle')} sub={t('createEvent.secDeadlineSub')} colors={C}>
                    <DeadlinePicker
                      value={form.deadline}
                      onChange={(d) => {
                        update('deadline', d);
                        if (reviewErrors.deadline) setReviewErrors((e) => ({ ...e, deadline: undefined }));
                      }}
                      error={reviewErrors.deadline}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Creators Needed */}
                  <SectionCard title={t('createEvent.secCreatorsNeededTitle')} sub={t('createEvent.secCreatorsNeededSub')} colors={C}>
                    <Stepper value={form.creatorsNeeded} onChange={(v) => update('creatorsNeeded', v)} colors={C} />
                  </SectionCard>

                  {/* Featured toggle */}
                  <FeaturedToggle
                    value={form.isFeatured}
                    onChange={(v) => update('isFeatured', v)}
                    quota={featuredQuota}
                    colors={C}
                    t={t}
                  />

                  {/* Save as Draft */}
                  <Pressable
                    style={[s.draftBtn, { borderColor: C.border, opacity: loading ? 0.6 : 1 }]}
                    onPress={handleSaveDraft}
                    disabled={loading}>
                    <Ionicons name="save-outline" size={16} color={C.textSecondary} />
                    <Text style={[s.draftBtnText, { color: C.textSecondary }]}>{t('createEvent.saveDraftBtn')}</Text>
                  </Pressable>

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable
                      style={[s.editBtn, { borderColor: C.brinjal1 }]}
                      onPress={() => setPhase('setup')}>
                      <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editInputsBtn')}</Text>
                    </Pressable>
                    <Pressable
                      style={[s.publishBtn, { backgroundColor: C.brinjal1 }]}
                      onPress={handleContinueToConfirm}>
                      <Text style={s.publishBtnText}>{t('createEvent.continueToReviewBtn')}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </Pressable>
                  </View>
                </>
              )}

              {/* Open Event review */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Review header — icon box + left accent, matching the home feed's banner style. */}
                  <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                    <View style={[s.reviewBannerIconWrap, { backgroundColor: C.primaryLight, shadowColor: C.brinjal1 }]}>
                      <Ionicons name="eye-outline" size={20} color={C.brinjal1} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.reviewBannerTitle, { color: C.text }]}>{t('createEvent.openBannerTitle')}</Text>
                      <Text style={[s.reviewBannerSub, { color: C.textSecondary }]}>{t('createEvent.openBannerSub')}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <SectionCard title={t('createEvent.secEventTitleOpen')} sub={t('createEvent.secEventTitleOpenSub')} colors={C}>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: reviewErrors.title ? ERROR_RED : C.border, color: C.text }]}
                      value={form.title}
                      onChangeText={(v) => { update('title', v); if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined })); }}
                      placeholder={t('createEvent.eventTitlePlaceholder')}
                      placeholderTextColor={C.textSecondary}
                    />
                    {reviewErrors.title && <Text style={s.errorText}>{reviewErrors.title}</Text>}
                  </SectionCard>

                  {/* Feature image */}
                  <SectionCard title={t('createEvent.secFeatureImageTitle')} sub={t('createEvent.secFeatureImageSub')} colors={C}>
                    <FeatureImagePicker
                      imageUrl={form.featureImageUrl}
                      category={form.template}
                      uploading={featureImageUploading}
                      onPick={handlePickFeatureImage}
                      onClear={handleClearFeatureImage}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Description */}
                  <SectionCard colors={C}>
                    <View style={s.descHeaderRow}>
                      <View style={s.descHeaderText}>
                        <Text style={[sc.title, { color: C.text }]}>{t('createEvent.secDescOpen')}</Text>
                        <Text style={[sc.sub, { color: C.textSecondary }]}>{t('createEvent.secDescOpenSub')}</Text>
                      </View>
                      <Pressable
                        style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1 }]}
                        onPress={handleSuggestDescription}
                        disabled={descSuggestLoading}>
                        {descSuggestLoading
                          ? <ActivityIndicator size="small" color={C.brinjal1} />
                          : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
                      </Pressable>
                    </View>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder={t('createEvent.eventDescPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Creator Benefits — auto-selected, editable */}
                  <SectionCard title={t('createEvent.secBenefitsTitle')} sub={t('createEvent.secBenefitsSub')} colors={C}>
                    <View style={cg.wrap}>
                      {BENEFITS.map((benefit) => {
                        const checked = form.benefits.includes(benefit);
                        return (
                          <Pressable
                            key={benefit}
                            style={[cg.chip, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.primaryLight : C.surface }]}
                            onPress={() => {
                              const next = checked
                                ? form.benefits.filter((b) => b !== benefit)
                                : [...form.benefits, benefit];
                              update('benefits', next);
                            }}>
                            <Text style={[cg.chipText, { color: checked ? C.brinjal1 : C.textSecondary, fontWeight: checked ? '700' : '500' }]}>{benefit}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </SectionCard>

                  {/* Capacity */}
                  <SectionCard title={t('createEvent.secCapacityTitle')} sub={t('createEvent.secCapacitySub')} colors={C}>
                    <Stepper value={form.capacity} onChange={(v) => update('capacity', v)} min={1} max={500} colors={C} />
                  </SectionCard>

                  {/* Platform (optional) */}
                  <SectionCard title={t('createEvent.secPlatformOptTitle')} sub={t('createEvent.secPlatformOptSub')} colors={C}>
                    <ChipGroup
                      options={['Instagram', 'TikTok', 'YouTube', 'Facebook', notRequiredLabel]}
                      value={form.platforms[0] ?? notRequiredLabel}
                      onChange={(v) => update('platforms', v === notRequiredLabel ? [] : [v])}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Event Date */}
                  <SectionCard title={t('createEvent.secEventDateTitle')} sub={t('createEvent.secEventDateSub')} colors={C}>
                    <DeadlinePicker
                      value={form.eventDate}
                      onChange={(d) => {
                        const twoDaysBefore = d ? dayStart(new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000)) : null;
                        setForm((prev) => ({ ...prev, eventDate: d, deadline: twoDaysBefore }));
                        if (reviewErrors.eventDate) setReviewErrors((e) => ({ ...e, eventDate: undefined, deadline: undefined }));
                      }}
                      error={reviewErrors.eventDate}
                      colors={C}
                      label={t('createEvent.deadlineLabelEvent')}
                    />
                  </SectionCard>

                  {/* Registration Deadline — auto-set to eventDate - 2 days */}
                  <SectionCard title={t('createEvent.secRegDeadlineTitle')} sub={t('createEvent.secRegDeadlineSub')} colors={C}>
                    <DeadlinePicker
                      value={form.deadline}
                      onChange={(d) => {
                        update('deadline', d);
                        if (reviewErrors.deadline) setReviewErrors((e) => ({ ...e, deadline: undefined }));
                      }}
                      error={reviewErrors.deadline}
                      colors={C}
                      label={t('createEvent.deadlineLabelReg')}
                    />
                  </SectionCard>

                  {/* Event summary */}
                  <SectionCard title={t('createEvent.secEventSummaryTitle')} colors={C}>
                    {[
                      { label: t('createEvent.summaryCategory'), value: form.template || '—' },
                      { label: t('createEvent.summaryVenue'),    value: form.venue || t('createEvent.summaryTBD') },
                      { label: t('createEvent.summaryDate'),     value: form.eventDate ? fmtDate(form.eventDate) : '—' },
                      { label: t('createEvent.summaryCapacity'), value: t('createEvent.summaryNCreators', { n: form.capacity }) },
                    ].map(({ label, value }, i, arr) => (
                      <View key={label} style={[s.summaryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[s.summaryLabel, { color: C.textSecondary }]}>{label}</Text>
                        <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
                      </View>
                    ))}
                  </SectionCard>

                  {/* Featured toggle */}
                  <FeaturedToggle
                    value={form.isFeatured}
                    onChange={(v) => update('isFeatured', v)}
                    quota={featuredQuota}
                    colors={C}
                    t={t}
                  />

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable style={[s.editBtn, { borderColor: C.brinjal1 }]} onPress={() => setPhase('setup')}>
                      <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editEventBtn')}</Text>
                    </Pressable>
                    <Pressable
                      style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                      onPress={() => setPublishWarnVisible(true)}
                      disabled={loading}>
                      <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createEvent.publishOpenBtn')}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Phase 3: Confirm (PAID_CAMPAIGN only, Airbnb-style final review) ── */}
          {phase === 'confirm' && form.eventType === 'PAID_CAMPAIGN' && (
            <View style={s.content}>
              <ListingHeroCard
                featureImageUrl={form.featureImageUrl}
                title={form.title.trim() || t('createEvent.untitledEvent')}
                category={selectedTemplate ? form.template : undefined}
                colors={C}
              />

              {/* Summary card — same bordered/shadowed surface as every
                  SectionCard in the form above, so the final review reads
                  as one continuous system rather than a bare list. */}
              <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
                <Text style={[sc.title, { color: C.text }]}>{t('createEvent.secSummaryTitle')}</Text>
                <PreviewRow icon="location-outline" label={t('createEvent.summaryLocation')} value={form.location || t('createEvent.summaryRemote')} colors={C} />
                <PreviewRow icon="people-outline" label={t('createEvent.confirmSectionWho')} value={form.targetAudience.join(', ') || '—'} colors={C} />
                <PreviewRow icon="share-social-outline" label={t('createEvent.confirmSectionPlatforms')} value={form.platforms.join(', ') || '—'} colors={C} />
                <PreviewRow icon="film-outline" label={t('createEvent.confirmSectionDeliverables')} value={summarizeDeliverables(form.deliverables, form.goals, t)} colors={C} />
                <PreviewRow icon="cash-outline" label={t('createEvent.confirmSectionBudget')} value={`Rs. ${form.aiBudgetMin.toLocaleString()} – ${form.aiBudgetMax.toLocaleString()}`} colors={C} />
                <PreviewRow icon="calendar-outline" label={t('createEvent.confirmSectionCloses')} value={form.deadline ? fmtDate(form.deadline) : '—'} colors={C} />
                <PreviewRow icon="star-outline" label={t('createEvent.confirmSectionFeatured')} value={form.isFeatured ? t('createEvent.yes') : t('createEvent.no')} colors={C} last />
              </View>

              {/* Actions */}
              <View style={s.reviewActions}>
                <Pressable
                  style={[s.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => setPhase('review')}>
                  <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                  <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.backToEditBtn')}</Text>
                </Pressable>
                <Pressable
                  style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                  onPress={handlePublish}
                  disabled={loading}>
                  <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createEvent.publishPaidBtn')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </MaxWidthContainer>

      {/* Pre-publish warning modal */}
      <Modal visible={publishWarnVisible} transparent animationType="fade" onRequestClose={() => setPublishWarnVisible(false)}>
        <Pressable style={s.warnScrim} onPress={() => setPublishWarnVisible(false)}>
          <Pressable style={[s.warnSheet, { backgroundColor: C.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.warnIconWrap}>
              <Ionicons name="warning" size={32} color="#F59E0B" />
            </View>
            <Text style={[s.warnTitle, { color: C.text }]}>{t('createEvent.warnTitle')}</Text>
            <Text style={[s.warnBody, { color: C.textSecondary }]}>
              {t('createEvent.warnBodyPre')}<Text style={{ fontWeight: '700', color: C.text }}>{t('createEvent.warnBodyBold')}</Text>{t('createEvent.warnBodyPost')}
            </Text>
            <View style={s.warnActions}>
              <Pressable style={[s.warnCancelBtn, { borderColor: C.border }]} onPress={() => setPublishWarnVisible(false)}>
                <Text style={[s.warnCancelText, { color: C.textSecondary }]}>{t('createEvent.warnGoBack')}</Text>
              </Pressable>
              <Pressable
                style={[s.warnConfirmBtn, { backgroundColor: C.brinjal1 }]}
                onPress={() => { setPublishWarnVisible(false); handlePublish(); }}>
                <Text style={s.warnConfirmText}>{t('createEvent.warnPublishNow')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LocationSearchModal
        visible={locationModalOpen}
        initialValue={form.eventType === 'OPEN_EVENT' ? form.venue : form.location}
        onSelect={handleLocationSelect}
        onClose={() => setLocationModalOpen(false)}
      />

      <AiGeneratingOverlay visible={aiLoading} t={t} />

      {/* Recommended creators — shown right after publishing */}
      <RecommendedCreatorsModal
        visible={!!publishedCampaign}
        campaignId={publishedCampaign?.id ?? null}
        category={publishedCampaign?.category ?? ''}
        lat={publishedCampaign?.lat}
        lng={publishedCampaign?.lng}
        budgetMin={publishedCampaign?.budgetMin}
        budgetMax={publishedCampaign?.budgetMax}
        onDone={handleRecommendedDone}
      />

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[s.toast, { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444' }]}
          pointerEvents="none">
          <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'close-circle'} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  flex:      { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:      { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontFamily: F.bold },
  headerSub:    { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  phasePill:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  phasePillText:{ fontSize: 12, fontFamily: F.bold },

  progressTrack:{ height: 3 },
  progressFill: { height: 3 },

  scroll:   { padding: 18, paddingBottom: 48 },
  content:  { gap: 14 },

  input:     { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  textarea:  { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 120, textAlignVertical: 'top', fontFamily: F.regular },
  errorText: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },

  // Tap-to-open location field — same pattern as the profile location editor
  // and the "search creators" location filter, both backed by LocationSearchModal.
  locationBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: F.regular },
  locationArrow:  { fontSize: 20, color: '#9CA3AF' },

  descHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  descHeaderText: { flex: 1 },
  suggestBtn:     { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  suggestBtnText: { fontSize: 12, fontFamily: F.bold },

  generateBtn:     { borderRadius: RADIUS.md, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, ...SHADOW.raised },
  generateBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  reviewBanner:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, borderLeftWidth: 4, paddingVertical: 14, paddingHorizontal: 14, ...SHADOW.card },
  reviewBannerIconWrap:{ width: 38, height: 38, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  reviewBannerTitle:   { fontSize: 14, fontFamily: F.bold },
  reviewBannerSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  summaryLabel: { fontSize: 13, fontFamily: F.regular, width: 72 },
  summaryValue: { flex: 1, fontSize: 13, fontFamily: F.semibold, textAlign: 'right' },

  draftBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: RADIUS.md, height: 50, borderWidth: 1.5, marginTop: 8 },
  draftBtnText:  { fontSize: 14, fontFamily: F.semibold },
  reviewActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: RADIUS.md, height: 54, borderWidth: 1.5 },
  editBtnText:   { fontSize: 14, fontFamily: F.bold },
  publishBtn:    { flex: 2, flexDirection: 'row', gap: 6, borderRadius: RADIUS.md, height: 54, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  publishBtnText:{ color: '#fff', fontSize: 15, fontFamily: F.bold },

  warnScrim:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  warnSheet:       { width: '100%', borderRadius: RADIUS.xl, padding: 24, alignItems: 'center', ...SHADOW.floating },
  warnIconWrap:    { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: '#FFF8E8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  warnTitle:       { fontSize: 18, fontFamily: F.bold, marginBottom: 12, textAlign: 'center' },
  warnBody:        { fontSize: 14, fontFamily: F.regular, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  warnActions:     { flexDirection: 'row', gap: 10, width: '100%' },
  warnCancelBtn:   { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
  warnCancelText:  { fontSize: 13, fontFamily: F.semibold },
  warnConfirmBtn:  { flex: 1, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  warnConfirmText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', ...SHADOW.floating },
  toastText: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },

  stepSectionHeading: { fontSize: 15, fontFamily: F.bold },
  stepSectionSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginBottom: 4 },

  // Event type info banner — icon box + left accent, matching the home
  // feed's banner/attentionBanner pattern.
  etInfoPanel:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, borderLeftWidth: 4, padding: 12, ...SHADOW.card },
  etInfoIconWrap:{ width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  etInfoSub:     { flex: 1, fontSize: 12, fontFamily: F.regular, lineHeight: 18 },

  eventHintBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADIUS.md, padding: 14 },
  eventHintText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.regular },

});

const ai = StyleSheet.create({
  charCount:    { fontSize: 11, fontFamily: F.regular, textAlign: 'right', marginTop: 4 },
  exampleLabel: { fontSize: 11, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  exampleChip:  { borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  exampleChipText: { fontSize: 12, fontFamily: F.regular },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
