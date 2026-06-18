import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { CATEGORY_META, DEFAULT_META, cardBg } from '@/features/creator/data/filterOptions';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_RED = '#EF4444';
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const PLATFORMS     = ['Instagram','TikTok','YouTube','Twitter / X','LinkedIn'] as const;
const CATEGORIES    = ['Fashion','Health & Fitness','Food & Drink','Gaming','Education','Travel','Tech','Beauty'];
const FOLLOWER_RANGES = ['< 1K','1K–10K','10K–50K','50K–100K','100K–500K','500K+'];
const CONTENT_TYPES = ['Reel / Short Video','Story','Static Post','Blog Article','Podcast Mention'];
const PAYMENT_TYPES = ['Fixed Fee','Commission','Product Exchange','Hybrid','Negotiable'];
const STATUS_OPTIONS: { label: string; value: NonNullable<Campaign['status']> }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'draft'  },
  { label: 'Closed', value: 'closed' },
];

const FOLLOWER_MIN_MAP: Record<string, number> = {
  '< 1K': 0, '1K–10K': 1000, '10K–50K': 10000,
  '50K–100K': 50000, '100K–500K': 100000, '500K+': 500000,
};

function followerRangeFromRaw(n: number): string {
  if (n >= 500000) return '500K+';
  if (n >= 100000) return '100K–500K';
  if (n >= 50000)  return '50K–100K';
  if (n >= 10000)  return '10K–50K';
  if (n >= 1000)   return '1K–10K';
  return '< 1K';
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function daysAgo(iso: string) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }
function formatDeadline(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── ChipGroup ────────────────────────────────────────────────────────────────

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
              style={[cg.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.background }]}
              onPress={() => onChange(opt)}>
              <Text style={[cg.txt, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={cg.err}>{error}</Text> : null}
    </View>
  );
}
const cg = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  txt:  { fontSize: 13 },
  err:  { fontSize: 12, color: ERROR_RED },
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

  return (
    <View style={{ gap: 10 }}>
      <View style={cal.nav}>
        <Pressable style={cal.navBtn} onPress={() => calMonth === 0 ? (setCalYear(y => y-1), setCalMonth(11)) : setCalMonth(m => m-1)}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[cal.title, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable style={cal.navBtn} onPress={() => calMonth === 11 ? (setCalYear(y => y+1), setCalMonth(0)) : setCalMonth(m => m+1)}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>›</Text>
        </Pressable>
      </View>
      <View style={cal.dayRow}>
        {DAY_SHORT.map((d) => <Text key={d} style={[cal.dayHdr, { color: C.textSecondary }]}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;
          const past = dayStart(new Date(calYear, calMonth, day)) < today;
          const sel  = value ? sameDay(value, dayStart(new Date(calYear, calMonth, day))) : false;
          const isTd = sameDay(dayStart(new Date(calYear, calMonth, day)), today);
          return (
            <Pressable key={`d${day}`} style={cal.cell} disabled={past}
              onPress={() => onChange(dayStart(new Date(calYear, calMonth, day)))}>
              <View style={[cal.circle, sel && { backgroundColor: C.brinjal1 }, isTd && !sel && { borderWidth: 1.5, borderColor: C.brinjal1 }]}>
                <Text style={[cal.dayNum, { color: past ? C.border : sel ? '#fff' : isTd ? C.brinjal1 : C.text }, sel && { fontWeight: '700' }]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const cal = StyleSheet.create({
  nav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTxt: { fontSize: 28, lineHeight: 32 },
  title:  { fontSize: 15, fontWeight: '700' },
  dayRow: { flexDirection: 'row' },
  dayHdr: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid:   { flexDirection: 'row', flexWrap: 'wrap' },
  cell:   { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  circle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontSize: 13, fontWeight: '500' },
});

// ─── PlacesInput ──────────────────────────────────────────────────────────────

type PlacePrediction = { place_id: string; description: string };

function PlacesInput({ value, onChange, colors, error }: {
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
    if (!text.trim() || !PLACES_KEY) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&types=geocode`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.status === 'OK' ? json.predictions : []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <View style={{ zIndex: 99 }}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder="e.g. Kathmandu, New York or Remote"
        placeholderTextColor={C.textSecondary}
        style={[pl.input, { backgroundColor: C.background, borderColor: error ? ERROR_RED : C.border, color: C.text }]}
      />
      {error ? <Text style={pl.errTxt}>{error}</Text> : null}
      {suggestions.length > 0 && (
        <View style={[pl.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
          {suggestions.map((place, i) => (
            <Pressable
              key={place.place_id}
              style={[pl.item, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => { onChange(place.description); setSuggestions([]); }}>
              <Text style={pl.pin}>📍</Text>
              <Text style={[pl.itemTxt, { color: C.text }]} numberOfLines={2}>{place.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
const pl = StyleSheet.create({
  input:    { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, fontSize: 15 },
  errTxt:   { fontSize: 12, color: ERROR_RED, marginTop: 4 },
  dropdown: { borderRadius: 12, borderWidth: 1.5, marginTop: 6, overflow: 'hidden', elevation: 10, zIndex: 100 },
  item:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  pin:      { fontSize: 14 },
  itemTxt:  { fontSize: 13, flex: 1 },
});

// ─── Types ────────────────────────────────────────────────────────────────────

type EditForm = {
  title: string;
  description: string;
  category: string;
  platform: string;
  minFollowers: string;
  contentType: string;
  deliverables: string;
  paymentType: string;
  status: NonNullable<Campaign['status']>;
  budgetMin: string;
  budgetMax: string;
  deadline: Date | null;
  location: string;
  isFeatured: boolean;
};

type EditErrors = Partial<Record<keyof EditForm, string>>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { user } = useAuth();
  const C = useAppColors();
  const isBusiness = user?.role === 'BUSINESS';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // ── Edit modal ──
  const [editOpen, setEditOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', category: '', platform: '',
    minFollowers: '', contentType: '', deliverables: '', paymentType: '',
    status: 'active', budgetMin: '', budgetMax: '', deadline: null,
    location: '', isFeatured: false,
  });
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);

  function openEdit() {
    if (!campaign) return;
    setEditForm({
      title:        campaign.title,
      description:  campaign.description ?? '',
      category:     campaign.category,
      platform:     campaign.platform,
      minFollowers: followerRangeFromRaw(campaign.minFollowersRaw),
      contentType:  campaign.contentType,
      deliverables: campaign.deliverables ?? '',
      paymentType:  campaign.paymentType,
      status:       campaign.status ?? 'active',
      budgetMin:    String(campaign.budgetRaw ?? ''),
      budgetMax:    String(campaign.budgetMax ?? ''),
      deadline:     campaign.deadline ? new Date(campaign.deadline) : null,
      location:     campaign.location ?? '',
      isFeatured:   campaign.isFeatured,
    });
    setEditErrors({});
    setEditOpen(true);
  }

  function updateEdit<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    if (editErrors[key]) setEditErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validateEdit(): EditErrors {
    const errs: EditErrors = {};
    if (!editForm.title.trim())        errs.title        = 'Title is required.';
    if (!editForm.category)            errs.category     = 'Please select a category.';
    if (!editForm.platform)            errs.platform     = 'Please select a platform.';
    if (!editForm.minFollowers)        errs.minFollowers = 'Please select a follower range.';
    if (!editForm.contentType)         errs.contentType  = 'Please select a content type.';
    if (!editForm.deliverables.trim()) errs.deliverables = 'Deliverables are required.';
    if (!editForm.paymentType)         errs.paymentType  = 'Please select a payment type.';
    if (!editForm.budgetMin.trim() || isNaN(Number(editForm.budgetMin))) {
      errs.budgetMin = 'Valid minimum budget is required.';
    }
    if (!editForm.budgetMax.trim() || isNaN(Number(editForm.budgetMax))) {
      errs.budgetMax = 'Valid maximum budget is required.';
    } else if (Number(editForm.budgetMax) < Number(editForm.budgetMin)) {
      errs.budgetMax = 'Must be ≥ minimum budget.';
    }
    if (!editForm.deadline) errs.deadline = 'Deadline is required.';
    return errs;
  }

  async function handleSave() {
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setSaving(true);
    try {
      await campaignService.update(campaign!.id, {
        title:        editForm.title.trim(),
        description:  editForm.description.trim() || undefined,
        category:     editForm.category,
        platform:     editForm.platform,
        minFollowers: FOLLOWER_MIN_MAP[editForm.minFollowers] ?? 0,
        contentType:  editForm.contentType,
        deliverables: editForm.deliverables.trim(),
        paymentType:  editForm.paymentType,
        status:       editForm.status,
        budgetMin:    Number(editForm.budgetMin),
        budgetMax:    Number(editForm.budgetMax),
        deadline:     editForm.deadline!.toISOString(),
        location:     editForm.location.trim() || null,
        isFeatured:   editForm.isFeatured,
      });
      const fresh = await campaignService.getById(campaign!.id);
      setCampaign(fresh);
      setEditOpen(false);
      showToast('Campaign updated successfully!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update campaign.', 'error');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!campaignId) return;
    const appFetch = isBusiness
      ? Promise.resolve([])
      : campaignService.getMyApplications().catch(() => []);
    Promise.all([campaignService.getById(campaignId), appFetch])
      .then(([c, apps]) => {
        setCampaign(c);
        if (!isBusiness) setHasApplied((apps as { campaignId: string }[]).some((a) => a.campaignId === campaignId));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaign'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  // Re-check applied status silently when returning from submit-proposal
  useFocusEffect(
    useCallback(() => {
      if (isBusiness || !campaignId) return;
      campaignService.getMyApplications()
        .then((apps) => setHasApplied(apps.some((a) => a.campaignId === campaignId)))
        .catch(() => {});
    }, [campaignId, isBusiness])
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <LinearGradient colors={['#8B5CF6', '#6366F1', '#4F46E5']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.gradientHeader}>
          <BackButton />
          <Text style={[s.headerTitle, { color: '#fff' }]}>Campaign Details</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={s.centered}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={s.centered}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={[{ fontSize: 17, fontWeight: '600' }, { color: C.textSecondary }]}>{error || 'Campaign not found'}</Text>
          <Pressable style={[s.goBackBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.back()}>
            <Text style={s.goBackBtnTxt}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const heroBg  = cardBg(campaign.category);
  const catMeta = CATEGORY_META[campaign.category] ?? DEFAULT_META;
  const posted  = daysAgo(campaign.createdAt);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <LinearGradient colors={['#8B5CF6', '#6366F1', '#4F46E5']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.gradientHeader}>
        <BackButton />
        <Text style={[s.headerTitle, { color: '#fff' }]}>Campaign Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: heroBg }]}>
          <Text style={s.heroIcon}>{catMeta.emoji}</Text>
          <View style={[s.heroBadge, { backgroundColor: C.badgeFeatured }]}>
            <Text style={s.heroBadgeTxt}>{campaign.category.toUpperCase()}</Text>
          </View>
          {campaign.isNew && (
            <View style={[s.heroNewBadge, { backgroundColor: C.badgeNew }]}>
              <Text style={s.heroBadgeTxt}>NEW</Text>
            </View>
          )}
          <View style={[s.heroPosted, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
            <Text style={s.heroPostedTxt}>
              {posted === 0 ? 'Posted today' : posted === 1 ? 'Posted yesterday' : `Posted ${posted} days ago`}
            </Text>
          </View>
        </View>

        {/* Title block */}
        <View style={[s.titleBlock, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={s.brandRow}>
            <View style={[s.brandAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={s.brandAvatarTxt}>{campaign.brand[0]}</Text>
            </View>
            <Text style={[s.brandName, { color: C.text }]}>{campaign.brand}</Text>
            <View style={[s.verifiedBadge, { backgroundColor: C.active }]}>
              <Text style={s.verifiedIcon}>✓</Text>
            </View>
            <View style={[s.platformTag, { backgroundColor: C.primaryLight, marginLeft: 'auto' }]}>
              <Text style={[s.platformTagTxt, { color: C.brinjal1 }]}>{campaign.platform}</Text>
            </View>
          </View>
          <Text style={[s.campaignTitle, { color: C.text }]}>{campaign.title}</Text>
          <View style={s.budgetRow}>
            <Text style={[s.budget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
            <View style={[s.proposalsBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[s.proposalsTxt, { color: C.brinjal1 }]}>
                {campaign.proposals} {campaign.proposals === 1 ? 'proposal' : 'proposals'}
              </Text>
            </View>
          </View>
        </View>

        {/* Details grid */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>Campaign Details</Text>
          <View style={s.detailsGrid}>
            <DetailRow icon="📅" label="Deadline"      value={formatDeadline(campaign.deadline)} C={C} />
            <DetailRow icon="👥" label="Min Followers" value={campaign.minFollowers} C={C} />
            <DetailRow icon="🎬" label="Content Type"  value={campaign.contentType} C={C} />
            <DetailRow icon="💳" label="Payment"       value={campaign.paymentType} C={C} />
            <DetailRow icon="📍" label="Location"      value={campaign.location ?? 'Remote'} C={C} />
            <DetailRow icon="📊" label="Status"        value={campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : 'Active'} C={C} />
          </View>
        </View>

        {/* Description */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>About this Campaign</Text>
          <Text style={[s.description, { color: C.text }]}>{campaign.description}</Text>
        </View>

        {/* Deliverables */}
        {campaign.deliverables ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>Deliverables</Text>
            {campaign.deliverables.split('+').map((d, i) => (
              <ReqItem key={i} text={d.trim()} C={C} />
            ))}
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[s.ctaBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <View style={s.ctaInfo}>
          <Text style={[s.ctaBudget, { color: C.text }]}>{campaign.budget}</Text>
          <Text style={[s.ctaLabel, { color: C.textSecondary }]}>{isBusiness ? 'Budget range' : 'Estimated budget'}</Text>
        </View>
        {isBusiness ? (
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={openEdit}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={s.applyBtnTxt}>Edit Campaign</Text>
          </Pressable>
        ) : hasApplied ? (
          <View style={s.appliedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={s.appliedBadgeTxt}>Already Applied</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={() => campaign && router.push({ pathname: '/submit-proposal', params: { campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand } })}>
            <Text style={s.applyBtnTxt}>Submit Proposal</Text>
          </Pressable>
        )}
      </View>

      {/* ── Edit Campaign Modal ── */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={em.overlay}>
          <Pressable style={em.scrim} onPress={() => setEditOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={em.sheetWrap}>
            <View style={[em.sheet, { backgroundColor: C.surface }]}>
              <View style={[em.handle, { backgroundColor: C.border }]} />

              {/* Sheet header */}
              <View style={em.sheetHeader}>
                <Text style={[em.sheetTitle, { color: C.text }]}>Edit Campaign</Text>
                <Pressable onPress={() => setEditOpen(false)}>
                  <Ionicons name="close" size={22} color={C.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={em.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* ── Basic Info ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary }]}>Basic Info</Text>

                <Text style={[em.label, { color: C.text }]}>Title <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <TextInput
                  style={[em.input, { backgroundColor: C.background, borderColor: editErrors.title ? ERROR_RED : C.border, color: C.text }]}
                  value={editForm.title}
                  onChangeText={(v) => updateEdit('title', v)}
                  placeholder="Campaign title"
                  placeholderTextColor={C.textSecondary}
                />
                {editErrors.title ? <Text style={em.errTxt}>{editErrors.title}</Text> : null}

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>
                  Description <Text style={[em.optional, { color: C.textSecondary }]}>(optional)</Text>
                </Text>
                <TextInput
                  style={[em.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                  value={editForm.description}
                  onChangeText={(v) => updateEdit('description', v)}
                  placeholder="Describe your campaign…"
                  placeholderTextColor={C.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {/* ── Category ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>Category</Text>
                <ChipGroup options={CATEGORIES} value={editForm.category} onChange={(v) => updateEdit('category', v)} colors={C} error={editErrors.category} />

                {/* ── Platform ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>Platform</Text>
                <ChipGroup options={PLATFORMS} value={editForm.platform} onChange={(v) => updateEdit('platform', v)} colors={C} error={editErrors.platform} />

                {/* ── Requirements ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>Requirements</Text>

                <Text style={[em.label, { color: C.text }]}>Min Followers <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <ChipGroup options={FOLLOWER_RANGES} value={editForm.minFollowers} onChange={(v) => updateEdit('minFollowers', v)} colors={C} error={editErrors.minFollowers} />

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>Content Type <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <ChipGroup options={CONTENT_TYPES} value={editForm.contentType} onChange={(v) => updateEdit('contentType', v)} colors={C} error={editErrors.contentType} />

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>Deliverables <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <TextInput
                  style={[em.textarea, { backgroundColor: C.background, borderColor: editErrors.deliverables ? ERROR_RED : C.border, color: C.text }]}
                  value={editForm.deliverables}
                  onChangeText={(v) => updateEdit('deliverables', v)}
                  placeholder="e.g. 2 Reels + 5 Stories with brand mention"
                  placeholderTextColor={C.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {editErrors.deliverables ? <Text style={em.errTxt}>{editErrors.deliverables}</Text> : null}

                {/* ── Budget & Payment ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>Budget & Payment</Text>

                <Text style={[em.label, { color: C.text }]}>Budget (USD) <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <View style={em.budgetRow}>
                  <View style={{ flex: 1 }}>
                    <View style={[em.currencyWrap, { backgroundColor: C.background, borderColor: editErrors.budgetMin ? ERROR_RED : C.border }]}>
                      <Text style={[em.currencySymbol, { color: C.textSecondary }]}>$</Text>
                      <TextInput
                        style={[em.currencyInput, { color: C.text }]}
                        value={editForm.budgetMin}
                        onChangeText={(v) => updateEdit('budgetMin', v.replace(/[^0-9.]/g, ''))}
                        placeholder="Min"
                        placeholderTextColor={C.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    {editErrors.budgetMin ? <Text style={em.errTxt}>{editErrors.budgetMin}</Text> : null}
                  </View>
                  <Text style={[em.budgetDash, { color: C.textSecondary }]}>–</Text>
                  <View style={{ flex: 1 }}>
                    <View style={[em.currencyWrap, { backgroundColor: C.background, borderColor: editErrors.budgetMax ? ERROR_RED : C.border }]}>
                      <Text style={[em.currencySymbol, { color: C.textSecondary }]}>$</Text>
                      <TextInput
                        style={[em.currencyInput, { color: C.text }]}
                        value={editForm.budgetMax}
                        onChangeText={(v) => updateEdit('budgetMax', v.replace(/[^0-9.]/g, ''))}
                        placeholder="Max"
                        placeholderTextColor={C.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    {editErrors.budgetMax ? <Text style={em.errTxt}>{editErrors.budgetMax}</Text> : null}
                  </View>
                </View>

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>Payment Type <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <ChipGroup options={PAYMENT_TYPES} value={editForm.paymentType} onChange={(v) => updateEdit('paymentType', v)} colors={C} error={editErrors.paymentType} />

                {/* ── Logistics ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>Logistics</Text>

                <Text style={[em.label, { color: C.text }]}>Deadline <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <Pressable
                  style={[em.dateTrigger, { backgroundColor: C.background, borderColor: editErrors.deadline ? ERROR_RED : C.border }]}
                  onPress={() => setCalOpen(true)}>
                  <Text style={[em.dateTxt, { color: editForm.deadline ? C.text : C.textSecondary }]}>
                    {editForm.deadline ? fmtDate(editForm.deadline) : 'Tap to select a date'}
                  </Text>
                  <Text style={{ fontSize: 16 }}>📅</Text>
                </Pressable>
                {editErrors.deadline ? <Text style={em.errTxt}>{editErrors.deadline}</Text> : null}

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>
                  Location <Text style={[em.optional, { color: C.textSecondary }]}>(optional)</Text>
                </Text>
                <PlacesInput
                  value={editForm.location}
                  onChange={(v) => updateEdit('location', v)}
                  colors={C}
                />

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>Status</Text>
                <ChipGroup
                  options={STATUS_OPTIONS.map((o) => o.label)}
                  value={STATUS_OPTIONS.find((o) => o.value === editForm.status)?.label ?? 'Active'}
                  onChange={(label) => {
                    const opt = STATUS_OPTIONS.find((o) => o.label === label);
                    if (opt) updateEdit('status', opt.value);
                  }}
                  colors={C}
                />

                {/* ── Featured ── */}
                <Pressable
                  style={[em.featuredToggle, { backgroundColor: editForm.isFeatured ? '#FFF8E8' : C.background, borderColor: editForm.isFeatured ? '#F59E0B' : C.border, marginTop: 24 }]}
                  onPress={() => updateEdit('isFeatured', !editForm.isFeatured)}>
                  <View style={em.featuredLeft}>
                    <Text style={{ fontSize: 22 }}>⭐</Text>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[em.featuredLabel, { color: C.text }]}>Feature this Campaign</Text>
                      <Text style={[em.featuredSub, { color: C.textSecondary }]}>Appears highlighted on creator home</Text>
                    </View>
                  </View>
                  <View style={[em.toggle, { backgroundColor: editForm.isFeatured ? '#F59E0B' : C.border }]}>
                    <View style={[em.toggleThumb, { left: editForm.isFeatured ? 20 : 2 }]} />
                  </View>
                </Pressable>

                <View style={{ height: 32 }} />
              </ScrollView>

              {/* Save button */}
              <Pressable
                style={({ pressed }) => [em.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }, pressed && !saving && { opacity: 0.88 }]}
                onPress={handleSave}
                disabled={saving}>
                <Text style={em.saveBtnTxt}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Calendar modal ── */}
      <Modal visible={calOpen} transparent animationType="slide" onRequestClose={() => setCalOpen(false)}>
        <View style={em.overlay}>
          <Pressable style={em.scrim} onPress={() => setCalOpen(false)} />
          <View style={[em.calSheet, { backgroundColor: C.surface }]}>
            <View style={[em.handle, { backgroundColor: C.border }]} />
            <View style={em.sheetHeader}>
              <Text style={[em.sheetTitle, { color: C.text }]}>Select Deadline</Text>
              <Pressable onPress={() => setCalOpen(false)}>
                <Text style={[em.doneBtn, { color: C.brinjal1 }]}>Done</Text>
              </Pressable>
            </View>
            {editForm.deadline && (
              <View style={[em.selectedBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[em.selectedTxt, { color: C.brinjal1 }]}>Selected: {fmtDate(editForm.deadline)}</Text>
              </View>
            )}
            <CalendarGrid
              value={editForm.deadline}
              onChange={(d) => { updateEdit('deadline', d); setCalOpen(false); }}
              colors={C}
            />
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[s.toast, { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444' }]}
          pointerEvents="none">
          <Text style={s.toastTxt}>{toast.type === 'success' ? '✓  ' : '✕  '}{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, C }: { icon: string; label: string; value: string; C: any }) {
  return (
    <View style={s.detailRow}>
      <View style={[s.detailIcon, { backgroundColor: C.background }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={s.detailContent}>
        <Text style={[s.detailLabel, { color: C.textSecondary }]}>{label}</Text>
        <Text style={[s.detailValue, { color: C.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function ReqItem({ text, C }: { text: string; C: any }) {
  return (
    <View style={s.reqItem}>
      <View style={[s.reqDot, { backgroundColor: C.brinjal1 }]} />
      <Text style={[s.reqText, { color: C.text }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  goBackBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  goBackBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: F.bold },

  gradientHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: F.bold },

  scroll: { paddingBottom: 20 },

  hero:         { height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  heroIcon:     { fontSize: 60, opacity: 0.75 },
  heroBadge:    { position: 'absolute', top: 14, left: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroNewBadge: { position: 'absolute', top: 14, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5, fontFamily: F.extrabold },
  heroPosted:   { position: 'absolute', bottom: 12, right: 14, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroPostedTxt:{ fontSize: 11, color: '#fff', fontWeight: '500', fontFamily: F.medium },

  titleBlock:    { paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderBottomWidth: 1 },
  brandRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandAvatar:   { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  brandAvatarTxt:{ fontSize: 12, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  brandName:     { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  verifiedIcon:  { fontSize: 9, color: '#fff', fontWeight: '700' },
  platformTag:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  platformTagTxt:{ fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
  campaignTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26, fontFamily: F.extrabold },
  budgetRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budget:        { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold },
  proposalsBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  proposalsTxt:  { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  card:        { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel:{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: F.bold },
  detailsGrid: { gap: 10 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailContent:{ flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '500', fontFamily: F.medium },
  detailValue: { fontSize: 14, fontWeight: '600', marginTop: 1, fontFamily: F.semibold },
  description: { fontSize: 15, lineHeight: 22, fontWeight: '500', fontFamily: F.regular },
  reqItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4 },
  reqDot:      { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  reqText:     { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.regular },

  ctaBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, gap: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  ctaInfo:       { flex: 1 },
  ctaBudget:     { fontSize: 18, fontWeight: '800', fontFamily: F.extrabold },
  ctaLabel:      { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  applyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 15, fontFamily: F.extrabold },
  appliedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5, borderColor: '#A7F3D0' },
  appliedBadgeTxt:{ fontSize: 15, fontWeight: '800', color: '#059669', fontFamily: F.extrabold },

  toast:    { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  toastTxt: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, fontFamily: F.bold },
});

const em = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  scrim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, maxHeight: '92%' },
  calSheet:  { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 16 },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontWeight: '800', fontFamily: F.extrabold },
  doneBtn:     { fontSize: 15, fontWeight: '700', fontFamily: F.bold },

  body: { flexGrow: 0 },

  sectionHdr: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, fontFamily: F.bold },
  label:      { fontSize: 13, fontWeight: '600', marginBottom: 8, fontFamily: F.semibold },
  optional:   { fontSize: 12, fontWeight: '400', fontFamily: F.regular },
  input:      { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: F.regular },
  textarea:   { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, fontFamily: F.regular },
  errTxt:     { fontSize: 12, color: ERROR_RED, marginTop: 4, fontFamily: F.regular },

  budgetRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  budgetDash:     { marginHorizontal: 10, marginTop: 14, fontSize: 16 },
  currencyWrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 48, gap: 4 },
  currencySymbol: { fontSize: 16, fontWeight: '600', fontFamily: F.semibold },
  currencyInput:  { flex: 1, fontSize: 15, fontFamily: F.regular },

  dateTrigger: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, gap: 8 },
  dateTxt:     { flex: 1, fontSize: 15, fontFamily: F.regular },

  selectedBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  selectedTxt:   { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  featuredToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14, borderWidth: 1.5 },
  featuredLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  featuredLabel:  { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  featuredSub:    { fontSize: 12, fontFamily: F.regular },
  toggle:         { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb:    { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },

  saveBtn:    { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: F.extrabold },
});
