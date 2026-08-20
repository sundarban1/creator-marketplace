import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { useRef, useState, useEffect } from 'react';
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
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { FeatureImagePicker } from '@/features/creator/components/FeatureImagePicker';
import { useCategories } from '@/hooks/useCategories';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F, RADIUS, SCREEN_GUTTER, SHADOW } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';
import {
  DELIVERABLE_TYPES, DEFAULT_DELIVERABLES, summarizeDeliverables, completionLabel,
} from '@/features/business/constants/campaignForm';
import {
  SectionCard, ChipGroup, ChipMultiGroup, BudgetTierPicker, Stepper,
  DeliverablesCounterList, HashtagEditor, FeaturedToggle, CompletionTypePicker, sc,
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

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
// Full addresses from the place picker are long, comma-separated strings —
// the Location preview row is a single-line right-aligned summary, not a
// place to show the whole thing, so just show the first segment there. The
// full address is still what's saved and what the location picker reopens with.
function firstAddressPart(address: string) { return address.split(',')[0]?.trim() || address; }

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
  // Whether the provider completes the job in person (SERVICE — a DJ, an MC)
  // or by submitting a digital output for review (DELIVERABLE). Null on
  // campaigns created before this field existed. Locked once proposals exist.
  completionType: 'SERVICE' | 'DELIVERABLE' | null;
  // OPEN_EVENT fields
  eventDate: Date | null;
  venue: string;
  capacity: string;
  benefits: string[];
};

type EditErrors = Partial<Record<keyof EditForm, string>>;

// ─── Screen ───────────────────────────────────────────────────────────────────

// A real modal-presented route (registered with presentation: 'modal' in
// _layout.tsx), navigated to from campaign-detail's "Edit event" button —
// same slide-up presentation as create-campaign/create-invitation, instead
// of stacking a second BottomSheet Modal on top of a "Edit event" Modal
// (that nesting was unreliable on this app's Android/Fabric setup and could
// leave the sheet appearing stuck).
export default function EditCampaignScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const { categories: liveCategories } = useCategories('BUSINESS');
  const categoryOptions = liveCategories.map((c) => ({ label: c.name, icon: c.icon, color: c.color }));

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [calOpen, setCalOpen] = useState(false);
  const [eventCalOpen, setEventCalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  // Which field's small tap-to-edit BottomSheet is open — null means none.
  // Location/Venue use LocationSearchModal above instead; Deadline/Event Date
  // use the existing calOpen/eventCalOpen sheets below — same split as
  // create-campaign.tsx's Publish screen.
  const [editingField, setEditingField] = useState<'title' | 'description' | 'image' | 'category' | 'hashtags' | 'people' | 'budget' | 'capacity' | 'benefits' | 'completionType' | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', description: '', featureImageUrl: null, template: '',
    deliverables: DEFAULT_DELIVERABLES, hashtags: [], creatorsNeeded: '1', completionType: null,
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
  const isOpenEvent = campaign?.campaignType === 'OPEN_EVENT';

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

  useEffect(() => {
    if (!campaignId) { Promise.resolve().then(() => setLoading(false)); return; }
    campaignService.getById(campaignId)
      .then((c) => {
        setCampaign(c);
        setEditForm({
          title:        c.title,
          description:  c.description ?? '',
          featureImageUrl: c.featureImageUrl ?? null,
          template:     c.template ?? '',
          deliverables:    parseDeliverablesString(c.deliverables ?? ''),
          hashtags:        c.hashtags ?? [],
          creatorsNeeded:  String(c.creatorsNeeded ?? 1),
          status:       c.status ?? 'active',
          budgetMin:    String(c.budgetRaw ?? ''),
          budgetMax:    String(c.budgetMax ?? ''),
          deadline:     c.deadline ? new Date(c.deadline) : null,
          location:     c.location ?? '',
          locationType: c.locationType ?? 'ONSITE',
          isFeatured:   c.isFeatured,
          completionType: c.completionType ?? null,
          eventDate:    c.eventDate ? new Date(c.eventDate) : null,
          venue:        c.venue ?? '',
          capacity:     String(c.capacity ?? 20),
          benefits:     c.benefits ?? [],
        });
        if (!c.isFeatured) {
          campaignService.getFeaturedQuota().then(setFeaturedQuota).catch(() => {});
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load event'))
      .finally(() => setLoading(false));
    // languageVersion re-derives label-dependent parsing (parseDeliverablesString)
    // if the user switches language mid-edit — same dependency campaign-detail uses.
  }, [campaignId, languageVersion]);

  function updateEdit<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    if (editErrors[key]) setEditErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

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

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(business)/');
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
          ...(hasProposals ? {} : {
            isFeatured: editForm.isFeatured,
            ...(editForm.completionType ? { completionType: editForm.completionType } : {}),
          }),
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
            ...(editForm.completionType ? { completionType: editForm.completionType } : {}),
          }),
        });
      }
      // The update itself is done at this point. Confirm success right away
      // and dismiss shortly after — campaign-detail silently refetches on
      // refocus, so there's nothing further this screen needs to do.
      showToast(t('campaignDetail.toastUpdated'));
      setTimeout(goBack, 700);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('campaignDetail.toastFailed'), 'error');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <BackButton onPress={goBack} />
          <Text style={[s.headerTitle, { color: C.text }]}>{t('campaignDetail.editEvent')}</Text>
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
          <Pressable style={[s.goBackBtn, { backgroundColor: C.brinjal1 }]} onPress={goBack}>
            <Text style={s.goBackBtnTxt}>{t('campaignDetail.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton onPress={goBack} />
        <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{t('campaignDetail.editEvent')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        <ListingHeroCard
          featureImageUrl={editForm.featureImageUrl}
          title={editForm.title.trim() || t('campaignDetail.titlePlaceholder')}
          category={editForm.template || undefined}
          colors={C}
          onEditPress={() => setEditingField('title')}
          onImagePress={() => setEditingField('image')}
        />
        {editErrors.title ? <Text style={s.errTxt}>{editErrors.title}</Text> : null}

        <Pressable
          style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 6 }]}
          onPress={() => setEditingField('description')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[sc.title, { color: C.text }]}>{t('campaignDetail.fieldDescription')}</Text>
            <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
          </View>
          <Text style={[s.pillCardBody, { color: C.textSecondary }]} numberOfLines={4}>{editForm.description || '—'}</Text>
        </Pressable>

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
            {/* Fixed for every free event — attend and post about it — so
                there is nothing to choose or edit here, unlike the paid
                campaign's Service/Deliverable classification below. */}
            <PreviewRow
              icon="share-alt"
              label={t('createOpportunity.completionLabel')}
              value={t('campaignDetail.freeCompletionTitle')}
              colors={C}
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
              value={editForm.locationType === 'REMOTE' ? t('createEvent.locationRemote') : (editForm.location ? firstAddressPart(editForm.location) : '—')}
              colors={C}
              onPress={hasProposals || editForm.locationType === 'REMOTE' ? undefined : () => setLocationModalOpen(true)}
            />
            <PreviewRow
              icon="money-bill-alt"
              label={t('createEvent.confirmSectionBudget')}
              value={`Rs. ${(Number(editForm.budgetMin) || 0).toLocaleString()} – ${(Number(editForm.budgetMax) || 0).toLocaleString()}`}
              colors={C}
              // Multi-role campaigns show this as an aggregate across
              // per-role budgets (locked, same as the roles list below) —
              // only single-role campaigns without proposals can edit it here.
              onPress={hasProposals || (campaign.requirements && campaign.requirements.length > 0) ? undefined : () => setEditingField('budget')}
            />
            <PreviewRow
              icon={editForm.completionType === 'SERVICE' ? 'handshake' : 'cloud-upload-alt'}
              label={t('createOpportunity.completionLabel')}
              value={completionLabel(editForm.completionType, t)?.label ?? '—'}
              colors={C}
              // Same lock as budget/location: changing this after providers
              // have applied would move the goalposts on what they signed up
              // to hand over, so the backend rejects it once proposals exist.
              onPress={hasProposals ? undefined : () => setEditingField('completionType')}
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
          <Text style={s.errTxt}>{editErrors.eventDate || editErrors.deadline || editErrors.venue || editErrors.location || editErrors.budgetMin || editErrors.budgetMax}</Text>
        ) : null}
        {!isOpenEvent && hasProposals && <Text style={s.lockedNote}>{t('campaignDetail.lockedFieldNote')}</Text>}

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
                  <View key={b} style={[s.pill, { backgroundColor: C.primaryLight }]}>
                    <Text style={[s.pillText, { color: C.brinjal1 }]}>{b}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[s.pillCardBody, { color: C.textSecondary }]}>—</Text>
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
                    <View key={h} style={[s.pill, { backgroundColor: C.primaryLight }]}>
                      <Text style={[s.pillText, { color: C.brinjal1 }]}>#{h}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[s.pillCardBody, { color: C.textSecondary }]}>—</Text>
              )}
            </Pressable>

            {/* People Needed — single-role campaigns are fully editable here;
                multi-role campaigns show existing roles read-only, since the
                backend only supports creating CampaignRequirement rows, not
                editing them after the campaign is created. */}
            <SectionCard title={t('createOpportunity.peopleNeededTitle')} icon="user-plus" colors={C}>
              {campaign.requirements && campaign.requirements.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {campaign.requirements.map((r, i) => {
                    const budgetLabel = r.budgetType === 'FIXED' ? `Rs. ${(r.budgetFixed ?? 0).toLocaleString()}`
                      : r.budgetType === 'RANGE' ? `Rs. ${(r.budgetMin ?? 0).toLocaleString()} – ${(r.budgetMax ?? 0).toLocaleString()}`
                      : t('campaignDetail.negotiable');
                    return (
                      <View key={r.id} style={[s.roleRow, i < campaign.requirements!.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[s.roleLabel, { color: C.text }]}>{r.category.name} ×{r.quantity}</Text>
                        <Text style={[s.roleBudget, { color: C.textSecondary }]}>{budgetLabel}</Text>
                      </View>
                    );
                  })}
                  <Text style={[s.lockedNote, { marginTop: 4, color: C.textSecondary }]}>{t('campaignDetail.rolesLockedNote')}</Text>
                </View>
              ) : (
                <Pressable style={s.singleRoleRow} onPress={() => setEditingField('people')}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[s.roleLabel, { color: C.text }]}>
                      {editForm.template ? `${editForm.template} ×${editForm.creatorsNeeded}` : editForm.creatorsNeeded}
                    </Text>
                    <Text style={[s.roleBudget, { color: C.textSecondary }]}>
                      {`Rs. ${(Number(editForm.budgetMin) || 0).toLocaleString()} – ${(Number(editForm.budgetMax) || 0).toLocaleString()}`}
                    </Text>
                  </View>
                  <View style={[s.editBtn, { backgroundColor: `${C.brinjal1}1A` }]}>
                    <FontAwesome5 name="pen" solid size={12} color={C.brinjal1} />
                  </View>
                </Pressable>
              )}
            </SectionCard>
          </>
        )}

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

        {/* ── Featured ── */}
        <View>
          <FeaturedToggle
            value={editForm.isFeatured}
            onChange={(v) => { if (hasProposals) return; updateEdit('isFeatured', v); }}
            // Once proposals exist, force the locked (zero-quota) visual
            // regardless of the "already featured campaigns are always
            // freely toggleable" exemption below — see hasProposals above.
            quota={hasProposals ? { remaining: 0, price: featuredQuota?.price ?? 0, unlimited: false } : (campaign.isFeatured ? null : featuredQuota)}
            colors={C}
            t={t}
          />
          {hasProposals && <Text style={[s.lockedNote, { color: C.textSecondary, marginTop: 8 }]}>{t('campaignDetail.lockedFieldNote')}</Text>}
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.saveBtn, { backgroundColor: saving ? C.border : C.brinjal1 }, pressed && !saving && { opacity: 0.88 }]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={s.saveBtnTxt}>{saving ? t('campaignDetail.saving') : t('campaignDetail.saveChanges')}</Text>
        </Pressable>
      </View>
      </MaxWidthContainer>

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
          : editingField === 'budget' ? t('createEvent.confirmSectionBudget')
          : editingField === 'completionType' ? t('createOpportunity.completionLabel')
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
            category={campaign.categoryKey ?? campaign.category ?? ''}
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
            <Text style={[s.label, { color: C.text, marginTop: 0 }]}>{t('createEvent.secCreatorsNeededTitle')}</Text>
            <Stepper value={Number(editForm.creatorsNeeded) || 1} onChange={(v) => updateEdit('creatorsNeeded', String(v))} colors={C} />
            <Text style={[s.label, { color: C.text }]}>{t('createEvent.secBudgetTitle')}</Text>
            <BudgetTierPicker
              budgetMin={Number(editForm.budgetMin) || 0}
              budgetMax={Number(editForm.budgetMax) || 0}
              onChange={(min, max) => { updateEdit('budgetMin', String(min)); updateEdit('budgetMax', String(max)); }}
              colors={C}
              error={editErrors.budgetMin || editErrors.budgetMax}
              disabled={hasProposals}
            />
            <Text style={[s.label, { color: C.text }]}>{t('createEvent.secDeliverablesTitle')}</Text>
            <DeliverablesCounterList value={editForm.deliverables} onChange={(v) => updateEdit('deliverables', v)} colors={C} t={t} disabled={hasProposals} />
            {hasProposals && <Text style={s.lockedNote}>{t('campaignDetail.lockedFieldNote')}</Text>}
          </View>
        )}
        {editingField === 'budget' && (
          <BudgetTierPicker
            budgetMin={Number(editForm.budgetMin) || 0}
            budgetMax={Number(editForm.budgetMax) || 0}
            onChange={(min, max) => { updateEdit('budgetMin', String(min)); updateEdit('budgetMax', String(max)); }}
            colors={C}
            error={editErrors.budgetMin || editErrors.budgetMax}
          />
        )}
        {editingField === 'completionType' && (
          <View style={{ gap: 10 }}>
            <CompletionTypePicker
              value={editForm.completionType}
              reason=""
              onChange={(v) => updateEdit('completionType', v)}
              colors={C}
              t={t}
            />
            {hasProposals && <Text style={s.lockedNote}>{t('campaignDetail.lockedFieldNote')}</Text>}
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
          <View style={[s.selectedBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[s.selectedTxt, { color: C.brinjal1 }]}>{t('campaignDetail.calendarSelected', { date: fmtDate(editForm.deadline) })}</Text>
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
          <View style={[s.selectedBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[s.selectedTxt, { color: C.brinjal1 }]}>{t('campaignDetail.calendarSelected', { date: fmtDate(editForm.eventDate) })}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const s = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  goBackBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  goBackBtnTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, textAlign: 'center' },

  bodyContent: { padding: SCREEN_GUTTER, gap: 12, paddingBottom: 20 },

  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12 },

  lockedNote: { fontSize: 11, marginTop: -8, marginBottom: 10, fontFamily: F.regular },
  label:      { fontSize: 13, marginBottom: 8, fontFamily: F.semibold },
  errTxt:     { fontSize: 12, color: ERROR_RED, marginTop: 4, fontFamily: F.regular },

  selectedBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  selectedTxt:   { fontSize: 13, fontFamily: F.bold },

  saveBtn:    { flex: 1, borderRadius: RADIUS.md, height: 54, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },

  pillCardBody: { fontSize: 13, lineHeight: 18, fontFamily: F.regular },
  pill:         { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  pillText:     { fontSize: 12, fontFamily: F.semibold },

  roleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  roleLabel:  { fontSize: 14, fontFamily: F.semibold },
  roleBudget: { fontSize: 12, fontFamily: F.regular },

  singleRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn:       { width: 28, height: 28, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },

  toast:    { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', ...SHADOW.floating },
  toastTxt: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },
});
