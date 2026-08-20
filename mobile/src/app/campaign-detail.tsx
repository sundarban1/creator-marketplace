import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BackButton } from '@/components/BackButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { FeatureImagePicker } from '@/features/creator/components/FeatureImagePicker';
import { useAllCategories, useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, MAX_CONTENT_WIDTH } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';
import {
  DELIVERABLE_TYPES, DEFAULT_DELIVERABLES, summarizeDeliverables,
} from '@/features/business/constants/campaignForm';
import {
  SectionCard, ChipGroup, ChipMultiGroup, BudgetTierPicker, Stepper,
  DeliverablesCounterList, HashtagEditor, FeaturedToggle, sc,
} from '@/features/business/components/CampaignFormControls';
import { ListingHeroCard, PreviewRow } from '@/features/business/components/CampaignSummary';

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_RED = '#EF4444';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

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
  circle: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontSize: 13, fontWeight: '500' },
});

// ─── PlacesInput ──────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type EditForm = {
  title: string;
  description: string;
  featureImageUrl: string | null;
  template: string;
  deliverables: Record<string, number>;
  hashtags: string[];
  creatorsNeeded: string;
  status: NonNullable<Campaign['status']>;
  budgetMin: string;
  budgetMax: string;
  deadline: Date | null;
  location: string;
  locationType: 'ONSITE' | 'REMOTE';
  isFeatured: boolean;
  // OPEN_EVENT fields
  eventDate: Date | null;
  venue: string;
  capacity: string;
  benefits: string[];
};

type EditErrors = Partial<Record<keyof EditForm, string>>;

// Kept in sync with OFFERING_OPTIONS in create-campaign.tsx / BENEFIT_OPTIONS
// in backend/campaign-ai.schema.ts — AI-generated event drafts only ever return these.
const EVENT_BENEFITS = [
  'Free Event Access',
  'Food & Drinks',
  'Free Products / Gifts',
  'Free Service / Experience',
  'Product Launch / Preview',
  'Other',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { user } = useAuth();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const isBusiness = user?.role === 'BUSINESS';
  const { categories: allCategories } = useAllCategories();
  // Business-scope categories for the edit summary's Category picker — same
  // source create-campaign.tsx's own Category chip editor uses.
  const { categories: liveCategories } = useCategories('BUSINESS');
  const categoryOptions = liveCategories.map((c) => ({ label: c.name, icon: c.icon, color: c.color }));

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hasApplied, setHasApplied]           = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' | null>(null);
  // Multi-role campaigns (§ CampaignRequirement) — which specific roles this
  // provider has already applied to. The backend allows one application per
  // role (unique on campaignId+creatorId+requirementId), so a provider can
  // apply to several different roles on the same campaign; hasApplied above
  // stays scoped to the simple/no-requirement application slot only.
  const [appliedRequirementIds, setAppliedRequirementIds] = useState<Set<string>>(new Set());
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
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  // Which field's small tap-to-edit BottomSheet is open — null means none.
  // Location/Venue use LocationSearchModal above instead; Deadline/Event Date
  // use the existing calOpen/eventCalOpen sheets below — same split as
  // create-campaign.tsx's Publish screen.
  const [editingField, setEditingField] = useState<'title' | 'description' | 'image' | 'category' | 'hashtags' | 'people' | 'capacity' | 'benefits' | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', featureImageUrl: null, template: '',
    deliverables: DEFAULT_DELIVERABLES, hashtags: [], creatorsNeeded: '1',
    status: 'active', budgetMin: '', budgetMax: '', deadline: null,
    location: '', locationType: 'ONSITE', isFeatured: false,
    eventDate: null, venue: '', capacity: '20', benefits: [],
  });
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);
  const [featureImageUploading, setFeatureImageUploading] = useState(false);
  // Only relevant while the campaign isn't already featured — see the `quota`
  // prop passed to FeaturedToggle below for why an already-featured campaign
  // skips this entirely.
  const [featuredQuota, setFeaturedQuota] = useState<{ remaining: number; price: number; unlimited: boolean } | null>(null);

  async function handlePickFeatureImage() {
    if (featureImageUploading) return;
    setFeatureImageUploading(true);
    try {
      const result = await pickAndUpload('campaign-feature');
      if (result?.url) updateEdit('featureImageUrl', result.url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.featureImageUploadFailed'), 'error');
    } finally {
      setFeatureImageUploading(false);
    }
  }

  function handleClearFeatureImage() {
    updateEdit('featureImageUrl', null);
  }

  // Once a proposal has been submitted, the terms it was submitted against
  // (price, platform, deliverables, status) are locked — everything else stays editable.
  const hasProposals = (campaign?.proposals ?? 0) > 0;

  // Best-effort reverse-parse of the persisted "1 Reel, 2 Story" deliverables string
  // back into per-type counts, so the edit form's counter UI starts pre-filled instead
  // of blank. The string was originally built by this same app's summarizeDeliverables()
  // (format "<n> <Label>", comma-joined), so a simple regex match per type is reliable
  // for campaigns created after this redesign — older/free-text campaigns just default
  // to all-zero counts and the business re-sets them.
  function parseDeliverablesString(str: string): Record<string, number> {
    const counts = { ...DEFAULT_DELIVERABLES };
    for (const item of DELIVERABLE_TYPES) {
      const label = t(item.labelKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = str.match(new RegExp(`(\\d+)\\s*${label}`, 'i'));
      if (match) counts[item.key] = parseInt(match[1]!, 10);
    }
    return counts;
  }

  function openEdit() {
    if (!campaign) return;
    setEditForm({
      title:        campaign.title,
      description:  campaign.description ?? '',
      featureImageUrl: campaign.featureImageUrl ?? null,
      template:     campaign.template ?? '',
      deliverables:    parseDeliverablesString(campaign.deliverables ?? ''),
      hashtags:        campaign.hashtags ?? [],
      creatorsNeeded:  String(campaign.creatorsNeeded ?? 1),
      status:       campaign.status ?? 'active',
      budgetMin:    String(campaign.budgetRaw ?? ''),
      budgetMax:    String(campaign.budgetMax ?? ''),
      deadline:     campaign.deadline ? new Date(campaign.deadline) : null,
      location:     campaign.location ?? '',
      locationType: campaign.locationType ?? 'ONSITE',
      isFeatured:   campaign.isFeatured,
      eventDate:    campaign.eventDate ? new Date(campaign.eventDate) : null,
      venue:        campaign.venue ?? '',
      capacity:     String(campaign.capacity ?? 20),
      benefits:     campaign.benefits ?? [],
    });
    setEditErrors({});
    setEditOpen(true);
    if (!campaign.isFeatured) {
      campaignService.getFeaturedQuota().then(setFeaturedQuota).catch(() => {});
    }
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
          featureImageUrl: editForm.featureImageUrl,
          status:      editForm.status,
          deadline:    editForm.deadline!.toISOString(),
          venue:       editForm.venue.trim() || null,
          capacity:    Number(editForm.capacity) || 20,
          eventDate:   editForm.eventDate?.toISOString(),
          benefits:    editForm.benefits,
          // Locked by the backend once proposals exist — see the PAID_CAMPAIGN
          // branch below for the full explanation of why this has to be
          // conditionally omitted rather than sent as false/unchanged.
          ...(hasProposals ? {} : { isFeatured: editForm.isFeatured }),
        });
      } else {
        await campaignService.update(campaign!.id, {
          title:        editForm.title.trim(),
          description:  editForm.description.trim() || undefined,
          featureImageUrl: editForm.featureImageUrl,
          template:     editForm.template || undefined,
          category:     editForm.template || undefined,
          hashtags:       editForm.hashtags,
          creatorsNeeded: Number(editForm.creatorsNeeded) || undefined,
          status:       editForm.status,
          deadline:     editForm.deadline!.toISOString(),
          // Locked by the backend once proposals exist — only send these when
          // the UI actually allows changing them, otherwise the whole update
          // is rejected even for unrelated fields like title/description.
          ...(hasProposals ? {} : {
            deliverables: summarizeDeliverables(editForm.deliverables, [], t),
            budgetMin:    Number(editForm.budgetMin),
            budgetMax:    Number(editForm.budgetMax),
            location:     editForm.locationType === 'REMOTE' ? null : editForm.location.trim(),
            locationType: editForm.locationType,
            isFeatured:   editForm.isFeatured,
          }),
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
          const myApps = (apps as { campaignId: string; status: string; requirementId: string | null }[]).filter((a) => a.campaignId === campaignId);
          const myApp = myApps.find((a) => !a.requirementId);
          setHasApplied(!!myApp);
          setApplicationStatus(myApp ? myApp.status as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' : null);
          setAppliedRequirementIds(new Set(myApps.filter((a) => a.requirementId).map((a) => a.requirementId!)));
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
          const myApps = apps.filter((a) => a.campaignId === campaignId);
          const myApp = myApps.find((a) => !a.requirementId);
          setHasApplied(!!myApp);
          setApplicationStatus(myApp ? myApp.status as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' : null);
          setAppliedRequirementIds(new Set(myApps.filter((a) => a.requirementId).map((a) => a.requirementId!)));
        })
        .catch(() => {});
    }, [campaignId, isBusiness])
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <BackButton />
          <Text style={[s.headerTitle, { color: C.text }]}>{t('campaignDetail.headerTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.centered}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={s.centered}>
          <FontAwesome5 name="search" solid size={40} color={C.textSecondary} />
          <Text style={[{ fontSize: 17, fontWeight: '600' }, { color: C.textSecondary }]}>{error || t('campaignDetail.notFound')}</Text>
          <Pressable style={[s.goBackBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.back()}>
            <Text style={s.goBackBtnTxt}>{t('campaignDetail.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const catMeta = getCategoryMeta(allCategories, campaign.categoryKey ?? campaign.category);
  const heroBg  = catMeta.bg;
  const posted  = daysAgo(campaign.createdAt);
  const heroImage = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.categoryKey ?? campaign.category);

  // "Who You Need" reflects the roles actually captured at creation.
  // Events collect a real "who are you inviting" chip set (roleTypes,
  // stored as targetAudience) — show that ahead of the synthetic
  // "category (capacity)" line, which just repeats the Capacity row
  // already shown in Event Details below. Multi-role campaigns list each
  // role/quantity; other paid campaigns fall back to category + creator
  // count since their targetAudience is AI-derived, not business-picked.
  const whoYouNeed = campaign.requirements && campaign.requirements.length > 0
    ? campaign.requirements.map((r) => `${r.category.name} ×${r.quantity}`)
    : isOpenEvent && campaign.targetAudience && campaign.targetAudience.length > 0
      ? campaign.targetAudience
      : campaign.creatorsNeeded != null && campaign.category
        ? [`${campaign.category} (${campaign.creatorsNeeded})`]
        : (campaign.targetAudience && campaign.targetAudience.length > 0 ? campaign.targetAudience : []);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton />
        <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{campaign.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: heroBg }]}>
          <FontAwesome5 name={catMeta.icon} size={56} color={catMeta.color} />
          {heroImage && (
            <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          {heroImage && <View style={[StyleSheet.absoluteFill, s.heroImgOverlay]} />}
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
              {/* C.brinjal1, not a hardcoded hex — this screen is shared by
                  both roles (creator/business), and a fixed purple would
                  read wrong against a business viewer's green theme. */}
              <Text style={[s.heroTypeTxt, { color: C.brinjal1 }]}>{t('campaignDetail.badgePaidEvent')}</Text>
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
              <FontAwesome5 name="check" solid size={10} color="#fff" />
            </View>
          </View>
          <Text style={[s.campaignTitle, { color: C.text }]}>{campaign.title}</Text>
          {campaign.campaignType !== 'OPEN_EVENT' && (
            <View style={s.budgetRow}>
              <Text style={[s.budget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
            </View>
          )}
          <View style={{ alignItems: 'flex-end' }}>
            {isBusiness ? (
              <Pressable
                disabled={!campaign.proposals}
                style={({ pressed }) => [
                  s.proposalsBadge,
                  {
                    backgroundColor: C.primaryLight, flexDirection: 'row', alignItems: 'center', gap: 6,
                    borderWidth: 1.5, borderColor: campaign.proposals ? C.brinjal1 : C.border,
                    paddingHorizontal: 14, paddingVertical: 8,
                  },
                  !campaign.proposals && { backgroundColor: 'transparent' },
                  pressed && !!campaign.proposals && { opacity: 0.7 },
                ]}
                onPress={() => router.push({
                  pathname: '/(business)/campaign-proposals',
                  params: {
                    campaignId:    campaign.id,
                    campaignTitle: campaign.title,
                    campaignType:  campaign.campaignType ?? 'PAID_CAMPAIGN',
                  },
                })}>
                <FontAwesome5 name="file-alt" solid size={12} color={campaign.proposals ? C.brinjal1 : C.textSecondary} />
                <Text style={[s.proposalsTxt, { color: campaign.proposals ? C.brinjal1 : C.textSecondary, fontFamily: F.bold }]}>
                  {campaign.proposals
                    ? t(campaign.proposals === 1 ? 'campaignDetail.viewProposalsBtn' : 'campaignDetail.viewProposalsBtnPlural', { n: campaign.proposals })
                    : t('campaignDetail.noProposalsBtn')}
                </Text>
                {!!campaign.proposals && <FontAwesome5 name="chevron-right" solid size={10} color={C.brinjal1} />}
              </Pressable>
            ) : (
              <View style={[s.proposalsBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[s.proposalsTxt, { color: C.brinjal1 }]}>
                  {campaign.proposals === 1 ? t('campaignDetail.proposalCount', { n: campaign.proposals }) : t('campaignDetail.proposalsCount', { n: campaign.proposals })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 1. About the Event */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionAbout')}</Text>
          <Text style={[s.description, { color: C.text }]}>{campaign.description}</Text>
        </View>

        {/* 2. Category — just the category + AI-relevant categories + who
            the business is targeting. `goals` and `objective` dropped: both
            are AI-filled write-only fields the business never reviews at
            creation, so they added noise without adding real information. */}
        {(campaign.template || whoYouNeed.length > 0) && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionCategory')}</Text>
            {campaign.template && (
              <View style={s.templateRow}>
                <View style={[s.templateBadge, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.templateTxt, { color: C.brinjal1 }]}>{campaign.template}</Text>
                </View>
              </View>
            )}
            {!!campaign.aiSuggestedCategories?.length && (
              <Text style={[s.aiAlsoRelevant, { color: C.textSecondary, marginTop: campaign.template ? 8 : 0 }]}>Also relevant: {campaign.aiSuggestedCategories.join(', ')}</Text>
            )}
            {whoYouNeed.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: C.textSecondary, marginTop: 12 }]}>{t('campaignDetail.sectionTargetAudience')}</Text>
                <View style={s.goalChips}>
                  {whoYouNeed.map((who) => (
                    <View key={who} style={[s.goalChip, { backgroundColor: C.primaryLight }]}>
                      <Text style={[s.goalChipTxt, { color: C.brinjal1 }]}>{who}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* 4. Event Details */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDetails')}</Text>
          <View style={s.detailsGrid}>
            {isOpenEvent && campaign.eventDate ? (
              <DetailRow icon="calendar-day" label={t('campaignDetail.detailEventDate')} value={formatDeadline(campaign.eventDate)} C={C} />
            ) : null}
            <DetailRow icon="calendar-alt" label={isOpenEvent ? 'Registration Deadline' : t('campaignDetail.detailDeadline')} value={formatDeadline(campaign.deadline)} C={C} />
            {!isOpenEvent && (
              <>
                <DetailRow icon="wallet" label={t('campaignDetail.detailBudget')}  value={campaign.budget} C={C} />
                {campaign.creatorsNeeded != null && (
                  <DetailRow icon="users" label={t('campaignDetail.detailCreatorsNeeded')} value={String(campaign.creatorsNeeded)} C={C} />
                )}
              </>
            )}
            {campaign.locationType === 'REMOTE' ? (
              <DetailRow icon="globe" label={t('campaignDetail.detailLocation')} value={t('createEvent.locationRemote')} C={C} />
            ) : isOpenEvent && campaign.venue ? (
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
                  <FontAwesome5 name="gift" solid size={12} color="#065F46" />
                  <Text style={[s.benefitChipTxt, { color: '#065F46' }]}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* 5. Deliverables — multi-role campaigns each collect their own
            deliverables at creation, so list every role's under its own
            name in one card instead of the single flattened campaign-level
            string (which also can't be split correctly per role). */}
        {campaign.requirements && campaign.requirements.length > 0 ? (
          campaign.requirements.some((r) => r.deliverables) && (
            <View style={[s.card, { backgroundColor: C.surface }]}>
              <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDeliverables')}</Text>
              <View style={{ gap: 14 }}>
                {campaign.requirements.filter((r) => r.deliverables).map((r) => (
                  <View key={r.id}>
                    <Text style={[s.roleTitle, { color: C.text, marginBottom: 4 }]}>{r.category.name}</Text>
                    {r.deliverables!.split(/,\s*|\s*\+\s*/).filter(Boolean).map((d, i) => (
                      <ReqItem key={i} text={d.trim()} C={C} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )
        ) : campaign.deliverables ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDeliverables')}</Text>
            {campaign.deliverables.split(/,\s*|\s*\+\s*/).filter(Boolean).map((d, i) => (
              <ReqItem key={i} text={d.trim()} C={C} />
            ))}
          </View>
        ) : null}

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
      <View style={[s.ctaBar, { justifyContent: 'center' }, !isBusiness && campaign.requirements && campaign.requirements.length > 0 && s.ctaBarRoles]}>
        {isBusiness ? (
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={openEdit}>
            <FontAwesome5 name="edit" size={16} color="#fff" />
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
        ) : campaign.requirements && campaign.requirements.length > 0 ? (
          // Multi-role campaign — the "Roles Needed" card lives here, in the
          // sticky footer, instead of the scrollable body, so applying to a
          // specific role is always one tap away regardless of scroll position.
          <View style={{ width: '100%', gap: 8 }}>
            <Text style={[s.sectionLabel, { color: C.textSecondary, marginBottom: 0 }]}>{t('campaignDetail.sectionRolesNeeded')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roleChipRow}>
              {campaign.requirements.map((r) => {
                const full = r.acceptedCount >= r.quantity;
                const applied = appliedRequirementIds.has(r.id);
                const budgetLabel = r.budgetType === 'FIXED' ? `Rs. ${(r.budgetFixed ?? 0).toLocaleString()}`
                  : r.budgetType === 'RANGE' ? `Rs. ${(r.budgetMin ?? 0).toLocaleString()} - ${(r.budgetMax ?? 0).toLocaleString()}`
                  : t('campaignDetail.negotiable');
                return (
                  <View key={r.id} style={[s.roleChip, { borderColor: C.border, backgroundColor: C.surface }]}>
                    <View style={[s.roleIconWrap, { backgroundColor: `${r.category.color}1A` }]}>
                      <FontAwesome5 name={r.category.icon as any} size={14} color={r.category.color} solid />
                    </View>
                    <View style={{ gap: 1 }}>
                      <Text style={[s.roleChipTitle, { color: C.text }]} numberOfLines={1}>{r.category.name}</Text>
                      <Text style={[s.roleChipSub, { color: C.textSecondary }]} numberOfLines={1}>
                        {t('campaignDetail.roleFilled', { accepted: r.acceptedCount, quantity: r.quantity })} · {budgetLabel}
                      </Text>
                    </View>
                    {applied ? (
                      <View style={s.roleAppliedBadge}>
                        <FontAwesome5 name="check-circle" solid size={14} color="#059669" />
                      </View>
                    ) : full ? (
                      <Text style={[s.roleFullTxt, { color: C.textSecondary }]}>{t('campaignDetail.roleFull')}</Text>
                    ) : (
                      <Pressable
                        style={[s.roleChipApplyBtn, { backgroundColor: C.brinjal1 }]}
                        onPress={() => router.push({
                          pathname: '/submit-proposal',
                          params: {
                            campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand,
                            budget: budgetLabel,
                            budgetMin: String(r.budgetType === 'RANGE' ? (r.budgetMin ?? 0) : (r.budgetFixed ?? 0)),
                            budgetMax: String(r.budgetType === 'RANGE' ? (r.budgetMax ?? 0) : (r.budgetFixed ?? 0)),
                            category: r.category.name, campaignType: campaign.campaignType ?? 'PAID_CAMPAIGN',
                            requirementId: r.id,
                          },
                        })}>
                        <Text style={s.roleApplyBtnTxt}>{t('campaignDetail.roleApply')}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : hasApplied ? (
          <View style={s.appliedBadge}>
            <FontAwesome5 name="check-circle" solid size={18} color="#059669" />
            <Text style={s.appliedBadgeTxt}>{t('campaignDetail.alreadyApplied')}</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={() => campaign && router.push({ pathname: '/submit-proposal', params: { campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand, budget: campaign.budget, budgetMin: String(campaign.budgetRaw), budgetMax: String(campaign.budgetMax ?? campaign.budgetRaw), category: campaign.category, campaignType: campaign.campaignType ?? 'PAID_CAMPAIGN' } })}>
            <Text style={s.applyBtnTxt}>{t('campaignDetail.submitProposal')}</Text>
          </Pressable>
        )}
      </View>
      </MaxWidthContainer>

      {/* ── Edit Campaign Modal — publish-page-style tap-to-edit summary ── */}
      <BottomSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('campaignDetail.editEvent')}
        maxHeightPct={0.92}
        maxWidth={MAX_CONTENT_WIDTH}
        contentContainerStyle={em.bodyContent}
        footer={
          <Pressable
            style={({ pressed }) => [em.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }, pressed && !saving && { opacity: 0.88 }]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={em.saveBtnTxt}>{saving ? t('campaignDetail.saving') : t('campaignDetail.saveChanges')}</Text>
          </Pressable>
        }>

        <ListingHeroCard
          featureImageUrl={editForm.featureImageUrl}
          title={editForm.title.trim() || t('campaignDetail.titlePlaceholder')}
          category={editForm.template || undefined}
          colors={C}
          onEditPress={() => setEditingField('title')}
          onImagePress={() => setEditingField('image')}
        />
        {editErrors.title ? <Text style={em.errTxt}>{editErrors.title}</Text> : null}

        <SectionCard
          title={t('campaignDetail.fieldStatus')}
          sub={hasProposals ? t('campaignDetail.lockedFieldNote') : undefined}
          colors={C}>
          <ChipGroup
            options={STATUS_OPTIONS.map((o) => t(o.labelKey))}
            value={editForm.status === 'expired'
              ? t('campaignDetail.statusExpired')
              : t(STATUS_OPTIONS.find((o) => o.value === editForm.status)?.labelKey ?? 'campaignDetail.statusActive')}
            onChange={(label) => {
              if (hasProposals || editForm.status === 'expired') return;
              const opt = STATUS_OPTIONS.find((o) => t(o.labelKey) === label);
              if (opt) updateEdit('status', opt.value);
            }}
            colors={C}
            disabled={hasProposals || editForm.status === 'expired'}
          />
        </SectionCard>

        {isOpenEvent ? (
          <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
            <Text style={[sc.title, { color: C.text, marginBottom: 2 }]}>{t('campaignDetail.sectionDetails')}</Text>
            <PreviewRow
              icon="map-marker-alt"
              label={t('campaignDetail.fieldVenue')}
              value={editForm.venue || '—'}
              colors={C}
              onPress={() => setLocationModalOpen(true)}
            />
            <PreviewRow
              icon="calendar-day"
              label={t('campaignDetail.fieldEventDate')}
              value={editForm.eventDate ? fmtDate(editForm.eventDate) : '—'}
              colors={C}
              onPress={() => setEventCalOpen(true)}
            />
            <PreviewRow
              icon="calendar-alt"
              label={t('campaignDetail.fieldRegDeadline')}
              value={editForm.deadline ? fmtDate(editForm.deadline) : '—'}
              colors={C}
              onPress={() => setCalOpen(true)}
            />
            <PreviewRow
              icon="users"
              label={t('campaignDetail.fieldCapacity')}
              value={editForm.capacity || '—'}
              colors={C}
              onPress={() => setEditingField('capacity')}
              last
            />
          </View>
        ) : (
          <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
            <Text style={[sc.title, { color: C.text, marginBottom: 2 }]}>{t('campaignDetail.sectionDetails')}</Text>
            <PreviewRow
              icon="th-large"
              label={t('campaignDetail.fieldCategory')}
              value={editForm.template || '—'}
              colors={C}
              onPress={() => setEditingField('category')}
            />
            <PreviewRow
              icon={editForm.locationType === 'REMOTE' ? 'globe' : 'map-marker-alt'}
              label={t('campaignDetail.fieldLocation')}
              value={editForm.locationType === 'REMOTE' ? t('createEvent.locationRemote') : (editForm.location || '—')}
              colors={C}
              onPress={hasProposals || editForm.locationType === 'REMOTE' ? undefined : () => setLocationModalOpen(true)}
            />
            <PreviewRow
              icon="money-bill-alt"
              label={t('createEvent.confirmSectionBudget')}
              value={`Rs. ${(Number(editForm.budgetMin) || 0).toLocaleString()} – ${(Number(editForm.budgetMax) || 0).toLocaleString()}`}
              colors={C}
            />
            <PreviewRow
              icon="calendar-alt"
              label={t('createEvent.confirmSectionCloses')}
              value={editForm.deadline ? fmtDate(editForm.deadline) : '—'}
              colors={C}
              onPress={() => setCalOpen(true)}
              last
            />
          </View>
        )}
        {(editErrors.eventDate || editErrors.deadline || editErrors.venue || editErrors.location || editErrors.budgetMin || editErrors.budgetMax) ? (
          <Text style={em.errTxt}>{editErrors.eventDate || editErrors.deadline || editErrors.venue || editErrors.location || editErrors.budgetMin || editErrors.budgetMax}</Text>
        ) : null}
        {!isOpenEvent && hasProposals && <Text style={em.lockedNote}>{t('campaignDetail.lockedFieldNote')}</Text>}

        <Pressable
          style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 6 }]}
          onPress={() => setEditingField('description')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[sc.title, { color: C.text }]}>{t('campaignDetail.fieldDescription')}</Text>
            <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
          </View>
          <Text style={[em.pillCardBody, { color: C.textSecondary }]} numberOfLines={4}>{editForm.description || '—'}</Text>
        </Pressable>

        {isOpenEvent ? (
          <Pressable
            style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 8 }]}
            onPress={() => setEditingField('benefits')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[sc.title, { color: C.text }]}>{t('campaignDetail.sectionWhatYouGet')}</Text>
              <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
            </View>
            {editForm.benefits.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {editForm.benefits.map((b) => (
                  <View key={b} style={[em.pill, { backgroundColor: C.primaryLight }]}>
                    <Text style={[em.pillText, { color: C.brinjal1 }]}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[em.pillCardBody, { color: C.textSecondary }]}>—</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 8 }]}
              onPress={() => setEditingField('hashtags')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[sc.title, { color: C.text }]}>{t('campaignDetail.sectionHashtags')}</Text>
                <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
              </View>
              {editForm.hashtags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {editForm.hashtags.map((h) => (
                    <View key={h} style={[em.pill, { backgroundColor: C.primaryLight }]}>
                      <Text style={[em.pillText, { color: C.brinjal1 }]}>#{h}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[em.pillCardBody, { color: C.textSecondary }]}>—</Text>
              )}
            </Pressable>

            {/* People Needed — single-role campaigns are fully editable here;
                multi-role campaigns show existing roles read-only, since the
                backend only supports creating CampaignRequirement rows, not
                editing them after the campaign is created. */}
            <SectionCard title={t('createOpportunity.peopleNeededTitle')} icon="user-plus" colors={C}>
              {campaign?.requirements && campaign.requirements.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {campaign.requirements.map((r, i) => {
                    const budgetLabel = r.budgetType === 'FIXED' ? `Rs. ${(r.budgetFixed ?? 0).toLocaleString()}`
                      : r.budgetType === 'RANGE' ? `Rs. ${(r.budgetMin ?? 0).toLocaleString()} – ${(r.budgetMax ?? 0).toLocaleString()}`
                      : t('campaignDetail.negotiable');
                    return (
                      <View key={r.id} style={[em.roleRow, i < campaign.requirements!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[em.roleLabel, { color: C.text }]}>{r.category.name} ×{r.quantity}</Text>
                        <Text style={[em.roleBudget, { color: C.textSecondary }]}>{budgetLabel}</Text>
                      </View>
                    );
                  })}
                  <Text style={[em.lockedNote, { marginTop: 4, color: C.textSecondary }]}>{t('campaignDetail.rolesLockedNote')}</Text>
                </View>
              ) : (
                <Pressable style={em.singleRoleRow} onPress={() => setEditingField('people')}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[em.roleLabel, { color: C.text }]}>
                      {editForm.template ? `${editForm.template} ×${editForm.creatorsNeeded}` : editForm.creatorsNeeded}
                    </Text>
                    <Text style={[em.roleBudget, { color: C.textSecondary }]}>
                      {`Rs. ${(Number(editForm.budgetMin) || 0).toLocaleString()} – ${(Number(editForm.budgetMax) || 0).toLocaleString()}`}
                    </Text>
                  </View>
                  <View style={[em.editBtn, { backgroundColor: `${C.brinjal1}1A` }]}>
                    <FontAwesome5 name="pen" solid size={12} color={C.brinjal1} />
                  </View>
                </Pressable>
              )}
            </SectionCard>
          </>
        )}

        {/* ── Featured ── */}
        <View>
          <FeaturedToggle
            value={editForm.isFeatured}
            onChange={(v) => { if (hasProposals) return; updateEdit('isFeatured', v); }}
            // Once proposals exist, force the locked (zero-quota) visual
            // regardless of the "already featured campaigns are always
            // freely toggleable" exemption below — see hasProposals above.
            quota={hasProposals ? { remaining: 0, price: featuredQuota?.price ?? 0, unlimited: false } : (campaign?.isFeatured ? null : featuredQuota)}
            colors={C}
            t={t}
          />
          {hasProposals && <Text style={[em.lockedNote, { color: C.textSecondary, marginTop: 8 }]}>{t('campaignDetail.lockedFieldNote')}</Text>}
        </View>

      </BottomSheet>

      {/* Location picker — shared between Paid (location) and Open Event (venue). */}
      <LocationSearchModal
        visible={locationModalOpen}
        initialValue={isOpenEvent ? editForm.venue : editForm.location}
        onSelect={(address) => {
          setLocationModalOpen(false);
          if (isOpenEvent) updateEdit('venue', address);
          else updateEdit('location', address);
        }}
        onClose={() => setLocationModalOpen(false)}
      />

      {/* Tap-to-edit sheet — one shared BottomSheet, body switches on editingField. */}
      <BottomSheet
        visible={editingField !== null}
        onClose={() => setEditingField(null)}
        title={
          editingField === 'title' ? t('campaignDetail.fieldTitle')
          : editingField === 'description' ? t('campaignDetail.fieldDescription')
          : editingField === 'image' ? t('createEvent.secFeatureImageTitle')
          : editingField === 'category' ? t('campaignDetail.fieldCategory')
          : editingField === 'hashtags' ? t('campaignDetail.sectionHashtags')
          : editingField === 'people' ? t('createOpportunity.peopleNeededTitle')
          : editingField === 'capacity' ? t('campaignDetail.fieldCapacity')
          : editingField === 'benefits' ? t('campaignDetail.sectionWhatYouGet')
          : ''
        }>
        {editingField === 'title' && (
          <TextInputWithLabel
            label={t('campaignDetail.fieldTitle')}
            leftIcon="heading"
            value={editForm.title}
            onChangeText={(v) => updateEdit('title', v)}
            placeholder={t('campaignDetail.titlePlaceholder')}
            error={editErrors.title}
          />
        )}
        {editingField === 'description' && (
          <TextInputWithLabel
            label={t('campaignDetail.fieldDescription')}
            value={editForm.description}
            onChangeText={(v) => updateEdit('description', v)}
            placeholder={t('campaignDetail.descriptionPlaceholder')}
            multiline
            numberOfLines={5}
          />
        )}
        {editingField === 'image' && (
          <FeatureImagePicker
            imageUrl={editForm.featureImageUrl}
            category={campaign?.categoryKey ?? campaign?.category ?? ''}
            uploading={featureImageUploading}
            onPick={handlePickFeatureImage}
            onClear={handleClearFeatureImage}
            colors={C}
          />
        )}
        {editingField === 'category' && (
          <ChipGroup
            options={categoryOptions.map((c) => c.label)}
            value={editForm.template}
            onChange={(v) => updateEdit('template', v)}
            colors={C}
          />
        )}
        {editingField === 'hashtags' && (
          <HashtagEditor hashtags={editForm.hashtags} onChange={(v) => updateEdit('hashtags', v)} colors={C} t={t} />
        )}
        {editingField === 'people' && (
          <View style={{ gap: 8 }}>
            <Text style={[em.label, { color: C.text, marginTop: 0 }]}>{t('createEvent.secCreatorsNeededTitle')}</Text>
            <Stepper value={Number(editForm.creatorsNeeded) || 1} onChange={(v) => updateEdit('creatorsNeeded', String(v))} colors={C} />
            <Text style={[em.label, { color: C.text }]}>{t('createEvent.secBudgetTitle')}</Text>
            <BudgetTierPicker
              budgetMin={Number(editForm.budgetMin) || 0}
              budgetMax={Number(editForm.budgetMax) || 0}
              onChange={(min, max) => { updateEdit('budgetMin', String(min)); updateEdit('budgetMax', String(max)); }}
              colors={C}
              error={editErrors.budgetMin || editErrors.budgetMax}
              disabled={hasProposals}
            />
            <Text style={[em.label, { color: C.text }]}>{t('createEvent.secDeliverablesTitle')}</Text>
            <DeliverablesCounterList value={editForm.deliverables} onChange={(v) => updateEdit('deliverables', v)} colors={C} t={t} disabled={hasProposals} />
            {hasProposals && <Text style={em.lockedNote}>{t('campaignDetail.lockedFieldNote')}</Text>}
          </View>
        )}
        {editingField === 'capacity' && (
          <Stepper value={Number(editForm.capacity) || 1} onChange={(v) => updateEdit('capacity', String(v))} colors={C} />
        )}
        {editingField === 'benefits' && (
          <ChipMultiGroup options={EVENT_BENEFITS} values={editForm.benefits} onChange={(v) => updateEdit('benefits', v)} colors={C} />
        )}
      </BottomSheet>

      {/* ── Calendar modal (deadline) ── */}
      <BottomSheet
        visible={calOpen}
        onClose={() => setCalOpen(false)}
        title={isOpenEvent ? t('campaignDetail.calendarRegDeadline') : t('campaignDetail.calendarSelectDeadline')}
        maxHeightPct={0.7}>
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
      </BottomSheet>

      {/* ── Calendar modal (event date) ── */}
      <BottomSheet
        visible={eventCalOpen}
        onClose={() => setEventCalOpen(false)}
        title={t('campaignDetail.calendarEventDate')}
        maxHeightPct={0.7}>
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
      </BottomSheet>

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[s.toast, { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444' }]}
          pointerEvents="none">
          <FontAwesome5 name={toast.type === 'success' ? 'check-circle' : 'times-circle'} solid size={18} color="#fff" style={{ marginRight: 8 }} />
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
  goBackBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  goBackBtnTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, textAlign: 'center' },

  scroll: { paddingBottom: 20 },

  hero:         { height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroImgOverlay: { backgroundColor: 'rgba(0,0,0,0.28)' },
  heroBadge:    { position: 'absolute', top: 14, left: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  heroNewBadge: { position: 'absolute', top: 14, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  heroBadgeTxt: { fontSize: 10, color: '#fff', letterSpacing: 0.5, fontFamily: F.bold },
  heroPosted:    { position: 'absolute', bottom: 12, left: 16, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  heroPostedTxt: { fontSize: 11, color: '#fff', fontFamily: F.medium },
  heroTypeBadge: { position: 'absolute', bottom: 12, right: 14, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  heroTypeTxt:   { fontSize: 11, fontFamily: F.bold },

  titleBlock:    { paddingHorizontal: SCREEN_GUTTER, paddingVertical: 16, gap: 10, borderBottomWidth: 1 },
  brandRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandAvatar:   { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  brandAvatarTxt:{ fontSize: 12, color: '#fff', fontFamily: F.bold },
  brandName:     { fontSize: 14, fontFamily: F.semibold },
  verifiedBadge: { width: 16, height: 16, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  campaignTitle: { fontSize: 18, lineHeight: 24, fontFamily: F.bold },
  budgetRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budget:        { fontSize: 16, fontFamily: F.bold },
  typeBadge:     { borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  typeBadgeText: { fontSize: 12, fontFamily: F.bold },
  proposalsBadge:{ borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  proposalsTxt:  { fontSize: 12, fontFamily: F.semibold },

  // marginHorizontal matches titleBlock/ctaBar's own 20px inset (SCREEN_GUTTER)
  // below — this used to be a stray 16, so card content sat 4px narrower than
  // the title/CTA above and below it instead of lining up on the same edge.
  card:        { marginHorizontal: SCREEN_GUTTER, marginTop: 12, borderRadius: RADIUS.lg, padding: 16, gap: 12, ...SHADOW.card },
  sectionLabel:{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: F.bold },
  templateRow: { flexDirection: 'row' },
  templateBadge:{ borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  templateTxt: { fontSize: 13, fontFamily: F.bold },
  aiAlsoRelevant: { fontSize: 11, fontFamily: F.regular, marginTop: 6 },
  goalChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip:    { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  goalChipTxt: { fontSize: 12, fontFamily: F.semibold },
  detailsGrid: { gap: 10 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon:  { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  detailContent:{ flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: F.medium },
  detailValue: { fontSize: 14, marginTop: 1, fontFamily: F.semibold },
  description: { fontSize: 15, lineHeight: 22, fontFamily: F.regular },
  reqItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4 },
  reqDot:      { width: 6, height: 6, borderRadius: RADIUS.full, marginTop: 7, flexShrink: 0 },
  reqText:     { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.regular },

  benefitsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  benefitChipTxt:{ fontSize: 13, fontFamily: F.semibold },

  ctaBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12, gap: 16 },
  // Multi-role campaigns need extra vertical room for the "Roles Needed"
  // label + horizontally-scrolling role chips, unlike every other branch's
  // single-line button.
  ctaBarRoles:   { paddingVertical: 10 },
  ctaInfo:       { flex: 1 },
  ctaBudget:     { fontSize: 18, fontFamily: F.bold },
  ctaLabel:      { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  applyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.md, paddingHorizontal: 22, paddingVertical: 15, ...SHADOW.raised },
  applyBtnTxt:   { color: '#fff', fontSize: 15, fontFamily: F.bold },
  appliedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5, borderColor: '#A7F3D0' },
  appliedBadgeTxt:{ fontSize: 15, color: '#059669', fontFamily: F.bold },
  roleIconWrap:  { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  roleTitle:     { fontSize: 14, fontFamily: F.bold },
  roleAppliedBadge: { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' },
  roleFullTxt:   { fontSize: 12, fontFamily: F.medium },
  roleApplyBtnTxt: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  // Sticky-footer role chips — compact horizontal-scroll variant of the old
  // full-width role cards, sized to fit the CTA bar's limited height.
  roleChipRow:      { flexDirection: 'row', gap: 8 },
  roleChip:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, minWidth: 180 },
  roleChipTitle:     { fontSize: 13, fontFamily: F.bold },
  roleChipSub:       { fontSize: 11, fontFamily: F.regular },
  roleChipApplyBtn:  { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 'auto' },

  invitedCard:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: '#6EE7B7' },
  invitedIconWrap:  { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  invitedTextBlock: { flex: 1, gap: 2 },
  invitedTitle:     { fontSize: 15, color: '#065F46', fontFamily: F.bold },
  invitedSub:       { fontSize: 12, color: '#047857', fontFamily: F.regular, lineHeight: 17 },

  toast:    { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', ...SHADOW.floating },
  toastTxt: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },
});

const em = StyleSheet.create({
  bodyContent: { gap: 12 },

  sectionHdr: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, marginBottom: 12, fontFamily: F.bold },
  lockedNote: { fontSize: 11, marginTop: -8, marginBottom: 10, fontFamily: F.regular },
  label:      { fontSize: 13, marginBottom: 8, fontFamily: F.semibold },
  optional:   { fontSize: 12, fontFamily: F.regular },
  errTxt:     { fontSize: 12, color: ERROR_RED, marginTop: 4, fontFamily: F.regular },

  remoteCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14 },
  remoteTextWrap: { flex: 1, gap: 3 },
  remoteTitle:    { fontSize: 14, fontFamily: F.semibold },
  remoteBody:     { fontSize: 13, lineHeight: 18, fontFamily: F.regular },

  budgetRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  budgetDash:     { marginHorizontal: 10, marginTop: 14, fontSize: 16 },
  currencyWrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 12, height: 50, gap: 4 },
  currencySymbol: { fontSize: 16, fontFamily: F.semibold },
  currencyInput:  { flex: 1, fontSize: 15, fontFamily: F.regular },

  dateTrigger: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50, gap: 8 },
  dateTxt:     { flex: 1, fontSize: 15, fontFamily: F.regular },

  selectedBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  selectedTxt:   { fontSize: 13, fontFamily: F.bold },

  saveBtn:    { borderRadius: RADIUS.md, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },

  pillCardBody: { fontSize: 13, lineHeight: 18, fontFamily: F.regular },
  pill:         { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  pillText:     { fontSize: 12, fontFamily: F.semibold },

  roleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  roleLabel:  { fontSize: 14, fontFamily: F.semibold },
  roleBudget: { fontSize: 12, fontFamily: F.regular },

  singleRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn:       { width: 28, height: 28, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
});
