import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
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
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';
import { PlacesAutocompleteInput } from '@/components/PlacesAutocompleteInput';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_RED = '#EF4444';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CONTENT_TYPES = ['Reel / Short Video','Story','Static Post','Blog Article','Podcast Mention'];
const STATUS_OPTIONS: { labelKey: string; value: NonNullable<Campaign['status']> }[] = [
  { labelKey: 'campaignDetail.statusActive', value: 'active' },
  { labelKey: 'campaignDetail.statusPaused', value: 'draft'  },
  { labelKey: 'campaignDetail.statusClosed', value: 'closed' },
];

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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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

// ─── PlatformChipGroup (multi-select, capped, lockable) ────────────────────────

function PlatformChipGroup({
  options, values, onChange, colors, error, max, disabled,
}: {
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  max: number;
  disabled?: boolean;
}) {
  const C = colors;
  function toggle(opt: string) {
    if (disabled) return;
    if (values.includes(opt)) { onChange(values.filter((v) => v !== opt)); return; }
    if (values.length >= max) return;
    onChange([...values, opt]);
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = values.includes(opt);
          const chipDisabled = disabled || (!sel && values.length >= max);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              disabled={chipDisabled}
              style={[cg.chip, {
                borderColor: sel ? C.brinjal1 : C.border,
                backgroundColor: sel ? C.primaryLight : C.background,
                opacity: chipDisabled && !sel ? 0.4 : 1,
              }]}
              onPress={() => toggle(opt)}>
              <Text style={[cg.txt, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={cg.err}>{error}</Text> : null}
    </View>
  );
}

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
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={cal.navBtn} onPress={() => calMonth === 0 ? (setCalYear(y => y-1), setCalMonth(11)) : setCalMonth(m => m-1)}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[cal.title, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={cal.navBtn} onPress={() => calMonth === 11 ? (setCalYear(y => y+1), setCalMonth(0)) : setCalMonth(m => m+1)}>
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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={`d${day}`} style={cal.cell} disabled={past}
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

// ─── Types ────────────────────────────────────────────────────────────────────

type EditForm = {
  title: string;
  description: string;
  platforms: string[];
  contentType: string;
  deliverables: string;
  status: NonNullable<Campaign['status']>;
  budgetMin: string;
  budgetMax: string;
  deadline: Date | null;
  location: string;
  isFeatured: boolean;
  // OPEN_EVENT fields
  eventDate: Date | null;
  venue: string;
  capacity: string;
  benefits: string[];
};

type EditErrors = Partial<Record<keyof EditForm, string>>;

const EVENT_BENEFITS = [
  'Free food & drinks',
  'Free product / service',
  'Event access',
  'Gift hampers',
  'Networking opportunities',
  'Future collaboration',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { user } = useAuth();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const isBusiness = user?.role === 'BUSINESS';
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hasApplied, setHasApplied]           = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);
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
  const [eventCalOpen, setEventCalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', platforms: [],
    contentType: '', deliverables: '',
    status: 'active', budgetMin: '', budgetMax: '', deadline: null,
    location: '', isFeatured: false,
    eventDate: null, venue: '', capacity: '20', benefits: [],
  });
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);

  // Once a proposal has been submitted, the terms it was submitted against
  // (price, platform, deliverables) are locked — everything else stays editable.
  const hasProposals = (campaign?.proposals ?? 0) > 0;

  function openEdit() {
    if (!campaign) return;
    setEditForm({
      title:        campaign.title,
      description:  campaign.description ?? '',
      platforms:    campaign.platforms ?? [],
      contentType:  campaign.contentType,
      deliverables: campaign.deliverables ?? '',
      status:       campaign.status ?? 'active',
      budgetMin:    String(campaign.budgetRaw ?? ''),
      budgetMax:    String(campaign.budgetMax ?? ''),
      deadline:     campaign.deadline ? new Date(campaign.deadline) : null,
      location:     campaign.location ?? '',
      isFeatured:   campaign.isFeatured,
      eventDate:    campaign.eventDate ? new Date(campaign.eventDate) : null,
      venue:        campaign.venue ?? '',
      capacity:     String(campaign.capacity ?? 20),
      benefits:     campaign.benefits ?? [],
    });
    setEditErrors({});
    setEditOpen(true);
  }

  function updateEdit<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    if (editErrors[key]) setEditErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  const isOpenEvent = campaign?.campaignType === 'OPEN_EVENT';

  function validateEdit(): EditErrors {
    const errs: EditErrors = {};
    if (!editForm.title.trim()) errs.title = t('campaignDetail.errTitleRequired');
    if (!editForm.deadline)     errs.deadline = t('campaignDetail.errDeadlineRequired');

    if (isOpenEvent) {
      if (!editForm.eventDate) errs.eventDate = t('campaignDetail.errEventDateRequired');
      else if (editForm.deadline && editForm.eventDate <= editForm.deadline)
        errs.deadline = t('campaignDetail.errRegBeforeEvent');
      if (!editForm.venue.trim()) errs.venue = t('campaignDetail.errVenueRequired');
    } else {
      if (editForm.platforms.length === 0) errs.platforms  = t('campaignDetail.errPlatformRequired');
      if (!editForm.contentType)         errs.contentType  = t('campaignDetail.errContentTypeRequired');
      if (!editForm.deliverables.trim()) errs.deliverables = t('campaignDetail.errDeliverablesRequired');
      if (!editForm.location.trim())     errs.location     = t('campaignDetail.errLocationRequired');
      if (!editForm.budgetMin.trim() || isNaN(Number(editForm.budgetMin))) {
        errs.budgetMin = t('campaignDetail.errMinBudgetRequired');
      }
      if (!editForm.budgetMax.trim() || isNaN(Number(editForm.budgetMax))) {
        errs.budgetMax = t('campaignDetail.errMaxBudgetRequired');
      } else if (Number(editForm.budgetMax) < Number(editForm.budgetMin)) {
        errs.budgetMax = t('campaignDetail.errBudgetMinMax');
      }
    }
    return errs;
  }

  async function handleSave() {
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setSaving(true);
    try {
      if (isOpenEvent) {
        await campaignService.update(campaign!.id, {
          title:       editForm.title.trim(),
          description: editForm.description.trim() || undefined,
          status:      editForm.status,
          deadline:    editForm.deadline!.toISOString(),
          isFeatured:  editForm.isFeatured,
          venue:       editForm.venue.trim() || null,
          capacity:    Number(editForm.capacity) || 20,
          eventDate:   editForm.eventDate?.toISOString(),
          benefits:    editForm.benefits,
        });
      } else {
        await campaignService.update(campaign!.id, {
          title:        editForm.title.trim(),
          description:  editForm.description.trim() || undefined,
          platforms:    editForm.platforms,
          contentType:  editForm.contentType,
          deliverables: editForm.deliverables.trim(),
          status:       editForm.status,
          budgetMin:    Number(editForm.budgetMin),
          budgetMax:    Number(editForm.budgetMax),
          deadline:     editForm.deadline!.toISOString(),
          location:     editForm.location.trim(),
          isFeatured:   editForm.isFeatured,
        });
      }
      const fresh = await campaignService.getById(campaign!.id);
      setCampaign(fresh);
      setEditOpen(false);
      showToast(t('campaignDetail.toastUpdated'));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('campaignDetail.toastFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!campaignId) return;
    const appFetch = isBusiness
      ? Promise.resolve([])
      : campaignService.getMyApplications().then((r) => r.proposals).catch(() => []);
    Promise.all([campaignService.getById(campaignId), appFetch])
      .then(([c, apps]) => {
        setCampaign(c);
        if (!isBusiness) {
          const myApp = (apps as { campaignId: string; status: string }[]).find((a) => a.campaignId === campaignId);
          setHasApplied(!!myApp);
          setApplicationStatus(myApp ? myApp.status as 'pending' | 'accepted' | 'rejected' : null);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [campaignId, languageVersion]);

  // Re-check applied status silently when returning from submit-proposal
  useFocusEffect(
    useCallback(() => {
      if (isBusiness || !campaignId) return;
      campaignService.getMyApplications()
        .then(({ proposals: apps }) => {
          const myApp = apps.find((a) => a.campaignId === campaignId);
          setHasApplied(!!myApp);
          setApplicationStatus(myApp ? myApp.status as 'pending' | 'accepted' | 'rejected' : null);
        })
        .catch(() => {});
    }, [campaignId, isBusiness])
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.gradientHeader}>
          <BackButton />
          <Text style={[s.headerTitle, { color: '#fff' }]}>{t('campaignDetail.headerTitle')}</Text>
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
          <FontAwesome5 name="search" size={40} color={C.textSecondary} />
          <Text style={[{ fontSize: 17, fontWeight: '600' }, { color: C.textSecondary }]}>{error || t('campaignDetail.notFound')}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.goBackBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.back()}>
            <Text style={s.goBackBtnTxt}>{t('campaignDetail.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const catMeta = getCategoryMeta(allCategories, campaign.categoryKey ?? campaign.category);
  const heroBg  = catMeta.bg;
  const posted  = daysAgo(campaign.createdAt);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.gradientHeader}>
        <BackButton />
        <Text style={[s.headerTitle, { color: '#fff' }]}>{t('campaignDetail.headerTitle')}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: heroBg }]}>
          <FontAwesome5 name={catMeta.icon} size={56} color={catMeta.color} />
          <View style={[s.heroBadge, { backgroundColor: C.badgeFeatured }]}>
            <Text style={s.heroBadgeTxt}>{campaign.category.toUpperCase()}</Text>
          </View>
          {campaign.isNew && (
            <View style={[s.heroNewBadge, { backgroundColor: C.badgeNew }]}>
              <Text style={s.heroBadgeTxt}>{t('campaignCard.new')}</Text>
            </View>
          )}
          <View style={[s.heroPosted, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
            <Text style={s.heroPostedTxt}>
              {posted === 0 ? t('campaignDetail.postedToday') : posted === 1 ? t('campaignDetail.postedYesterday') : t('campaignDetail.postedDaysAgo', { n: posted })}
            </Text>
          </View>
          {campaign.campaignType === 'OPEN_EVENT' ? (
            <View style={[s.heroTypeBadge, { backgroundColor: 'rgba(255,255,255,0.93)' }]}>
              <Text style={[s.heroTypeTxt, { color: '#059669' }]}>{t('campaignDetail.badgeFreeEvent')}</Text>
            </View>
          ) : (
            <View style={[s.heroTypeBadge, { backgroundColor: 'rgba(255,255,255,0.93)' }]}>
              <Text style={[s.heroTypeTxt, { color: '#4F46E5' }]}>{t('campaignDetail.badgePaidEvent')}</Text>
            </View>
          )}
        </View>

        {/* Title block */}
        <View style={[s.titleBlock, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={s.brandRow}>
            <View style={[s.brandAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={s.brandAvatarTxt}>{campaign.brand[0]}</Text>
            </View>
            <Text style={[s.brandName, { color: C.text }]}>{campaign.brand}</Text>
            <View style={[s.verifiedBadge, { backgroundColor: C.active }]}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
            <View style={[s.platformTag, { backgroundColor: C.primaryLight, marginLeft: 'auto' }]}>
              <Text style={[s.platformTagTxt, { color: C.brinjal1 }]}>{campaign.platforms.join(', ')}</Text>
            </View>
          </View>
          <Text style={[s.campaignTitle, { color: C.text }]}>{campaign.title}</Text>
          <View style={s.budgetRow}>
            {campaign.campaignType !== 'OPEN_EVENT' && (
              <Text style={[s.budget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
            )}
            <View style={[s.proposalsBadge, { backgroundColor: C.primaryLight, marginLeft: 'auto' }]}>
              <Text style={[s.proposalsTxt, { color: C.brinjal1 }]}>
                {campaign.proposals === 1 ? t('campaignDetail.proposalCount', { n: campaign.proposals }) : t('campaignDetail.proposalsCount', { n: campaign.proposals })}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. About the Event */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionAbout')}</Text>
          <Text style={[s.description, { color: C.text }]}>{campaign.description}</Text>
        </View>

        {/* 2. Objectives — merged Objective + Event Goals content into one card */}
        {(campaign.template || campaign.objective || campaign.goals.length > 0 || (campaign.targetAudience && campaign.targetAudience.length > 0)) && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionObjectives')}</Text>
            {campaign.goals.length > 0 && (
              <View style={s.goalChips}>
                {campaign.goals.map((g) => (
                  <View key={g} style={[s.goalChip, { backgroundColor: C.primaryLight }]}>
                    <Text style={[s.goalChipTxt, { color: C.brinjal1 }]}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
            {campaign.template && (
              <View style={[s.templateRow, { marginTop: campaign.goals.length > 0 ? 12 : 0 }]}>
                <View style={[s.templateBadge, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.templateTxt, { color: C.brinjal1 }]}>{campaign.template}</Text>
                </View>
              </View>
            )}
            {!!campaign.aiSuggestedCategories?.length && (
              <Text style={[s.aiAlsoRelevant, { color: C.textSecondary }]}>Also relevant: {campaign.aiSuggestedCategories.join(', ')}</Text>
            )}
            {campaign.objective && (
              <Text style={[s.description, { color: C.text, marginTop: campaign.template || campaign.goals.length > 0 ? 12 : 0 }]}>{campaign.objective}</Text>
            )}
            {campaign.targetAudience && campaign.targetAudience.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: C.textSecondary, marginTop: 12 }]}>{t('campaignDetail.sectionTargetAudience')}</Text>
                <View style={s.goalChips}>
                  {campaign.targetAudience.map((aud) => (
                    <View key={aud} style={[s.goalChip, { backgroundColor: C.primaryLight }]}>
                      <Text style={[s.goalChipTxt, { color: C.brinjal1 }]}>{aud}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* 3. Event Details */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDetails')}</Text>
          <View style={s.detailsGrid}>
            {isOpenEvent && campaign.eventDate ? (
              <DetailRow icon="calendar-day" label={t('campaignDetail.detailEventDate')} value={formatDeadline(campaign.eventDate)} C={C} />
            ) : null}
            <DetailRow icon="calendar-alt" label={isOpenEvent ? 'Registration Deadline' : t('campaignDetail.detailDeadline')} value={formatDeadline(campaign.deadline)} C={C} />
            {!isOpenEvent && (
              <>
                <DetailRow icon="money-bill-wave" label={t('campaignDetail.detailBudget')}  value={campaign.budget} C={C} />
                {campaign.creatorsNeeded != null && (
                  <DetailRow icon="users" label={t('campaignDetail.detailCreatorsNeeded')} value={String(campaign.creatorsNeeded)} C={C} />
                )}
              </>
            )}
            {isOpenEvent && campaign.venue ? (
              <DetailRow icon="map-marker-alt" label={t('campaignDetail.detailVenue')} value={campaign.venue} C={C} />
            ) : (
              <DetailRow icon="map-marker-alt" label={t('campaignDetail.detailLocation')} value={campaign.location ?? t('campaignDetail.remoteLocation')} C={C} />
            )}
            {isOpenEvent && campaign.capacity ? (
              <DetailRow icon="users" label={t('campaignDetail.detailCapacity')} value={t('campaignDetail.capacityCreators', { n: campaign.capacity })} C={C} />
            ) : null}
            <DetailRow icon="chart-bar" label={t('campaignDetail.detailStatus')} value={campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : t('campaignDetail.statusActive')} C={C} />
          </View>
        </View>

        {/* Benefits card — free events only */}
        {isOpenEvent && campaign.benefits && campaign.benefits.length > 0 ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionWhatYouGet')}</Text>
            <View style={s.benefitsWrap}>
              {campaign.benefits.map((b, i) => (
                <View key={i} style={[s.benefitChip, { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' }]}>
                  <FontAwesome5 name="gift" size={12} color="#065F46" />
                  <Text style={[s.benefitChipTxt, { color: '#065F46' }]}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 4. Deliverables */}
        {campaign.deliverables ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDeliverables')}</Text>
            {campaign.deliverables.split(/,\s*|\s*\+\s*/).filter(Boolean).map((d, i) => (
              <ReqItem key={i} text={d.trim()} C={C} />
            ))}
          </View>
        ) : null}

        {/* 5. Content Guidelines */}
        {campaign.contentGuidelines && campaign.contentGuidelines.length > 0 && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionContentGuidelines')}</Text>
            {campaign.contentGuidelines.map((g, i) => (
              <ReqItem key={i} text={g} C={C} />
            ))}
          </View>
        )}

        {/* 6. Hashtags */}
        {campaign.hashtags && campaign.hashtags.length > 0 && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionHashtags')}</Text>
            <View style={s.goalChips}>
              {campaign.hashtags.map((tag) => (
                <View key={tag} style={[s.goalChip, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.goalChipTxt, { color: C.brinjal1 }]}>#{tag.replace(/^#/, '')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sample Caption */}
        {campaign.sampleCaption && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionSampleCaption')}</Text>
            <Text style={[s.description, { color: C.text, fontStyle: 'italic' }]}>&ldquo;{campaign.sampleCaption}&rdquo;</Text>
          </View>
        )}

        {/* 7. Call to Action */}
        {campaign.callToAction && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionCallToAction')}</Text>
            <Text style={[s.description, { color: C.text }]}>{campaign.callToAction}</Text>
          </View>
        )}

        {/* Approval Requirements */}
        {campaign.approvalRequirements && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionApprovalRequirements')}</Text>
            <Text style={[s.description, { color: C.text }]}>{campaign.approvalRequirements}</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[s.ctaBar, { backgroundColor: C.surface, borderTopColor: C.border, justifyContent: 'center' }]}>
        {isBusiness ? (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={openEdit}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={s.applyBtnTxt}>{t('campaignDetail.editEvent')}</Text>
          </Pressable>
        ) : isOpenEvent && applicationStatus === 'accepted' ? (
          <View style={s.invitedCard}>
            <View style={s.invitedIconWrap}>
              <FontAwesome5 name="trophy" size={18} color="#16A34A" solid />
            </View>
            <View style={s.invitedTextBlock}>
              <Text style={s.invitedTitle}>{t('campaignDetail.invitedTitle')}</Text>
              <Text style={s.invitedSub}>{t('campaignDetail.invitedSub')}</Text>
            </View>
          </View>
        ) : hasApplied ? (
          <View style={s.appliedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={s.appliedBadgeTxt}>{t('campaignDetail.alreadyApplied')}</Text>
          </View>
        ) : (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={() => campaign && router.push({ pathname: '/submit-proposal', params: { campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand, budget: campaign.budget, budgetMin: String(campaign.budgetRaw), budgetMax: String(campaign.budgetMax ?? campaign.budgetRaw), category: campaign.category, campaignType: campaign.campaignType ?? 'PAID_CAMPAIGN' } })}>
            <Text style={s.applyBtnTxt}>{t('campaignDetail.submitProposal')}</Text>
          </Pressable>
        )}
      </View>

      {/* ── Edit Campaign Modal ── */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={em.overlay}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={em.scrim} onPress={() => setEditOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={em.sheetWrap}>
            <View style={[em.sheet, { backgroundColor: C.surface }]}>
              <View style={[em.handle, { backgroundColor: C.border }]} />

              {/* Sheet header */}
              <View style={em.sheetHeader}>
                <Text style={[em.sheetTitle, { color: C.text }]}>{t('campaignDetail.editEvent')}</Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setEditOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={C.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={em.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* ── Basic Info ── */}
                <Text style={[em.sectionHdr, { color: C.textSecondary }]}>{t('campaignDetail.editSectionBasicInfo')}</Text>

                <Text style={[em.label, { color: C.text }]}>{t('campaignDetail.fieldTitle')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                <TextInput
                  style={[em.input, { backgroundColor: C.background, borderColor: editErrors.title ? ERROR_RED : C.border, color: C.text }]}
                  value={editForm.title}
                  onChangeText={(v) => updateEdit('title', v)}
                  placeholder={t('campaignDetail.titlePlaceholder')}
                  placeholderTextColor={C.textSecondary}
                />
                {editErrors.title ? <Text style={em.errTxt}>{editErrors.title}</Text> : null}

                <Text style={[em.label, { color: C.text, marginTop: 16 }]}>
                  {t('campaignDetail.fieldDescription')} <Text style={[em.optional, { color: C.textSecondary }]}>{t('campaignDetail.fieldOptional')}</Text>
                </Text>
                <TextInput
                  style={[em.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                  value={editForm.description}
                  onChangeText={(v) => updateEdit('description', v)}
                  placeholder={t('campaignDetail.descriptionPlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {isOpenEvent ? (
                  <>
                    {/* ── Open Event fields ── */}
                    <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>{t('campaignDetail.editSectionDetails')}</Text>

                    <Text style={[em.label, { color: C.text }]}>{t('campaignDetail.fieldEventDate')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[em.dateTrigger, { backgroundColor: C.background, borderColor: editErrors.eventDate ? ERROR_RED : C.border }]}
                      onPress={() => setEventCalOpen(true)}>
                      <Text style={[em.dateTxt, { color: editForm.eventDate ? C.text : C.textSecondary }]}>
                        {editForm.eventDate ? fmtDate(editForm.eventDate) : t('campaignDetail.eventDatePlaceholder')}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
                    </Pressable>
                    {editErrors.eventDate ? <Text style={em.errTxt}>{editErrors.eventDate}</Text> : null}

                    <Text style={[em.label, { color: C.text, marginTop: 16 }]}>{t('campaignDetail.fieldRegDeadline')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[em.dateTrigger, { backgroundColor: C.background, borderColor: editErrors.deadline ? ERROR_RED : C.border }]}
                      onPress={() => setCalOpen(true)}>
                      <Text style={[em.dateTxt, { color: editForm.deadline ? C.text : C.textSecondary }]}>
                        {editForm.deadline ? fmtDate(editForm.deadline) : t('campaignDetail.deadlinePlaceholder')}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
                    </Pressable>
                    {editErrors.deadline ? <Text style={em.errTxt}>{editErrors.deadline}</Text> : null}

                    <Text style={[em.label, { color: C.text, marginTop: 16 }]}>{t('campaignDetail.fieldVenue')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                    <PlacesAutocompleteInput
                      value={editForm.venue}
                      onChangeText={(v) => updateEdit('venue', v)}
                      placeholder="e.g. Kathmandu, New York or Remote"
                      types="geocode"
                      error={editErrors.venue}
                    />

                    <Text style={[em.label, { color: C.text, marginTop: 16 }]}>{t('campaignDetail.fieldCapacity')}</Text>
                    <TextInput
                      style={[em.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={editForm.capacity}
                      onChangeText={(v) => updateEdit('capacity', v.replace(/[^0-9]/g, ''))}
                      placeholder={t('campaignDetail.capacityPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      keyboardType="numeric"
                    />

                    <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>{t('campaignDetail.editSectionBenefits')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {EVENT_BENEFITS.map((b) => {
                        const checked = editForm.benefits.includes(b);
                        return (
                          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                            key={b}
                            style={[cg.chip, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.primaryLight : C.background }]}
                            onPress={() => {
                              const next = checked ? editForm.benefits.filter((x) => x !== b) : [...editForm.benefits, b];
                              updateEdit('benefits', next);
                            }}>
                            <Text style={[cg.txt, { color: checked ? C.brinjal1 : C.textSecondary, fontWeight: checked ? '700' : '500' }]}>{b}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <>
                    {/* ── Paid Campaign fields ── */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 }}>
                      <Text style={[em.sectionHdr, { color: C.textSecondary }]}>{t('campaignDetail.editSectionPlatform')}</Text>
                      {hasProposals && <Ionicons name="lock-closed" size={11} color={C.textSecondary} />}
                    </View>
                    {hasProposals && <Text style={[em.lockedNote, { color: C.textSecondary }]}>{t('campaignDetail.lockedFieldNote')}</Text>}
                    <PlatformChipGroup options={allPlatforms.map((p) => p.name)} values={editForm.platforms} onChange={(v) => updateEdit('platforms', v)} colors={C} error={editErrors.platforms} max={3} disabled={hasProposals} />

                    <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>{t('campaignDetail.editSectionRequirements')}</Text>

                    <Text style={[em.label, { color: C.text }]}>{t('campaignDetail.fieldContentType')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                    <ChipGroup options={CONTENT_TYPES} value={editForm.contentType} onChange={(v) => updateEdit('contentType', v)} colors={C} error={editErrors.contentType} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
                      <Text style={[em.label, { color: C.text }]}>{t('campaignDetail.fieldDeliverables')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                      {hasProposals && <Ionicons name="lock-closed" size={11} color={C.textSecondary} />}
                    </View>
                    {hasProposals && <Text style={[em.lockedNote, { color: C.textSecondary }]}>{t('campaignDetail.lockedFieldNote')}</Text>}
                    <TextInput
                      style={[em.textarea, { backgroundColor: hasProposals ? C.border : C.background, borderColor: editErrors.deliverables ? ERROR_RED : C.border, color: C.text, opacity: hasProposals ? 0.6 : 1 }]}
                      value={editForm.deliverables}
                      onChangeText={(v) => updateEdit('deliverables', v)}
                      placeholder={t('campaignDetail.deliverablesPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      editable={!hasProposals}
                    />
                    {editErrors.deliverables ? <Text style={em.errTxt}>{editErrors.deliverables}</Text> : null}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 }}>
                      <Text style={[em.sectionHdr, { color: C.textSecondary }]}>{t('campaignDetail.editSectionBudget')}</Text>
                      {hasProposals && <Ionicons name="lock-closed" size={11} color={C.textSecondary} />}
                    </View>
                    {hasProposals && <Text style={[em.lockedNote, { color: C.textSecondary }]}>{t('campaignDetail.lockedFieldNote')}</Text>}

                    <Text style={[em.label, { color: C.text }]}>{t('campaignDetail.fieldBudget')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                    <View style={em.budgetRow}>
                      <View style={{ flex: 1 }}>
                        <View style={[em.currencyWrap, { backgroundColor: hasProposals ? C.border : C.background, borderColor: editErrors.budgetMin ? ERROR_RED : C.border, opacity: hasProposals ? 0.6 : 1 }]}>
                          <Text style={[em.currencySymbol, { color: C.textSecondary }]}>Rs.</Text>
                          <TextInput
                            style={[em.currencyInput, { color: C.text }]}
                            value={editForm.budgetMin}
                            onChangeText={(v) => updateEdit('budgetMin', v.replace(/[^0-9.]/g, ''))}
                            placeholder={t('campaignDetail.budgetMinPlaceholder')}
                            placeholderTextColor={C.textSecondary}
                            keyboardType="numeric"
                            editable={!hasProposals}
                          />
                        </View>
                        {editErrors.budgetMin ? <Text style={em.errTxt}>{editErrors.budgetMin}</Text> : null}
                      </View>
                      <Text style={[em.budgetDash, { color: C.textSecondary }]}>–</Text>
                      <View style={{ flex: 1 }}>
                        <View style={[em.currencyWrap, { backgroundColor: hasProposals ? C.border : C.background, borderColor: editErrors.budgetMax ? ERROR_RED : C.border, opacity: hasProposals ? 0.6 : 1 }]}>
                          <Text style={[em.currencySymbol, { color: C.textSecondary }]}>Rs.</Text>
                          <TextInput
                            style={[em.currencyInput, { color: C.text }]}
                            value={editForm.budgetMax}
                            onChangeText={(v) => updateEdit('budgetMax', v.replace(/[^0-9.]/g, ''))}
                            placeholder={t('campaignDetail.budgetMaxPlaceholder')}
                            placeholderTextColor={C.textSecondary}
                            keyboardType="numeric"
                            editable={!hasProposals}
                          />
                        </View>
                        {editErrors.budgetMax ? <Text style={em.errTxt}>{editErrors.budgetMax}</Text> : null}
                      </View>
                    </View>

                    <Text style={[em.sectionHdr, { color: C.textSecondary, marginTop: 24 }]}>{t('campaignDetail.editSectionLogistics')}</Text>

                    <Text style={[em.label, { color: C.text }]}>{t('campaignDetail.fieldApplicationDeadline')} <Text style={{ color: C.brinjal1 }}>*</Text></Text>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[em.dateTrigger, { backgroundColor: C.background, borderColor: editErrors.deadline ? ERROR_RED : C.border }]}
                      onPress={() => setCalOpen(true)}>
                      <Text style={[em.dateTxt, { color: editForm.deadline ? C.text : C.textSecondary }]}>
                        {editForm.deadline ? fmtDate(editForm.deadline) : t('campaignDetail.datePlaceholder')}
                      </Text>
                      <FontAwesome5 name="calendar-alt" size={14} color={C.textSecondary} />
                    </Pressable>
                    {editErrors.deadline ? <Text style={em.errTxt}>{editErrors.deadline}</Text> : null}

                    <Text style={[em.label, { color: C.text, marginTop: 16 }]}>
                      {t('campaignDetail.fieldLocation')} <Text style={{ color: C.brinjal1 }}>*</Text>
                    </Text>
                    <PlacesAutocompleteInput
                      value={editForm.location}
                      onChangeText={(v) => updateEdit('location', v)}
                      placeholder="e.g. Kathmandu, New York or Remote"
                      types="geocode"
                      error={editErrors.location}
                    />
                  </>
                )}

                <Text style={[em.label, { color: C.text, marginTop: 24 }]}>{t('campaignDetail.fieldStatus')}</Text>
                <ChipGroup
                  options={STATUS_OPTIONS.map((o) => t(o.labelKey))}
                  value={t(STATUS_OPTIONS.find((o) => o.value === editForm.status)?.labelKey ?? 'campaignDetail.statusActive')}
                  onChange={(label) => {
                    const opt = STATUS_OPTIONS.find((o) => t(o.labelKey) === label);
                    if (opt) updateEdit('status', opt.value);
                  }}
                  colors={C}
                />

                {/* ── Featured ── */}
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[em.featuredToggle, { backgroundColor: editForm.isFeatured ? '#FFF8E8' : C.background, borderColor: editForm.isFeatured ? '#F59E0B' : C.border, marginTop: 20 }]}
                  onPress={() => updateEdit('isFeatured', !editForm.isFeatured)}>
                  <View style={em.featuredLeft}>
                    <FontAwesome5 name="star" size={18} color="#F59E0B" solid />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[em.featuredLabel, { color: C.text }]}>{t('campaignDetail.featureEvent')}</Text>
                      <Text style={[em.featuredSub, { color: C.textSecondary }]}>{t('campaignDetail.featureEventSub')}</Text>
                    </View>
                  </View>
                  <View style={[em.toggle, { backgroundColor: editForm.isFeatured ? '#F59E0B' : C.border }]}>
                    <View style={[em.toggleThumb, { left: editForm.isFeatured ? 20 : 2 }]} />
                  </View>
                </Pressable>

                <View style={{ height: 32 }} />
              </ScrollView>

              {/* Save button */}
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={({ pressed }) => [em.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }, pressed && !saving && { opacity: 0.88 }]}
                onPress={handleSave}
                disabled={saving}>
                <Text style={em.saveBtnTxt}>{saving ? t('campaignDetail.saving') : t('campaignDetail.saveChanges')}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Calendar modal (deadline) ── */}
      <Modal visible={calOpen} transparent animationType="slide" onRequestClose={() => setCalOpen(false)}>
        <View style={em.overlay}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={em.scrim} onPress={() => setCalOpen(false)} />
          <View style={[em.calSheet, { backgroundColor: C.surface }]}>
            <View style={[em.handle, { backgroundColor: C.border }]} />
            <View style={em.sheetHeader}>
              <Text style={[em.sheetTitle, { color: C.text }]}>{isOpenEvent ? t('campaignDetail.calendarRegDeadline') : t('campaignDetail.calendarSelectDeadline')}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setCalOpen(false)}>
                <Text style={[em.doneBtn, { color: C.brinjal1 }]}>{t('campaignDetail.doneBtn')}</Text>
              </Pressable>
            </View>
            {editForm.deadline && (
              <View style={[em.selectedBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[em.selectedTxt, { color: C.brinjal1 }]}>{t('campaignDetail.calendarSelected', { date: fmtDate(editForm.deadline) })}</Text>
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

      {/* ── Calendar modal (event date) ── */}
      <Modal visible={eventCalOpen} transparent animationType="slide" onRequestClose={() => setEventCalOpen(false)}>
        <View style={em.overlay}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={em.scrim} onPress={() => setEventCalOpen(false)} />
          <View style={[em.calSheet, { backgroundColor: C.surface }]}>
            <View style={[em.handle, { backgroundColor: C.border }]} />
            <View style={em.sheetHeader}>
              <Text style={[em.sheetTitle, { color: C.text }]}>{t('campaignDetail.calendarEventDate')}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setEventCalOpen(false)}>
                <Text style={[em.doneBtn, { color: C.brinjal1 }]}>{t('campaignDetail.doneBtn')}</Text>
              </Pressable>
            </View>
            {editForm.eventDate && (
              <View style={[em.selectedBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[em.selectedTxt, { color: C.brinjal1 }]}>{t('campaignDetail.calendarSelected', { date: fmtDate(editForm.eventDate) })}</Text>
              </View>
            )}
            <CalendarGrid
              value={editForm.eventDate}
              onChange={(d) => {
                const twoDaysBefore = new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000);
                updateEdit('eventDate', d);
                updateEdit('deadline', twoDaysBefore);
                setEventCalOpen(false);
              }}
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
          <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'close-circle'} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.toastTxt}>{toast.message}</Text>
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
        <FontAwesome5 name={icon} size={14} color={getIconColor(icon)} />
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
  goBackBtnTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },

  gradientHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontFamily: F.bold },

  scroll: { paddingBottom: 20 },

  hero:         { height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  heroBadge:    { position: 'absolute', top: 14, left: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroNewBadge: { position: 'absolute', top: 14, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeTxt: { fontSize: 10, color: '#fff', letterSpacing: 0.5, fontFamily: F.bold },
  heroPosted:    { position: 'absolute', bottom: 12, left: 16, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroPostedTxt: { fontSize: 11, color: '#fff', fontFamily: F.medium },
  heroTypeBadge: { position: 'absolute', bottom: 12, right: 14, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroTypeTxt:   { fontSize: 11, fontFamily: F.bold },

  titleBlock:    { paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderBottomWidth: 1 },
  brandRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandAvatar:   { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  brandAvatarTxt:{ fontSize: 12, color: '#fff', fontFamily: F.bold },
  brandName:     { fontSize: 14, fontFamily: F.semibold },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  platformTag:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  platformTagTxt:{ fontSize: 12, fontFamily: F.semibold },
  campaignTitle: { fontSize: 20, lineHeight: 26, fontFamily: F.bold },
  budgetRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budget:        { fontSize: 22, fontFamily: F.bold },
  typeBadge:     { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  typeBadgeText: { fontSize: 12, fontFamily: F.bold },
  proposalsBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  proposalsTxt:  { fontSize: 12, fontFamily: F.semibold },

  card:        { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionLabel:{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: F.bold },
  templateRow: { flexDirection: 'row' },
  templateBadge:{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  templateTxt: { fontSize: 13, fontFamily: F.bold },
  aiAlsoRelevant: { fontSize: 11, fontFamily: F.regular, marginTop: 6 },
  goalChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip:    { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  goalChipTxt: { fontSize: 12, fontFamily: F.semibold },
  detailsGrid: { gap: 10 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailContent:{ flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: F.medium },
  detailValue: { fontSize: 14, marginTop: 1, fontFamily: F.semibold },
  description: { fontSize: 15, lineHeight: 22, fontFamily: F.regular },
  reqItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4 },
  reqDot:      { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  reqText:     { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.regular },

  benefitsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  benefitChipTxt:{ fontSize: 13, fontFamily: F.semibold },

  ctaBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, gap: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  ctaInfo:       { flex: 1 },
  ctaBudget:     { fontSize: 18, fontFamily: F.bold },
  ctaLabel:      { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  applyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyBtnTxt:   { color: '#fff', fontSize: 15, fontFamily: F.bold },
  appliedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5, borderColor: '#A7F3D0' },
  appliedBadgeTxt:{ fontSize: 15, color: '#059669', fontFamily: F.bold },

  invitedCard:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: '#6EE7B7' },
  invitedIconWrap:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  invitedTextBlock: { flex: 1, gap: 2 },
  invitedTitle:     { fontSize: 15, color: '#065F46', fontFamily: F.bold },
  invitedSub:       { fontSize: 12, color: '#047857', fontFamily: F.regular, lineHeight: 17 },

  toast:    { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  toastTxt: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },
});

const em = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  scrim:     { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 32, maxHeight: '92%' },
  calSheet:  { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 16 },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontFamily: F.bold },
  doneBtn:     { fontSize: 15, fontFamily: F.bold },

  body: { flexGrow: 0 },

  sectionHdr: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, marginBottom: 12, fontFamily: F.bold },
  lockedNote: { fontSize: 11, marginTop: -8, marginBottom: 10, fontFamily: F.regular },
  label:      { fontSize: 13, marginBottom: 8, fontFamily: F.semibold },
  optional:   { fontSize: 12, fontFamily: F.regular },
  input:      { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: F.regular },
  textarea:   { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, fontFamily: F.regular },
  errTxt:     { fontSize: 12, color: ERROR_RED, marginTop: 4, fontFamily: F.regular },

  budgetRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  budgetDash:     { marginHorizontal: 10, marginTop: 14, fontSize: 16 },
  currencyWrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 48, gap: 4 },
  currencySymbol: { fontSize: 16, fontFamily: F.semibold },
  currencyInput:  { flex: 1, fontSize: 15, fontFamily: F.regular },

  dateTrigger: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48, gap: 8 },
  dateTxt:     { flex: 1, fontSize: 15, fontFamily: F.regular },

  selectedBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  selectedTxt:   { fontSize: 13, fontFamily: F.bold },

  featuredToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14, borderWidth: 1.5 },
  featuredLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  featuredLabel:  { fontSize: 14, fontFamily: F.bold },
  featuredSub:    { fontSize: 12, fontFamily: F.regular },
  toggle:         { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb:    { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },

  saveBtn:    { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
