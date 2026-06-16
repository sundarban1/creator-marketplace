import { router, useLocalSearchParams } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { creatorService } from '@/services/creator';
import { API_BASE, request } from '@/lib/api';
import { RangeSlider } from '@/components/RangeSlider';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { COLORS } from '@/utilities/constants';

type ColorsType = typeof COLORS;
const ColorCtx = createContext<ColorsType>(COLORS);

// ── Static config ─────────────────────────────────────────────

const ALL_SOCIAL_PLATFORMS: { id: string; label: string; icon: string; color: string; followersLabel: string }[] = [
  { id: 'instagram', label: 'Instagram',  icon: '📸', color: '#E1306C', followersLabel: 'Followers' },
  { id: 'tiktok',    label: 'TikTok',     icon: '🎵', color: '#010101', followersLabel: 'Followers' },
  { id: 'youtube',   label: 'YouTube',    icon: '▶️', color: '#FF0000', followersLabel: 'Subscribers' },
  { id: 'facebook',  label: 'Facebook',   icon: '💬', color: '#1877F2', followersLabel: 'Followers' },
  { id: 'twitter',   label: 'X (Twitter)', icon: '🐦', color: '#1DA1F2', followersLabel: 'Followers' },
  { id: 'linkedin',  label: 'LinkedIn',   icon: '💼', color: '#0A66C2', followersLabel: 'Connections' },
  { id: 'pinterest', label: 'Pinterest',  icon: '📌', color: '#E60023', followersLabel: 'Followers' },
  { id: 'snapchat',  label: 'Snapchat',   icon: '👻', color: '#FFFC00', followersLabel: 'Friends' },
  { id: 'twitch',    label: 'Twitch',     icon: '🎮', color: '#9146FF', followersLabel: 'Followers' },
];

const PLATFORM_CONFIG: Record<string, { icon: string; label: string; color: string; followersLabel: string }> =
  Object.fromEntries(ALL_SOCIAL_PLATFORMS.map((p) => [p.id, p]));

const PORTFOLIO_TYPES: { id: string; label: string; icon: string; color: string; urlHint: string }[] = [
  { id: 'instagram', label: 'Instagram',  icon: '📸', color: '#E1306C', urlHint: 'https://instagram.com/p/...' },
  { id: 'tiktok',    label: 'TikTok',     icon: '🎵', color: '#010101', urlHint: 'https://tiktok.com/@user/video/...' },
  { id: 'youtube',   label: 'YouTube',    icon: '▶️', color: '#FF0000', urlHint: 'https://youtube.com/watch?v=...' },
  { id: 'facebook',  label: 'Facebook',   icon: '💬', color: '#1877F2', urlHint: 'https://facebook.com/...' },
  { id: 'twitter',   label: 'X / Twitter', icon: '🐦', color: '#1DA1F2', urlHint: 'https://x.com/user/status/...' },
  { id: 'blog',      label: 'Blog Post',  icon: '📝', color: '#F59E0B', urlHint: 'https://yourblog.com/post-title' },
  { id: 'website',   label: 'Website',    icon: '🌐', color: '#6366F1', urlHint: 'https://yourwebsite.com' },
  { id: 'photo',     label: 'Photography', icon: '📷', color: '#10B981', urlHint: 'https://...' },
  { id: 'video',     label: 'Other Video', icon: '🎬', color: '#EF4444', urlHint: 'https://...' },
];

const PORTFOLIO_CONFIG: Record<string, typeof PORTFOLIO_TYPES[0]> =
  Object.fromEntries(PORTFOLIO_TYPES.map((p) => [p.id, p]));

const PLATFORM_URL_PREFIX: Record<string, string> = {
  instagram: 'https://instagram.com/',
  tiktok:    'https://tiktok.com/@',
  youtube:   'https://youtube.com/@',
  facebook:  'https://facebook.com/',
  twitter:   'https://x.com/',
  linkedin:  'https://linkedin.com/in/',
  pinterest: 'https://pinterest.com/',
  snapchat:  'https://snapchat.com/add/',
  twitch:    'https://twitch.tv/',
};

const CAT_OPTIONS = [
  'Food', 'Travel', 'Fashion', 'Beauty', 'Fitness', 'Gaming', 'Tech', 'Education',
  'Lifestyle', 'Home & Living', 'Wellness', 'Music', 'Art & Design', 'Pets',
  'Parenting', 'Automotive', 'Finance', 'Sustainability', 'Photography', 'Sports',
  'Film & TV', 'Mindfulness', 'Food & Drink', 'Entertainment',
];
const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const MAX_PREF_LOCS = 3;

type PlacePrediction = {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

const PAYMENT_METHODS = [
  { id: 'esewa',   icon: '💚', label: 'eSewa',   color: '#60BB46' },
  { id: 'khalti',  icon: '💜', label: 'Khalti',  color: '#5C2D91' },
  { id: 'fonepay', icon: '🔷', label: 'FonePay', color: '#003087' },
] as const;

const LANGUAGE_OPTIONS = [
  { label: 'English', native: 'English', flag: '🇬🇧', desc: 'Default app language', future: false },
  { label: 'Nepali',  native: 'नेपाली',  flag: '🇳🇵', desc: 'स्थानीय भाषा समर्थन', future: false },
  { label: 'Hindi',   native: 'हिंदी',   flag: '🇮🇳', desc: 'Coming soon',         future: true  },
];

const SECTION_TITLES: Record<string, string> = {
  social: 'Social Accounts',
  campaigns: 'Campaign Preferences',
  earnings: 'Earnings & Payments',
  'past-work': 'Past Work',
  security: 'Security',
  support: 'Support',
  legal: 'Legal',
};

const SUB_PAGE_TITLES: Record<string, string> = {
  'change-password':  'Change Password',
  'help-center':      'Help Center',
  'contact-support':  'Contact Support',
  'report-issue':     'Report Issue',
  'faqs':             'FAQs',
  'privacy-policy':   'Privacy Policy',
  'terms':            'Terms & Conditions',
  'guidelines':       'Community Guidelines',
};

function fmt(n: string): string {
  const v = parseInt(n, 10);
  if (isNaN(v)) return n;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toString();
}

// ── Themed helpers ────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const C = useContext(ColorCtx);
  return <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{title.toUpperCase()}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  const C = useContext(ColorCtx);
  return <View style={[styles.card, { backgroundColor: C.surface }]}>{children}</View>;
}

function SubLabel({ title }: { title: string }) {
  const C = useContext(ColorCtx);
  return <Text style={[styles.subLabel, { color: C.textSecondary }]}>{title}</Text>;
}

function Divider() {
  const C = useContext(ColorCtx);
  return <View style={[styles.subDivider, { backgroundColor: C.border }]} />;
}

type SwitchRowProps = { label: string; icon?: string; value: boolean; onChange: () => void; isLast?: boolean };
function SwitchRow({ label, icon, value, onChange, isLast = false }: SwitchRowProps) {
  const C = useContext(ColorCtx);
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      {icon ? <Text style={styles.rowIcon}>{icon}</Text> : null}
      <Text style={[styles.rowLabel, { color: C.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.brinjal1 + '70' }}
        thumbColor={value ? C.brinjal1 : '#ccc'}
        ios_backgroundColor={C.border}
      />
    </View>
  );
}

type NavRowProps = { icon?: string; label: string; value?: string; onPress: () => void; danger?: boolean; isLast?: boolean };
function NavRow({ icon, label, value, onPress, danger = false, isLast = false }: NavRowProps) {
  const C = useContext(ColorCtx);
  return (
    <Pressable style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]} onPress={onPress}>
      {icon ? <Text style={styles.rowIcon}>{icon}</Text> : null}
      <Text style={[styles.rowLabel, { color: danger ? C.error : C.text }]}>{label}</Text>
      <View style={styles.navRight}>
        {value ? <Text style={[styles.navValue, { color: C.textSecondary }]}>{value}</Text> : null}
        <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

type ChipGroupProps = { options: string[]; selected: string[]; onToggle: (v: string) => void };
function ChipGroup({ options, selected, onToggle }: ChipGroupProps) {
  const C = useContext(ColorCtx);
  return (
    <View style={styles.chipGroup}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            style={[
              styles.chip,
              { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface },
            ]}
            onPress={() => onToggle(opt)}>
            <Text style={[styles.chipText, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '500' }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── PrefLocationPicker ────────────────────────────────────────

function PrefLocationPicker({
  locations,
  onChange,
}: {
  locations: string[];
  onChange: (locs: string[]) => void;
}) {
  const C = useAppColors();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remoteSelected = locations.includes('Remote');
  const nonRemote = locations.filter((l) => l !== 'Remote');
  const atMax = locations.length >= MAX_PREF_LOCS;

  function toggleRemote() {
    if (remoteSelected) {
      onChange(locations.filter((l) => l !== 'Remote'));
    } else if (!atMax) {
      onChange([...locations, 'Remote']);
    }
  }

  function remove(label: string) {
    onChange(locations.filter((l) => l !== label));
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
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&types=(cities)`;
      const res = await fetch(url);
      const data = (await res.json()) as { predictions: PlacePrediction[]; status: string };
      setPredictions(data.status === 'OK' ? data.predictions : []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectPrediction(pred: PlacePrediction) {
    const label = pred.structured_formatting.main_text;
    if (locations.includes(label)) return;
    setQuery('');
    setPredictions([]);
    onChange([...locations, label]);
  }

  return (
    <View style={pl.container}>
      {/* Remote — standalone toggle chip */}
      <Pressable
        style={[
          pl.remoteChip,
          { borderColor: remoteSelected ? C.brinjal1 : C.border, backgroundColor: remoteSelected ? C.primaryLight : C.surface },
          !remoteSelected && atMax && { opacity: 0.35 },
        ]}
        onPress={toggleRemote}
        disabled={!remoteSelected && atMax}>
        <Text style={pl.remoteEmoji}>🌐</Text>
        <Text style={[pl.remoteText, { color: remoteSelected ? C.brinjal1 : C.text, fontWeight: remoteSelected ? '700' : '500' }]}>
          Remote
        </Text>
        {remoteSelected && <Text style={[pl.removeX, { color: C.brinjal1 }]}>✕</Text>}
      </Pressable>

      {/* Selected city chips */}
      {nonRemote.length > 0 && (
        <View style={pl.selectedRow}>
          {nonRemote.map((loc) => (
            <View key={loc} style={[pl.selectedChip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <Text style={[pl.selectedText, { color: C.brinjal1 }]}>📍 {loc}</Text>
              <Pressable onPress={() => remove(loc)} hitSlop={8}>
                <Text style={[pl.removeX, { color: C.brinjal1 }]}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Search input — hidden when 3 locations reached */}
      {!atMax && (
        <>
          <View style={[pl.searchRow, { borderColor: C.border, backgroundColor: C.background }]}>
            <Text style={pl.searchIcon}>🔍</Text>
            <TextInput
              style={[pl.searchInput, { color: C.text }]}
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
                  <Text style={{ color: C.textSecondary, fontSize: 15 }}>✕</Text>
                </Pressable>
              : null}
          </View>

          {predictions.length > 0 && (
            <View style={[pl.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
              {predictions.slice(0, 5).map((pred, idx) => (
                <Pressable
                  key={pred.place_id}
                  style={[pl.dropRow, { borderBottomColor: idx < Math.min(predictions.length, 5) - 1 ? C.border : 'transparent' }]}
                  onPress={() => handleSelectPrediction(pred)}>
                  <Text style={pl.dropPin}>📍</Text>
                  <View style={pl.dropTexts}>
                    <Text style={[pl.dropMain, { color: C.text }]}>{pred.structured_formatting.main_text}</Text>
                    <Text style={[pl.dropSec, { color: C.textSecondary }]} numberOfLines={1}>
                      {pred.structured_formatting.secondary_text}
                    </Text>
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

const pl = StyleSheet.create({
  container:    { gap: 10 },
  remoteChip:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
  remoteEmoji:  { fontSize: 14 },
  remoteText:   { fontSize: 13 },
  removeX:      { fontSize: 12, fontWeight: '700' },
  selectedRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  selectedText: { fontSize: 13, fontWeight: '600' },
  searchRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:   { fontSize: 15 },
  searchInput:  { flex: 1, fontSize: 14 },
  dropdown:     { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  dropRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  dropPin:      { fontSize: 16 },
  dropTexts:    { flex: 1 },
  dropMain:     { fontSize: 14, fontWeight: '600' },
  dropSec:      { fontSize: 12, marginTop: 1 },
});

// ── Main screen ───────────────────────────────────────────────

export default function CreatorSettingsScreen() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useIsDark();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const C: ColorsType = useAppColors();
  const toast = useToast();

  const [subPage, setSubPage] = useState<string | null>(null);

  // Social accounts state (API-driven)
  type SocialAccount = { id: string; platform: string; profileUrl: string; followers: number };
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [socialForm, setSocialForm] = useState({ platform: '', profileUrl: '', followers: '' });
  const [socialFormErrors, setSocialFormErrors] = useState<Record<string, string>>({});
  const socialSheetAnim = useRef(new Animated.Value(0)).current;

  // Portfolio (in Social section)
  type PortfolioItem = { id: string; label: string; url: string };
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [showPortfolioSheet, setShowPortfolioSheet] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({ type: '', url: '' });
  const [portfolioFormErrors, setPortfolioFormErrors] = useState<Record<string, string>>({});
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const portfolioSheetAnim = useRef(new Animated.Value(0)).current;

  // Campaign preferences
  const [prefCats, setPrefCats] = useState<string[]>([]);
  const [prefPlatforms, setPrefPlatforms] = useState<string[]>([]);
  const [prefLocations, setPrefLocations] = useState<string[]>([]);
  const [prefPriceMin, setPrefPriceMin] = useState(0);
  const [prefPriceMax, setPrefPriceMax] = useState(500);
  const prefSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Earnings / payment
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<{ totalEarned: number; pendingEarnings: number; totalApplications: number } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const paymentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Help Center
  const [helpArticles, setHelpArticles] = useState<{ id: string; question: string; answer: string; category: string }[]>([]);
  const [helpLoading, setHelpLoading] = useState(false);

  // FAQs
  const [faqArticles, setFaqArticles] = useState<{ id: string; question: string; answer: string; category: string }[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);

  // Legal sections (keyed by type slug)
  type LegalSectionItem = { id: string; title: string; body: string; icon?: string | null; order: number };
  const [legalSections, setLegalSections] = useState<Record<string, LegalSectionItem[]>>({});
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalLastUpdated, setLegalLastUpdated] = useState<Record<string, string>>({});

  // Account action modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal,     setShowDeleteModal]     = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  // Support / Report submitting
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Language
  const [selectedLang, setSelectedLang] = useState('English');

  // Change password
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSubmitted, setPwSubmitted] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Support forms
  const [supportTopic, setSupportTopic] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  // Toast

  // Load profile from API on mount
  useEffect(() => {
    creatorService.getSocialAccounts().then((accounts) => {
      setSocialAccounts(accounts.map((a) => ({ id: a.id, platform: a.platform, profileUrl: a.profileUrl, followers: a.followers })));
    }).catch(() => {});
    creatorService.getProfile().then((profile) => {
      if (profile.portfolioLinks?.length) {
        setPortfolio(profile.portfolioLinks.map((l) => ({ id: l.id, label: l.label, url: l.url })));
      }
      if (profile.paymentMethods?.length) setPaymentMethods(profile.paymentMethods);
      if (profile.categories?.length)     setPrefCats(profile.categories);
      if (profile.prefPlatforms?.length)  setPrefPlatforms(profile.prefPlatforms);
      if (profile.prefLocations?.length)  setPrefLocations(profile.prefLocations);
      if (profile.prefBudgetMin != null)  setPrefPriceMin(profile.prefBudgetMin);
      if (profile.prefBudgetMax != null)  setPrefPriceMax(profile.prefBudgetMax);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (section !== 'earnings' || earningsSummary !== null) return;
    setEarningsLoading(true);
    creatorService.getEarnings().then((data) => {
      setEarningsSummary(data);
    }).catch(() => {}).finally(() => setEarningsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (subPage !== 'help-center' || helpArticles.length > 0) return;
    setHelpLoading(true);
    fetch(`${API_BASE}/api/help`)
      .then((r) => r.json() as Promise<{ data: typeof helpArticles }>)
      .then((json) => setHelpArticles(json.data ?? []))
      .catch(() => {})
      .finally(() => setHelpLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPage]);

  useEffect(() => {
    if (subPage !== 'faqs' || faqArticles.length > 0) return;
    setFaqLoading(true);
    fetch(`${API_BASE}/api/faq`)
      .then((r) => r.json() as Promise<{ data: typeof faqArticles }>)
      .then((json) => setFaqArticles(json.data ?? []))
      .catch(() => {})
      .finally(() => setFaqLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPage]);

  useEffect(() => {
    const slugToType: Record<string, string> = {
      'privacy-policy': 'privacy-policy',
      'terms':          'terms',
      'guidelines':     'guidelines',
    };
    const slug = subPage ?? '';
    if (!slugToType[slug] || legalSections[slug]) return;
    setLegalLoading(true);
    fetch(`${API_BASE}/api/legal/${slug}`)
      .then((r) => r.json() as Promise<{ data: { sections: LegalSectionItem[]; lastUpdated: string | null } }>)
      .then((json) => {
        setLegalSections((prev) => ({ ...prev, [slug]: json.data?.sections ?? [] }));
        if (json.data?.lastUpdated) {
          setLegalLastUpdated((prev) => ({ ...prev, [slug]: json.data.lastUpdated! }));
        }
      })
      .catch(() => {})
      .finally(() => setLegalLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subPage]);

  function showToast(msg: string, isError = false) {
    if (isError) toast.error(msg);
    else toast.success(msg);
  }

  // ── Helpers ──────────────────────────────────────────────────

  function debounceSaveCampaignPrefs(
    next: Partial<{ categories: string[]; prefPlatforms: string[]; prefLocations: string[]; prefBudgetMin: number; prefBudgetMax: number }>
  ) {
    if (prefSaveTimer.current) clearTimeout(prefSaveTimer.current);
    prefSaveTimer.current = setTimeout(() => {
      creatorService.updateCampaignPreferences(next).catch(() => {});
    }, 700);
  }

  function toggleCategory(val: string) {
    setPrefCats((prev) => {
      const next = prev.includes(val)
        ? prev.filter((x) => x !== val)
        : prev.length < 5 ? [...prev, val] : prev;
      if (next !== prev) debounceSaveCampaignPrefs({ categories: next });
      return next;
    });
  }

  function togglePrefPlatform(val: string) {
    setPrefPlatforms((prev) => {
      const next = prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val];
      debounceSaveCampaignPrefs({ prefPlatforms: next });
      return next;
    });
  }


  function handlePriceChange(min: number, max: number) {
    setPrefPriceMin(min);
    setPrefPriceMax(max);
    debounceSaveCampaignPrefs({ prefBudgetMin: min, prefBudgetMax: max });
  }

  function toggleChip(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function togglePayment(id: string) {
    setPaymentMethods((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // debounced save — clears any pending call then fires 600ms after last toggle
      if (paymentSaveTimer.current) clearTimeout(paymentSaveTimer.current);
      paymentSaveTimer.current = setTimeout(() => {
        creatorService.updatePaymentMethods(next).catch(() => {});
      }, 600);
      return next;
    });
  }

  function openSocialSheet(opts?: { account?: SocialAccount }) {
    if (opts?.account) {
      setSocialForm({ platform: opts.account.platform, profileUrl: opts.account.profileUrl, followers: String(opts.account.followers) });
      setEditingSocialId(opts.account.id);
    } else {
      setSocialForm({ platform: '', profileUrl: '', followers: '' });
      setEditingSocialId(null);
    }
    setSocialFormErrors({});
    setShowAddSocial(true);
    socialSheetAnim.setValue(0);
    Animated.spring(socialSheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function resetSocialForm() {
    Animated.timing(socialSheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setSocialForm({ platform: '', profileUrl: '', followers: '' });
      setSocialFormErrors({});
      setEditingSocialId(null);
      setShowAddSocial(false);
    });
  }

  function startEditSocialAccount(acct: SocialAccount) {
    openSocialSheet({ account: acct });
  }

  function validateSocialForm() {
    const errors: Record<string, string> = {};
    if (!socialForm.platform) errors.platform = 'Select a platform';
    if (!socialForm.profileUrl.trim()) errors.profileUrl = 'Profile URL is required';
    else {
      try { new URL(socialForm.profileUrl.trim()); } catch { errors.profileUrl = 'Enter a valid URL (https://...)'; }
    }
    if (!socialForm.followers.trim() || !/^\d+$/.test(socialForm.followers)) errors.followers = 'Enter a valid number';
    return errors;
  }

  async function saveSocialAccount() {
    const errors = validateSocialForm();
    if (Object.keys(errors).length > 0) { setSocialFormErrors(errors); return; }
    setSocialLoading(true);
    try {
      if (editingSocialId) {
        const updated = await creatorService.updateSocialAccount(editingSocialId, {
          profileUrl: socialForm.profileUrl.trim(),
          followers: Number(socialForm.followers),
        });
        setSocialAccounts((prev) => prev.map((a) => a.id === editingSocialId ? { ...a, ...updated } : a));
        showToast('Social account updated');
      } else {
        const created = await creatorService.addSocialAccount({
          platform: socialForm.platform,
          profileUrl: socialForm.profileUrl.trim(),
          followers: Number(socialForm.followers),
        });
        setSocialAccounts((prev) => [...prev, { id: created.id, platform: created.platform, profileUrl: created.profileUrl, followers: created.followers }]);
        showToast('Social account added');
      }
      resetSocialForm();
    } catch (e: any) {
      setSocialFormErrors({ platform: e.message ?? 'Failed to save' });
    } finally {
      setSocialLoading(false);
    }
  }

  function deleteSocialAccount(acct: SocialAccount) {
    const cfg = PLATFORM_CONFIG[acct.platform];
    Alert.alert(`Remove ${cfg?.label ?? acct.platform}`, 'This account will be removed from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await creatorService.deleteSocialAccount(acct.id);
          setSocialAccounts((prev) => prev.filter((a) => a.id !== acct.id));
          showToast('Social account removed');
        } catch { showToast('Failed to remove. Try again.', true); }
      }},
    ]);
  }

  function openPortfolioSheet(item?: PortfolioItem) {
    if (item) {
      setPortfolioForm({ type: item.label, url: item.url });
      setEditingPortfolioId(item.id);
    } else {
      setPortfolioForm({ type: '', url: '' });
      setEditingPortfolioId(null);
    }
    setPortfolioFormErrors({});
    setShowPortfolioSheet(true);
    portfolioSheetAnim.setValue(0);
    Animated.spring(portfolioSheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function resetPortfolioSheet() {
    Animated.timing(portfolioSheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPortfolioForm({ type: '', url: '' });
      setPortfolioFormErrors({});
      setEditingPortfolioId(null);
      setShowPortfolioSheet(false);
    });
  }

  function validatePortfolioForm() {
    const errors: Record<string, string> = {};
    if (!portfolioForm.type) errors.type = 'Select a content type';
    if (!portfolioForm.url.trim()) errors.url = 'URL is required';
    else { try { new URL(portfolioForm.url.trim()); } catch { errors.url = 'Enter a valid URL (https://...)'; } }
    return errors;
  }

  async function savePortfolio() {
    const errors = validatePortfolioForm();
    if (Object.keys(errors).length > 0) { setPortfolioFormErrors(errors); return; }
    setPortfolioLoading(true);
    try {
      if (editingPortfolioId) {
        await creatorService.removePortfolioLink(editingPortfolioId);
        const updated = await creatorService.addPortfolioLink(portfolioForm.type, portfolioForm.url.trim());
        setPortfolio(updated.portfolioLinks);
      } else {
        const updated = await creatorService.addPortfolioLink(portfolioForm.type, portfolioForm.url.trim());
        setPortfolio(updated.portfolioLinks);
      }
      resetPortfolioSheet();
      showToast(editingPortfolioId ? 'Past work updated' : 'Past work added');
    } catch (err: unknown) {
      setPortfolioFormErrors({ url: err instanceof Error ? err.message : 'Failed to save. Try again.' });
    } finally {
      setPortfolioLoading(false);
    }
  }

  function deletePortfolio(item: PortfolioItem) {
    const cfg = PORTFOLIO_CONFIG[item.label];
    Alert.alert(
      `Remove ${cfg?.label ?? item.label}`,
      'This will be removed from your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const updated = await creatorService.removePortfolioLink(item.id);
            setPortfolio(updated.portfolioLinks);
            showToast('Past work removed');
          } catch { showToast('Failed to remove. Try again.', true); }
        }},
      ],
    );
  }

  function handleChangePassword() {
    setPwSubmitted(true);
    const pwOk = newPw.length >= 8;
    const matchOk = newPw === confirmPw;
    if (pwOk && matchOk) {
      setNewPw(''); setConfirmPw(''); setPwSubmitted(false);
      showToast('Password changed successfully!');
      setSubPage(null);
    }
  }

  function handleDeactivateAccount() {
    setShowDeactivateModal(true);
  }

  function handleDeleteAccount() {
    setShowDeleteModal(true);
  }

  async function confirmDeactivate() {
    setAccountActionLoading(true);
    try {
      await creatorService.deactivateAccount();
      setShowDeactivateModal(false);
      showToast('Account deactivated. Log in to reactivate.');
      setTimeout(logout, 1800);
    } catch {
      showToast('Failed to deactivate account. Try again.');
    } finally {
      setAccountActionLoading(false);
    }
  }

  async function confirmDelete() {
    setAccountActionLoading(true);
    try {
      await creatorService.deleteAccount();
      setShowDeleteModal(false);
      showToast('Account deleted permanently.');
      setTimeout(logout, 1800);
    } catch {
      showToast('Failed to delete account. Try again.');
    } finally {
      setAccountActionLoading(false);
    }
  }

  function handleLogoutAll() {
    Alert.alert('Logout All Devices', 'You will be signed out from all devices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout All', style: 'destructive', onPress: logout },
    ]);
  }

  async function handleSupportSubmit() {
    if (!supportMsg.trim() || !supportTopic) return;
    setSupportSubmitting(true);
    try {
      await request('POST', '/api/support/contact', { topic: supportTopic, message: supportMsg.trim() });
      setSupportTopic(''); setSupportMsg('');
      showToast('Message sent. We\'ll respond within 24 hours.');
      setSubPage(null);
    } catch {
      showToast('Failed to send. Please try again.', true);
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function handleReportSubmit() {
    if (!reportDesc.trim() || !reportType) return;
    setReportSubmitting(true);
    try {
      await request('POST', '/api/support/report', { type: reportType, description: reportDesc.trim() });
      setReportType(''); setReportDesc('');
      showToast('Issue reported. Thank you!');
      setSubPage(null);
    } catch {
      showToast('Failed to submit. Please try again.', true);
    } finally {
      setReportSubmitting(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────

  function handleBack() {
    if (subPage) setSubPage(null);
    else router.back();
  }

  const topTitle = subPage
    ? (SUB_PAGE_TITLES[subPage] ?? 'Settings')
    : section
    ? (SECTION_TITLES[section] ?? 'Settings')
    : 'Settings';

  // ── Sub-page: Change Password ─────────────────────────────────

  function renderChangePassword() {
    const pwError = pwSubmitted ? (!newPw ? 'Required' : newPw.length < 8 ? 'Minimum 8 characters' : undefined) : undefined;
    const cPwError = pwSubmitted ? (!confirmPw ? 'Required' : confirmPw !== newPw ? 'Passwords do not match' : undefined) : undefined;
    return (
      <>
        <SectionHeader title="Set New Password" />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>New Password</Text>
              <View style={[styles.pwRow, { backgroundColor: C.background, borderColor: pwError ? C.error : C.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: C.text }]}
                  value={newPw}
                  onChangeText={(t) => { setNewPw(t); setPwSubmitted(false); }}
                  secureTextEntry={!showNewPw}
                  placeholder="Min 8 characters"
                  placeholderTextColor={C.textSecondary}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowNewPw((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showNewPw ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
              {pwError ? <Text style={[styles.fieldError, { color: C.error }]}>{pwError}</Text> : null}
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Confirm Password</Text>
              <View style={[styles.pwRow, { backgroundColor: C.background, borderColor: cPwError ? C.error : C.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: C.text }]}
                  value={confirmPw}
                  onChangeText={(t) => { setConfirmPw(t); setPwSubmitted(false); }}
                  secureTextEntry={!showConfirmPw}
                  placeholder="Repeat password"
                  placeholderTextColor={C.textSecondary}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPw((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showConfirmPw ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
              {cPwError ? <Text style={[styles.fieldError, { color: C.error }]}>{cPwError}</Text> : null}
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: C.brinjal1 }]} onPress={handleChangePassword}>
              <Text style={styles.saveBtnText}>Update Password</Text>
            </Pressable>
          </View>
        </Card>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Use a strong password with letters, numbers, and symbols.</Text>
        </View>
      </>
    );
  }

  // ── Sub-page: Help Center ─────────────────────────────────────

  function renderHelpCenter() {
    if (helpLoading) {
      return (
        <>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={{ marginTop: 12, marginHorizontal: 16 }}>
              <View style={[styles.faqCard, { backgroundColor: C.surface }]}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border }]} />
                <View style={[styles.helpSkeletonA, { backgroundColor: C.border }]} />
                <View style={[styles.helpSkeletonA, { backgroundColor: C.border, width: '60%' }]} />
              </View>
            </View>
          ))}
        </>
      );
    }

    if (helpArticles.length === 0) {
      return (
        <View style={[styles.helpEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={styles.helpEmptyIcon}>❓</Text>
          <Text style={[styles.helpEmptyTitle, { color: C.text }]}>No help articles yet</Text>
          <Text style={[styles.helpEmptySubtitle, { color: C.textSecondary }]}>Check back soon — our team is adding articles.</Text>
        </View>
      );
    }

    // Group by category
    const grouped: Record<string, typeof helpArticles> = {};
    for (const a of helpArticles) {
      (grouped[a.category] ??= []).push(a);
    }

    return (
      <>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight, marginBottom: 0 }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Find answers to common questions about CreatorMarket.</Text>
        </View>
        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat}>
            <SectionHeader title={cat} />
            {items.map((item) => (
              <View key={item.id} style={{ marginBottom: 10, marginHorizontal: 16 }}>
                <View style={[styles.faqCard, { backgroundColor: C.surface }]}>
                  <Text style={[styles.faqQ, { color: C.text }]}>{item.question}</Text>
                  <Text style={[styles.faqA, { color: C.textSecondary }]}>{item.answer}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </>
    );
  }

  // ── Sub-page: Contact Support ─────────────────────────────────

  const SUPPORT_TOPICS = ['Technical Issue', 'Payment Problem', 'Campaign Issue', 'Account Help', 'Other'];

  function renderContactSupport() {
    return (
      <>
        <SectionHeader title="Get in Touch" />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Topic</Text>
              <View style={styles.chipGroup}>
                {SUPPORT_TOPICS.map((t) => {
                  const active = supportTopic === t;
                  return (
                    <Pressable key={t} style={[styles.chip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]} onPress={() => setSupportTopic(t)}>
                      <Text style={[styles.chipText, { color: active ? C.brinjal1 : C.text }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Message</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={supportMsg}
                onChangeText={setSupportMsg}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: C.brinjal1, opacity: (supportMsg.trim() && supportTopic && !supportSubmitting) ? 1 : 0.45 }]}
              onPress={handleSupportSubmit}
              disabled={supportSubmitting}>
              <Text style={styles.saveBtnText}>{supportSubmitting ? 'Sending…' : 'Send Message'}</Text>
            </Pressable>
          </View>
        </Card>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>📧 You can also email us at support@creatormarket.com</Text>
        </View>
      </>
    );
  }

  // ── Sub-page: Report Issue ────────────────────────────────────

  const REPORT_TYPES = ['App Bug', 'Payment Issue', 'Campaign Problem', 'Inappropriate Content', 'Other'];

  function renderReportIssue() {
    return (
      <>
        <SectionHeader title="Report an Issue" />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Issue Type</Text>
              <View style={styles.chipGroup}>
                {REPORT_TYPES.map((t) => {
                  const active = reportType === t;
                  return (
                    <Pressable key={t} style={[styles.chip, { borderColor: active ? C.error : C.border, backgroundColor: active ? '#FEE2E2' : C.surface }]} onPress={() => setReportType(t)}>
                      <Text style={[styles.chipText, { color: active ? C.error : C.text }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={reportDesc}
                onChangeText={setReportDesc}
                placeholder="Describe the issue with as much detail as possible..."
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: C.error, opacity: (reportDesc.trim() && reportType && !reportSubmitting) ? 1 : 0.45 }]}
              onPress={handleReportSubmit}
              disabled={reportSubmitting}>
              <Text style={styles.saveBtnText}>{reportSubmitting ? 'Submitting…' : 'Submit Report'}</Text>
            </Pressable>
          </View>
        </Card>
      </>
    );
  }

  // ── Sub-page: FAQs ────────────────────────────────────────────

  function renderFAQs() {
    if (faqLoading) {
      return (
        <>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={{ marginTop: 10, marginHorizontal: 16 }}>
              <View style={[styles.faqCard, { backgroundColor: C.surface }]}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border }]} />
                <View style={[styles.helpSkeletonA, { backgroundColor: C.border }]} />
                <View style={[styles.helpSkeletonA, { backgroundColor: C.border, width: '70%' }]} />
              </View>
            </View>
          ))}
        </>
      );
    }

    if (faqArticles.length === 0) {
      return (
        <View style={[styles.helpEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={styles.helpEmptyIcon}>💬</Text>
          <Text style={[styles.helpEmptyTitle, { color: C.text }]}>No FAQs yet</Text>
          <Text style={[styles.helpEmptySubtitle, { color: C.textSecondary }]}>Frequently asked questions will appear here.</Text>
        </View>
      );
    }

    const grouped: Record<string, typeof faqArticles> = {};
    for (const a of faqArticles) { (grouped[a.category] ??= []).push(a); }

    return (
      <>
        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat}>
            <SectionHeader title={cat} />
            {items.map((item) => (
              <View key={item.id} style={{ marginBottom: 10, marginHorizontal: 16 }}>
                <View style={[styles.faqCard, { backgroundColor: C.surface }]}>
                  <Text style={[styles.faqQ, { color: C.text }]}>{item.question}</Text>
                  <Text style={[styles.faqA, { color: C.textSecondary }]}>{item.answer}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </>
    );
  }

  // ── Sub-page: Privacy Policy ──────────────────────────────────

  function renderPrivacyPolicy() {
    const sections = legalSections['privacy-policy'];
    const lastUpdated = legalLastUpdated['privacy-policy'];
    if (legalLoading && !sections) {
      return (
        <View style={{ marginHorizontal: 16, gap: 16 }}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={[styles.legalSection, { borderBottomColor: C.border }]}>
              <View style={[styles.helpSkeletonQ, { backgroundColor: C.border }]} />
              <View style={[styles.helpSkeletonA, { backgroundColor: C.border }]} />
              <View style={[styles.helpSkeletonA, { backgroundColor: C.border, width: '70%' }]} />
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={{ marginHorizontal: 16 }}>
        {lastUpdated && (
          <Text style={[styles.legalDate, { color: C.textSecondary }]}>
            Last updated: {new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        )}
        {(sections ?? []).map((s) => (
          <View key={s.id} style={[styles.legalSection, { borderBottomColor: C.border }]}>
            <Text style={[styles.legalTitle, { color: C.text }]}>{s.title}</Text>
            <Text style={[styles.legalBody, { color: C.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </View>
    );
  }

  // ── Sub-page: Terms & Conditions ──────────────────────────────

  function renderTerms() {
    const sections = legalSections['terms'];
    const lastUpdated = legalLastUpdated['terms'];
    if (legalLoading && !sections) {
      return (
        <View style={{ marginHorizontal: 16, gap: 16 }}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={[styles.legalSection, { borderBottomColor: C.border }]}>
              <View style={[styles.helpSkeletonQ, { backgroundColor: C.border }]} />
              <View style={[styles.helpSkeletonA, { backgroundColor: C.border }]} />
              <View style={[styles.helpSkeletonA, { backgroundColor: C.border, width: '70%' }]} />
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={{ marginHorizontal: 16 }}>
        {lastUpdated && (
          <Text style={[styles.legalDate, { color: C.textSecondary }]}>
            Last updated: {new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        )}
        {(sections ?? []).map((s) => (
          <View key={s.id} style={[styles.legalSection, { borderBottomColor: C.border }]}>
            <Text style={[styles.legalTitle, { color: C.text }]}>{s.title}</Text>
            <Text style={[styles.legalBody, { color: C.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </View>
    );
  }

  // ── Sub-page: Community Guidelines ───────────────────────────

  function renderGuidelines() {
    const sections = legalSections['guidelines'];
    if (legalLoading && !sections) {
      return (
        <View style={{ marginHorizontal: 16, gap: 12 }}>
          {[1,2,3].map((i) => (
            <View key={i} style={[styles.guideCard, { backgroundColor: C.surface }]}>
              <View style={[styles.helpSkeletonQ, { backgroundColor: C.border }]} />
              <View style={[styles.helpSkeletonA, { backgroundColor: C.border }]} />
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={{ marginHorizontal: 16 }}>
        {(sections ?? []).map((s) => (
          <View key={s.id} style={[styles.guideCard, { backgroundColor: C.surface }]}>
            <View style={styles.guideHeader}>
              {s.icon ? <Text style={styles.guideIcon}>{s.icon}</Text> : null}
              <Text style={[styles.guideTitle, { color: C.text }]}>{s.title}</Text>
            </View>
            <Text style={[styles.guideBody, { color: C.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </View>
    );
  }

  // ── Section: Social Accounts ──────────────────────────────────

  function renderSocialAccounts() {
    const addedPlatforms = new Set(socialAccounts.map((a) => a.platform));
    const isEditing = !!editingSocialId;
    const selectedPlatform = ALL_SOCIAL_PLATFORMS.find((p) => p.id === socialForm.platform);
    const followersPreview = socialForm.followers ? fmt(socialForm.followers) : null;
    const sheetTranslateY = socialSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

    return (
      <>
        {/* ── Bottom-sheet modal ─────────────────────────────────────── */}
        <Modal visible={showAddSocial} transparent animationType="none" onRequestClose={resetSocialForm}>
          <Pressable style={styles.sheetBackdrop} onPress={resetSocialForm} />
          <Animated.View
            style={[
              styles.socialSheet,
              { backgroundColor: C.surface, transform: [{ translateY: sheetTranslateY }] },
            ]}>

            {/* Sheet header — changes colour when platform is chosen */}
            <View style={[
              styles.sheetHeader,
              { backgroundColor: selectedPlatform ? selectedPlatform.color : C.brinjal1 },
            ]}>
              <View style={styles.sheetHeaderInner}>
                {selectedPlatform && (
                  <View style={styles.sheetPlatformIcon}>
                    <Text style={{ fontSize: 28 }}>{selectedPlatform.icon}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>
                    {isEditing
                      ? `Edit ${selectedPlatform?.label ?? ''}`
                      : selectedPlatform
                        ? selectedPlatform.label
                        : 'Add Social Account'}
                  </Text>
                  {selectedPlatform && !isEditing && (
                    <Text style={styles.sheetSubtitle}>Tap a different platform below to change</Text>
                  )}
                  {isEditing && (
                    <Text style={styles.sheetSubtitle}>Update your profile URL and follower count</Text>
                  )}
                </View>
              </View>
              {/* drag handle */}
              <View style={styles.sheetHandle} />
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheetBody}>

                {/* Platform grid — only shown when adding, not editing */}
                {!isEditing && (
                  <View style={styles.sheetSection}>
                    <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>Select Platform</Text>
                    {socialFormErrors.platform ? (
                      <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>{socialFormErrors.platform}</Text>
                    ) : null}
                    <View style={styles.platformGrid}>
                      {ALL_SOCIAL_PLATFORMS.map((p) => {
                        const alreadyAdded = addedPlatforms.has(p.id);
                        const isSelected = socialForm.platform === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            disabled={alreadyAdded}
                            style={[
                              styles.platformGridItem,
                              { borderColor: isSelected ? p.color : C.border, backgroundColor: isSelected ? p.color + '15' : C.background },
                              alreadyAdded && styles.platformGridItemDisabled,
                            ]}
                            onPress={() => {
                              const prefix = PLATFORM_URL_PREFIX[p.id] ?? '';
                              setSocialForm((f) => ({
                                ...f,
                                platform: p.id,
                                profileUrl: f.profileUrl || prefix,
                              }));
                              setSocialFormErrors((e) => ({ ...e, platform: '' }));
                            }}>
                            <Text style={[styles.platformGridEmoji, alreadyAdded && { opacity: 0.35 }]}>{p.icon}</Text>
                            <Text style={[
                              styles.platformGridLabel,
                              { color: isSelected ? p.color : C.text },
                              alreadyAdded && { opacity: 0.35 },
                            ]}>{p.label}</Text>
                            {alreadyAdded && (
                              <View style={[styles.platformGridAddedBadge, { backgroundColor: p.color + '22' }]}>
                                <Text style={[styles.platformGridAddedText, { color: p.color }]}>✓</Text>
                              </View>
                            )}
                            {isSelected && (
                              <View style={[styles.platformGridSelectedDot, { backgroundColor: p.color }]} />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Show URL + followers only after platform is chosen (or always when editing) */}
                {(isEditing || socialForm.platform) && (
                  <>
                    {/* Profile URL */}
                    <View style={styles.sheetSection}>
                      <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>Profile URL</Text>
                      <View style={[
                        styles.sheetInputWrap,
                        { borderColor: socialFormErrors.profileUrl ? C.error : selectedPlatform ? selectedPlatform.color + '60' : C.border, backgroundColor: C.background },
                      ]}>
                        {selectedPlatform && (
                          <Text style={[styles.sheetInputPrefix, { color: selectedPlatform.color }]}>{selectedPlatform.icon} </Text>
                        )}
                        <TextInput
                          style={[styles.sheetInput, { color: C.text }]}
                          value={socialForm.profileUrl}
                          onChangeText={(t) => { setSocialForm((f) => ({ ...f, profileUrl: t })); setSocialFormErrors((e) => ({ ...e, profileUrl: '' })); }}
                          placeholder={selectedPlatform ? (PLATFORM_URL_PREFIX[selectedPlatform.id] + 'yourhandle') : 'https://...'}
                          autoCapitalize="none"
                          keyboardType="url"
                          autoCorrect={false}
                          placeholderTextColor={C.textSecondary}
                        />
                      </View>
                      {socialFormErrors.profileUrl
                        ? <Text style={[styles.sheetFieldError, { color: C.error }]}>{socialFormErrors.profileUrl}</Text>
                        : <Text style={[styles.sheetFieldHint, { color: C.textSecondary }]}>Paste your full public profile link</Text>}
                    </View>

                    {/* Follower count */}
                    <View style={styles.sheetSection}>
                      <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>
                        {selectedPlatform?.followersLabel ?? 'Followers'} Count
                      </Text>
                      <View style={[
                        styles.sheetInputWrap,
                        { borderColor: socialFormErrors.followers ? C.error : selectedPlatform ? selectedPlatform.color + '60' : C.border, backgroundColor: C.background },
                      ]}>
                        <TextInput
                          style={[styles.sheetInput, { color: C.text, flex: 1 }]}
                          value={socialForm.followers}
                          onChangeText={(t) => { setSocialForm((f) => ({ ...f, followers: t.replace(/\D/g, '') })); setSocialFormErrors((e) => ({ ...e, followers: '' })); }}
                          placeholder="e.g. 18200"
                          keyboardType="numeric"
                          placeholderTextColor={C.textSecondary}
                        />
                        {followersPreview && (
                          <View style={[styles.sheetCountBadge, { backgroundColor: selectedPlatform ? selectedPlatform.color + '18' : C.primaryLight }]}>
                            <Text style={[styles.sheetCountBadgeText, { color: selectedPlatform?.color ?? C.brinjal1 }]}>{followersPreview}</Text>
                          </View>
                        )}
                      </View>
                      {socialFormErrors.followers
                        ? <Text style={[styles.sheetFieldError, { color: C.error }]}>{socialFormErrors.followers}</Text>
                        : <Text style={[styles.sheetFieldHint, { color: C.textSecondary }]}>Enter your current count — used to match campaigns</Text>}
                    </View>

                    {/* Save button */}
                    <View style={styles.sheetActions}>
                      <Pressable
                        style={[
                          styles.sheetSaveBtn,
                          { backgroundColor: selectedPlatform?.color ?? C.brinjal1, opacity: socialLoading ? 0.6 : 1 },
                        ]}
                        onPress={saveSocialAccount}
                        disabled={socialLoading}>
                        {socialLoading ? (
                          <View style={styles.sheetSaveBtnRow}>
                            <View style={styles.sheetSpinner} />
                            <Text style={styles.sheetSaveBtnText}>Saving…</Text>
                          </View>
                        ) : (
                          <Text style={styles.sheetSaveBtnText}>
                            {isEditing ? '✓  Save Changes' : `+ Add ${selectedPlatform?.label ?? 'Account'}`}
                          </Text>
                        )}
                      </Pressable>
                      <Pressable style={[styles.sheetCancelBtn, { borderColor: C.border }]} onPress={resetSocialForm}>
                        <Text style={[styles.sheetCancelBtnText, { color: C.textSecondary }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </>
                )}

              </View>
            </ScrollView>
          </Animated.View>
        </Modal>

        <SectionHeader title="Social Accounts" />

        {/* Empty state */}
        {socialAccounts.length === 0 && (
          <View style={[styles.socialEmptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={styles.socialEmptyIcon}>📱</Text>
            <Text style={[styles.socialEmptyTitle, { color: C.text }]}>No accounts linked yet</Text>
            <Text style={[styles.socialEmptySubtitle, { color: C.textSecondary }]}>
              Add your social profiles so brands know your reach
            </Text>
          </View>
        )}

        {/* Added accounts list */}
        {socialAccounts.length > 0 && (
          <Card>
            {socialAccounts.map((acct, idx) => {
              const cfg = PLATFORM_CONFIG[acct.platform] ?? { icon: '🔗', label: acct.platform, color: '#6366f1', followersLabel: 'Followers' };
              const isLast = idx === socialAccounts.length - 1;
              return (
                <View key={acct.id} style={[styles.row, styles.socialRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={[styles.socialIconWrap, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={styles.socialEmoji}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.socialPlatformName, { color: C.text }]}>{cfg.label}</Text>
                    <View style={styles.socialMetaRow}>
                      <View style={[styles.socialFollowerBadge, { backgroundColor: cfg.color + '15' }]}>
                        <Text style={[styles.socialFollowerBadgeText, { color: cfg.color }]}>
                          {fmt(String(acct.followers))} {cfg.followersLabel.toLowerCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.socialUrl, { color: C.textSecondary }]} numberOfLines={1}>{acct.profileUrl}</Text>
                  </View>
                  <View style={styles.socialActions}>
                    <Pressable style={[styles.socialEditBtn, { backgroundColor: cfg.color + '15' }]} onPress={() => startEditSocialAccount(acct)}>
                      <Text style={[styles.socialEditBtnText, { color: cfg.color }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.socialDisconnectBtn} onPress={() => deleteSocialAccount(acct)}>
                      <Text style={[styles.socialDisconnectText, { color: C.error }]}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Add button */}
        <Pressable
          style={[styles.addSocialBtn, { borderColor: C.brinjal1, backgroundColor: C.primaryLight }]}
          onPress={() => openSocialSheet()}>
          <Text style={[styles.addSocialBtnText, { color: C.brinjal1 }]}>＋  Add Social Account</Text>
        </Pressable>

      </>
    );
  }

  // ── Section: Past Work ────────────────────────────────────────

  function renderPastWork() {
    return (
      <>
        {/* Portfolio bottom-sheet modal */}
        <Modal visible={showPortfolioSheet} transparent animationType="none" onRequestClose={resetPortfolioSheet}>
          <Pressable style={styles.sheetBackdrop} onPress={resetPortfolioSheet} />
          <Animated.View style={[
            styles.socialSheet,
            { backgroundColor: C.surface, transform: [{ translateY: portfolioSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] },
          ]}>
            {/* Header */}
            <View style={[
              styles.sheetHeader,
              { backgroundColor: portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].color : '#6366F1' },
            ]}>
              <View style={styles.sheetHeaderInner}>
                {portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] && (
                  <View style={styles.sheetPlatformIcon}>
                    <Text style={{ fontSize: 28 }}>{PORTFOLIO_CONFIG[portfolioForm.type].icon}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>
                    {editingPortfolioId
                      ? `Edit ${PORTFOLIO_CONFIG[portfolioForm.type]?.label ?? 'Work'}`
                      : portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type]
                        ? PORTFOLIO_CONFIG[portfolioForm.type].label
                        : 'Add Past Work'}
                  </Text>
                  <Text style={styles.sheetSubtitle}>
                    {editingPortfolioId ? 'Update the link for this work sample' : 'Show brands your best content'}
                  </Text>
                </View>
              </View>
              <View style={styles.sheetHandle} />
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.sheetBody}>

                {/* Content type grid */}
                {!editingPortfolioId && (
                  <View style={styles.sheetSection}>
                    <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>Content Type</Text>
                    {portfolioFormErrors.type ? (
                      <Text style={[styles.fieldError, { color: C.error, marginBottom: 8 }]}>{portfolioFormErrors.type}</Text>
                    ) : null}
                    <View style={styles.platformGrid}>
                      {PORTFOLIO_TYPES.map((p) => {
                        const isSelected = portfolioForm.type === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            style={[
                              styles.platformGridItem,
                              { borderColor: isSelected ? p.color : C.border, backgroundColor: isSelected ? p.color + '15' : C.background },
                            ]}
                            onPress={() => {
                              setPortfolioForm((f) => ({ ...f, type: p.id }));
                              setPortfolioFormErrors((e) => ({ ...e, type: '' }));
                            }}>
                            <Text style={styles.platformGridEmoji}>{p.icon}</Text>
                            <Text style={[styles.platformGridLabel, { color: isSelected ? p.color : C.text }]}>{p.label}</Text>
                            {isSelected && <View style={[styles.platformGridSelectedDot, { backgroundColor: p.color }]} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* URL input — always shown (or only after type is picked) */}
                {(editingPortfolioId || portfolioForm.type) && (
                  <>
                    <View style={styles.sheetSection}>
                      <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>Link / URL</Text>
                      <View style={[
                        styles.sheetInputWrap,
                        { borderColor: portfolioFormErrors.url ? C.error : (portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].color + '60' : C.border), backgroundColor: C.background },
                      ]}>
                        {portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] && (
                          <Text style={[styles.sheetInputPrefix, { color: PORTFOLIO_CONFIG[portfolioForm.type].color }]}>
                            {PORTFOLIO_CONFIG[portfolioForm.type].icon}{' '}
                          </Text>
                        )}
                        <TextInput
                          style={[styles.sheetInput, { color: C.text }]}
                          value={portfolioForm.url}
                          onChangeText={(t) => { setPortfolioForm((f) => ({ ...f, url: t })); setPortfolioFormErrors((e) => ({ ...e, url: '' })); }}
                          placeholder={portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].urlHint : 'https://...'}
                          autoCapitalize="none"
                          keyboardType="url"
                          autoCorrect={false}
                          placeholderTextColor={C.textSecondary}
                        />
                      </View>
                      {portfolioFormErrors.url
                        ? <Text style={[styles.sheetFieldError, { color: C.error }]}>{portfolioFormErrors.url}</Text>
                        : <Text style={[styles.sheetFieldHint, { color: C.textSecondary }]}>Paste the full public link to your work</Text>}
                    </View>

                    <View style={styles.sheetActions}>
                      <Pressable
                        style={[
                          styles.sheetSaveBtn,
                          { backgroundColor: portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].color : '#6366F1', opacity: portfolioLoading ? 0.6 : 1 },
                        ]}
                        onPress={savePortfolio}
                        disabled={portfolioLoading}>
                        {portfolioLoading ? (
                          <View style={styles.sheetSaveBtnRow}>
                            <View style={styles.sheetSpinner} />
                            <Text style={styles.sheetSaveBtnText}>Saving…</Text>
                          </View>
                        ) : (
                          <Text style={styles.sheetSaveBtnText}>
                            {editingPortfolioId ? '✓  Save Changes' : `+ Add ${PORTFOLIO_CONFIG[portfolioForm.type]?.label ?? 'Work'}`}
                          </Text>
                        )}
                      </Pressable>
                      <Pressable style={[styles.sheetCancelBtn, { borderColor: C.border }]} onPress={resetPortfolioSheet}>
                        <Text style={[styles.sheetCancelBtnText, { color: C.textSecondary }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </Modal>

        <SectionHeader title="Past Work" />

        {/* Empty state */}
        {portfolio.length === 0 && (
          <View style={[styles.socialEmptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={styles.socialEmptyIcon}>🎨</Text>
            <Text style={[styles.socialEmptyTitle, { color: C.text }]}>No work samples yet</Text>
            <Text style={[styles.socialEmptySubtitle, { color: C.textSecondary }]}>
              Add links to your best posts, videos, or media kit
            </Text>
          </View>
        )}

        {/* Portfolio list */}
        {portfolio.length > 0 && (
          <Card>
            {portfolio.map((item, idx) => {
              const cfg = PORTFOLIO_CONFIG[item.label] ?? { icon: '🔗', label: item.label || 'Link', color: '#6366F1' };
              const isLast = idx === portfolio.length - 1;
              return (
                <View key={item.id} style={[styles.row, styles.socialRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={[styles.socialIconWrap, { backgroundColor: cfg.color + '18' }]}>
                    <Text style={styles.socialEmoji}>{cfg.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.socialPlatformName, { color: C.text }]}>{cfg.label}</Text>
                    <Text style={[styles.socialUrl, { color: C.textSecondary }]} numberOfLines={1}>{item.url}</Text>
                  </View>
                  <View style={styles.socialActions}>
                    <Pressable style={[styles.socialEditBtn, { backgroundColor: cfg.color + '15' }]} onPress={() => openPortfolioSheet(item)}>
                      <Text style={[styles.socialEditBtnText, { color: cfg.color }]}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.socialDisconnectBtn} onPress={() => deletePortfolio(item)}>
                      <Text style={[styles.socialDisconnectText, { color: C.error }]}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Add button */}
        <Pressable
          style={[styles.addSocialBtn, { borderColor: '#6366F1', backgroundColor: '#6366F115' }]}
          onPress={() => openPortfolioSheet()}>
          <Text style={[styles.addSocialBtnText, { color: '#6366F1' }]}>＋  Add Past Work</Text>
        </Pressable>
      </>
    );
  }

  // ── Section: Campaign Preferences ────────────────────────────

  function renderCampaignPreferences() {
    const catAtMax = prefCats.length >= 5;
    return (
      <>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight, marginTop: 12 }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>These help us match you with the most relevant campaigns.</Text>
        </View>

        <SectionHeader title="Categories" />
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>
            {prefCats.length}/5 selected{catAtMax ? ' · Max reached' : ''}
          </Text>
        </View>
        <Card>
          <View style={styles.chipSection}>
            <View style={styles.chipGroup}>
              {CAT_OPTIONS.map((opt) => {
                const active = prefCats.includes(opt);
                const disabled = !active && catAtMax;
                return (
                  <Pressable
                    key={opt}
                    style={[
                      styles.chip,
                      { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface, opacity: disabled ? 0.4 : 1 },
                    ]}
                    onPress={() => { if (!disabled) toggleCategory(opt); }}>
                    <Text style={[styles.chipText, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '500' }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <SectionHeader title="Price Range" />
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Only show campaigns within your preferred budget range.</Text>
        </View>
        <Card>
          <View style={styles.sliderSection}>
            <RangeSlider
              minVal={prefPriceMin}
              maxVal={prefPriceMax}
              onMinChange={(v) => handlePriceChange(v, prefPriceMax)}
              onMaxChange={(v) => handlePriceChange(prefPriceMin, v)}
            />
          </View>
        </Card>

        <SectionHeader title="Preferred Platforms" />
        <Card>
          <View style={styles.chipSection}>
            <ChipGroup options={PLATFORM_OPTIONS} selected={prefPlatforms} onToggle={togglePrefPlatform} />
          </View>
        </Card>

        <SectionHeader title="Preferred Locations" />
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>
            Select up to 3 locations. Remote means you're open to work from anywhere.
            {prefLocations.length >= 3 ? ' · Max reached' : ''}
          </Text>
        </View>
        <Card>
          <View style={styles.chipSection}>
            <PrefLocationPicker
              locations={prefLocations}
              onChange={(locs) => {
                setPrefLocations(locs);
                debounceSaveCampaignPrefs({ prefLocations: locs });
              }}
            />
          </View>
        </Card>
        <Text style={[styles.saveHint, { color: C.textSecondary }]}>Changes are saved automatically.</Text>
      </>
    );
  }

  // ── Section: Earnings & Payments ──────────────────────────────

  function renderEarnings() {
    return (
      <>
        <SectionHeader title="Earnings Summary" />
        <Card>
          {earningsLoading ? (
            <View style={styles.earningsRow}>
              {['Total Earned', 'Pending', 'Campaigns'].map((label) => (
                <View key={label} style={styles.earningsStat}>
                  <View style={[styles.earningsSkeletonValue, { backgroundColor: C.border }]} />
                  <Text style={[styles.earningsLabel, { color: C.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.earningsRow}>
              {[
                { label: 'Total Earned',  value: `$${(earningsSummary?.totalEarned     ?? 0).toFixed(0)}`, color: C.brinjal1 },
                { label: 'Pending',       value: `$${(earningsSummary?.pendingEarnings ?? 0).toFixed(0)}`, color: C.draft    },
                { label: 'Campaigns',     value: String(earningsSummary?.totalApplications ?? 0),           color: C.active   },
              ].map((stat) => (
                <View key={stat.label} style={styles.earningsStat}>
                  <Text style={[styles.earningsValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.earningsLabel, { color: C.textSecondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
        <SectionHeader title="Payment Methods" />
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Select all methods you want to receive payments through.</Text>
        </View>
        <Card>
          {PAYMENT_METHODS.map((m, idx) => {
            const selected = paymentMethods.includes(m.id);
            return (
              <Pressable
                key={m.id}
                style={[styles.row, idx < PAYMENT_METHODS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => togglePayment(m.id)}>
                <View style={[styles.paymentIcon, { backgroundColor: m.color + '18' }]}>
                  <Text style={styles.paymentEmoji}>{m.icon}</Text>
                </View>
                <Text style={[styles.rowLabel, { color: C.text }]}>{m.label}</Text>
                <View style={[styles.checkboxOuter, { borderColor: selected ? C.brinjal1 : C.border, backgroundColor: selected ? C.brinjal1 : 'transparent' }]}>
                  {selected ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      </>
    );
  }

  // ── Section: Security ─────────────────────────────────────────

  function renderSecurity() {
    return (
      <>
        <SectionHeader title="Login & Password" />
        <Card>
          <NavRow icon="🔑" label="Change Password" onPress={() => setSubPage('change-password')} />
          <NavRow icon="📱" label="Logout All Devices" onPress={handleLogoutAll} isLast />
        </Card>
        <SectionHeader title="Verification" />
        <Card>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>✉️</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>Email Verified</Text>
            <View style={styles.verifiedBadge}><Text style={[styles.badgeText, { color: C.active }]}>✓ Verified</Text></View>
          </View>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>📞</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>Phone Verified</Text>
            <View style={styles.verifiedBadge}><Text style={[styles.badgeText, { color: C.active }]}>✓ Verified</Text></View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>🏅</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>Creator Badge</Text>
            <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.badgeText, { color: C.brinjal1 }]}>Coming Soon</Text>
            </View>
          </View>
        </Card>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Verified creators get higher visibility in campaign matches.</Text>
        </View>
      </>
    );
  }

  // ── Section: Support ──────────────────────────────────────────

  function renderSupport() {
    return (
      <>
        <SectionHeader title="Get Help" />
        <Card>
          <NavRow icon="❓" label="Help Center" onPress={() => setSubPage('help-center')} />
          <NavRow icon="💌" label="Contact Support" onPress={() => setSubPage('contact-support')} />
          <NavRow icon="🚨" label="Report Issue" onPress={() => setSubPage('report-issue')} />
          <NavRow icon="📖" label="FAQs" onPress={() => setSubPage('faqs')} isLast />
        </Card>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Average response time: under 24 hours on business days.</Text>
        </View>
      </>
    );
  }

  // ── Section: Legal ────────────────────────────────────────────

  function renderLegal() {
    return (
      <>
        <SectionHeader title="Legal Documents" />
        <Card>
          <NavRow icon="🔒" label="Privacy Policy" onPress={() => setSubPage('privacy-policy')} />
          <NavRow icon="📄" label="Terms & Conditions" onPress={() => setSubPage('terms')} />
          <NavRow icon="📋" label="Community Guidelines" onPress={() => setSubPage('guidelines')} isLast />
        </Card>
      </>
    );
  }

  // ── Main Settings ─────────────────────────────────────────────

  function renderMainSettings() {
    return (
      <>
        {/* Account */}
        <SectionHeader title="Account" />
        <Card>
          <View style={[styles.accountCard, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[styles.accountAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={styles.accountAvatarText}>{(user?.name ?? 'C')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: C.text }]}>{user?.name ?? 'Creator'}</Text>
              <Text style={[styles.accountEmail, { color: C.textSecondary }]}>{user?.email ?? 'creator@example.com'}</Text>
            </View>
          </View>
          <NavRow icon="✏️" label="Edit Profile" onPress={() => router.push('/(creator)/edit-profile')} />
          <NavRow icon="⏸️" label="Deactivate Account" onPress={handleDeactivateAccount} />
          <NavRow icon="🗑️" label="Delete Account" onPress={handleDeleteAccount} danger isLast />
        </Card>

        {/* Language */}
        <SectionHeader title="Language" />
        <View style={{ marginHorizontal: 16, gap: 10 }}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = selectedLang === lang.label;
            return (
              <Pressable
                key={lang.label}
                disabled={lang.future}
                onPress={() => { if (!lang.future) setSelectedLang(lang.label); }}
                style={[
                  styles.langCard,
                  { backgroundColor: C.surface, borderColor: active ? C.brinjal1 : C.border, opacity: lang.future ? 0.55 : 1 },
                ]}>
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.langNameRow}>
                    <Text style={[styles.langName, { color: C.text }]}>{lang.label}</Text>
                    <Text style={[styles.langNative, { color: C.textSecondary }]}>{lang.native}</Text>
                  </View>
                  <Text style={[styles.langDesc, { color: C.textSecondary }]}>{lang.desc}</Text>
                </View>
                {lang.future ? (
                  <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.badgeText, { color: C.brinjal1 }]}>Soon</Text>
                  </View>
                ) : active ? (
                  <View style={[styles.activeLangCheck, { backgroundColor: C.brinjal1 }]}>
                    <Text style={styles.activeLangCheckText}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.inactiveLangCircle, { borderColor: C.border }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* App Settings */}
        <SectionHeader title="App Settings" />
        <Card>
          <SwitchRow icon="🌙" label="Dark Mode" value={isDark} onChange={toggleDark} />
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>ℹ️</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>App Version</Text>
            <Text style={[styles.versionText, { color: C.textSecondary }]}>1.0.0</Text>
          </View>
          <NavRow icon="🌐" label="Language" value={selectedLang} onPress={() => {}} isLast />
        </Card>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <ColorCtx.Provider value={C}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>

        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: C.background, borderBottomColor: C.border }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={handleBack}>
            <Text style={[styles.backArrow, { color: C.brinjal1 }]}>‹</Text>
          </Pressable>
          <Text style={[styles.topTitle, { color: C.text }]}>{topTitle}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Sub-pages */}
          {subPage === 'change-password'  && renderChangePassword()}
          {subPage === 'help-center'      && renderHelpCenter()}
          {subPage === 'contact-support'  && renderContactSupport()}
          {subPage === 'report-issue'     && renderReportIssue()}
          {subPage === 'faqs'             && renderFAQs()}
          {subPage === 'privacy-policy'   && renderPrivacyPolicy()}
          {subPage === 'terms'            && renderTerms()}
          {subPage === 'guidelines'       && renderGuidelines()}

          {/* Sections (no sub-page) */}
          {!subPage && !section && renderMainSettings()}
          {!subPage && section === 'social'     && renderSocialAccounts()}
          {!subPage && section === 'campaigns'  && renderCampaignPreferences()}
          {!subPage && section === 'earnings'   && renderEarnings()}
          {!subPage && section === 'past-work'  && renderPastWork()}
          {!subPage && section === 'security'   && renderSecurity()}
          {!subPage && section === 'support'    && renderSupport()}
          {!subPage && section === 'legal'      && renderLegal()}

          <View style={{ height: 48 }} />
        </ScrollView>


        {/* ── Deactivate Account Modal ──────────────────────────── */}
        <Modal visible={showDeactivateModal} transparent animationType="fade" onRequestClose={() => setShowDeactivateModal(false)}>
          <Pressable style={styles.confirmOverlay} onPress={() => { if (!accountActionLoading) setShowDeactivateModal(false); }}>
            <Pressable style={[styles.confirmCard, { backgroundColor: C.surface }]} onPress={() => {}}>
              <View style={[styles.confirmIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <Text style={styles.confirmIcon}>⏸️</Text>
              </View>
              <Text style={[styles.confirmTitle, { color: C.text }]}>Deactivate Account</Text>
              <Text style={[styles.confirmBody, { color: C.textSecondary }]}>
                Your profile will be hidden from brands and you{'’'}ll stop receiving campaign matches.{'\n\n'}
                You can log back in at any time to instantly reactivate your account.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  style={[styles.confirmCancelBtn, { borderColor: C.border }]}
                  onPress={() => setShowDeactivateModal(false)}
                  disabled={accountActionLoading}>
                  <Text style={[styles.confirmCancelText, { color: C.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmActionBtn, { backgroundColor: '#F97316', opacity: accountActionLoading ? 0.6 : 1 }]}
                  onPress={confirmDeactivate}
                  disabled={accountActionLoading}>
                  <Text style={styles.confirmActionText}>{accountActionLoading ? 'Deactivating…' : 'Deactivate'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Delete Account Modal ─────────────────────────────── */}
        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <Pressable style={styles.confirmOverlay} onPress={() => { if (!accountActionLoading) setShowDeleteModal(false); }}>
            <Pressable style={[styles.confirmCard, { backgroundColor: C.surface }]} onPress={() => {}}>
              <View style={[styles.dangerBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={styles.dangerBannerIcon}>⚠️</Text>
                <Text style={[styles.dangerBannerText, { color: '#DC2626' }]}>This action is permanent and irreversible</Text>
              </View>
              <View style={[styles.confirmIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.confirmIcon}>🗑️</Text>
              </View>
              <Text style={[styles.confirmTitle, { color: '#DC2626' }]}>Delete Account</Text>
              <Text style={[styles.confirmBody, { color: C.textSecondary }]}>
                Once deleted, the following <Text style={{ fontWeight: '700', color: C.text }}>cannot be recovered</Text>:{'\n'}
                {'•'} Your profile and social links{'\n'}
                {'•'} Campaign history and proposals{'\n'}
                {'•'} Earnings data and payment info{'\n'}
                {'•'} All messages and content{'\n\n'}
                This action cannot be undone.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  style={[styles.confirmCancelBtn, { borderColor: C.border }]}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={accountActionLoading}>
                  <Text style={[styles.confirmCancelText, { color: C.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmActionBtn, { backgroundColor: '#DC2626', opacity: accountActionLoading ? 0.6 : 1 }]}
                  onPress={confirmDelete}
                  disabled={accountActionLoading}>
                  <Text style={styles.confirmActionText}>{accountActionLoading ? 'Deleting…' : 'Delete Account'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </SafeAreaView>
    </ColorCtx.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
  },
  backArrow: { fontSize: 26, lineHeight: 30 },
  topTitle: { fontSize: 16, fontWeight: '700' },

  sectionHeader: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, marginTop: 20, marginBottom: 6, marginHorizontal: 20,
  },
  card: {
    marginHorizontal: 16, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden',
  },
  hintCard: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  hintText: { fontSize: 13, lineHeight: 18 },
  saveHint: { textAlign: 'center', fontSize: 12, marginTop: 8, marginHorizontal: 16 },
  subLabel: { fontSize: 11, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  subDivider: { height: 1, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navArrow: { fontSize: 18 },
  navValue: { fontSize: 14 },

  chipSection: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  sliderSection: { paddingHorizontal: 16, paddingVertical: 16 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13 },

  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  accountAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  accountName: { fontSize: 16, fontWeight: '700' },
  accountEmail: { fontSize: 13, marginTop: 2 },
  editBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '700' },

  // Language (improved)
  langCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 2, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  langFlag: { fontSize: 32 },
  langNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  langName: { fontSize: 15, fontWeight: '700' },
  langNative: { fontSize: 13 },
  langDesc: { fontSize: 12 },
  activeLangCheck: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeLangCheckText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  inactiveLangCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  soonBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  versionText: { fontSize: 14, fontWeight: '500' },

  socialRow: { alignItems: 'center' },
  socialIconWrap: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  socialEmoji: { fontSize: 20 },
  socialPlatformName: { fontSize: 14, fontWeight: '700' },
  socialMeta: { fontSize: 12, marginTop: 1 },
  socialUrl: { fontSize: 11, marginTop: 1 },
  socialNotConnected: { fontSize: 12, marginTop: 2 },
  socialActions: { flexDirection: 'row', gap: 6 },
  socialEditBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  socialEditBtnText: { fontSize: 12, fontWeight: '700' },
  socialDisconnectBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  socialDisconnectText: { fontSize: 12, fontWeight: '700' },

  // ── Social sheet modal ──────────────────────────────────────────────────────
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  socialSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginTop: 10 },
  sheetHeader: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  sheetHeaderInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetPlatformIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sheetSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  sheetBody: { padding: 20, paddingBottom: 36 },
  sheetSection: { marginBottom: 20 },
  sheetLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  sheetFieldError: { fontSize: 12, fontWeight: '500', marginTop: 5 },
  sheetFieldHint: { fontSize: 11, marginTop: 5 },

  // Platform grid
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  platformGridItem: {
    width: '30%', borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 6, position: 'relative', overflow: 'hidden',
  },
  platformGridItemDisabled: { opacity: 0.5 },
  platformGridEmoji: { fontSize: 24 },
  platformGridLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  platformGridAddedBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  platformGridAddedText: { fontSize: 9, fontWeight: '800' },
  platformGridSelectedDot: { position: 'absolute', bottom: 6, width: 6, height: 6, borderRadius: 3 },

  // Inputs inside sheet
  sheetInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, minHeight: 50 },
  sheetInputPrefix: { fontSize: 18, marginRight: 6 },
  sheetInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  sheetCountBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  sheetCountBadgeText: { fontSize: 13, fontWeight: '800' },

  // Sheet action buttons
  sheetActions: { gap: 10, marginTop: 6 },
  sheetSaveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  sheetSaveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetSpinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' },
  sheetSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sheetCancelBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  sheetCancelBtnText: { fontSize: 14, fontWeight: '600' },

  // Add social button (dashed)
  addSocialBtn: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 15, alignItems: 'center' },
  addSocialBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  // Empty state
  socialEmptyState: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 6 },
  socialEmptyIcon: { fontSize: 36, marginBottom: 4 },
  socialEmptyTitle: { fontSize: 15, fontWeight: '700' },
  socialEmptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Follower badge on account cards
  socialMetaRow: { flexDirection: 'row', marginTop: 3, marginBottom: 2 },
  socialFollowerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  socialFollowerBadgeText: { fontSize: 11, fontWeight: '700' },

  // Form section title (kept for other uses)
  formSectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16 },
  connectBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  connectBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  inlineForm: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 12 },
  formField: { gap: 4 },
  formFieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  formTextarea: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 120 },
  fieldError: { fontSize: 12, fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cancelBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },

  pwRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12 },
  pwInput: { flex: 1, fontSize: 14, paddingVertical: 11 },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },

  portfolioType: { fontSize: 14, fontWeight: '600' },
  portfolioUrl: { fontSize: 12, marginTop: 2 },
  portfolioActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  portfolioActionText: { fontSize: 13, fontWeight: '600' },
  portfolioSep: { fontSize: 13 },
  addPortfolioBtn: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 14 },
  addPortfolioBtnText: { fontSize: 14, fontWeight: '700' },

  earningsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 16 },
  earningsStat: { alignItems: 'center', gap: 4 },
  earningsValue: { fontSize: 22, fontWeight: '800' },
  earningsLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  earningsSkeletonValue: { width: 52, height: 26, borderRadius: 6, marginBottom: 2 },

  paymentIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  paymentEmoji: { fontSize: 20 },
  checkboxOuter: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '800' },

  verifiedBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },

  // FAQ / legal
  faqCard: { borderRadius: 12, padding: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  faqQ: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  faqA: { fontSize: 13, lineHeight: 19 },
  helpSkeletonQ: { height: 14, borderRadius: 7, marginBottom: 8, width: '80%' },
  helpSkeletonA: { height: 11, borderRadius: 5, marginBottom: 4, width: '100%' },
  helpEmpty: { margin: 20, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8 },
  helpEmptyIcon: { fontSize: 36 },
  helpEmptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  helpEmptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  legalDate: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  legalSection: { paddingVertical: 14, borderBottomWidth: 1, gap: 6 },
  legalTitle: { fontSize: 14, fontWeight: '700' },
  legalBody: { fontSize: 13, lineHeight: 20 },
  guideCard: { borderRadius: 14, padding: 16, gap: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guideIcon: { fontSize: 22 },
  guideTitle: { fontSize: 15, fontWeight: '700' },
  guideBody: { fontSize: 13, lineHeight: 20 },

  // Toast
  toast: {
    position: 'absolute', bottom: 32, left: 32, right: 32,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  // Confirmation modals
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmCard: {
    width: '100%', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  confirmIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  confirmIcon: { fontSize: 26 },
  confirmTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  confirmBody: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, fontWeight: '600' },
  confirmActionBtn: {
    flex: 1, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dangerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 20,
  },
  dangerBannerIcon: { fontSize: 16 },
  dangerBannerText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 18 },
});
