import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import { isPaymentMethodId } from '@/utilities/paymentMethods';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { creatorService } from '@/services/creator';
import { authService } from '@/services/auth';
import { useLanguage } from '@/context/LanguageContext';
import { API_BASE, request } from '@/lib/api';
import {
  ActivityIndicator,
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
import { AppModal } from '@/components/AppModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { useGoogleAccessToken } from '@/hooks/useGoogleAccessToken';
import { useFacebookAccessToken } from '@/hooks/useFacebookAccessToken';
import * as WebBrowser from 'expo-web-browser';
import type { FacebookPageOption } from '@/services/creator';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { COLORS, F } from '@/utilities/constants';
import { pickAndUpload } from '@/utilities/uploadImage';

type ColorsType = typeof COLORS;
const ColorCtx = createContext<ColorsType>(COLORS);

// ── Static config ─────────────────────────────────────────────

// Platforms with a real "Connect Account" OAuth flow (pulls profile URL + follower/
// subscriber count directly from the platform — no manual entry). YouTube and TikTok
// are wired up; Facebook/Instagram need Meta App Review first before they can go from
// "Coming soon" to functional. TikTok's follower count stays 0 until the app's
// user.info.stats scope passes TikTok's review — only user.info.basic is live today.
const CONNECTABLE_SOCIAL_PLATFORMS: { id: string; label: string; iconName: string; color: string; followersLabel: string }[] = [
  { id: 'tiktok',    label: 'TikTok',     iconName: 'tiktok',    color: '#010101', followersLabel: 'Followers' },
  { id: 'facebook',  label: 'Facebook',   iconName: 'facebook',  color: '#1877F2', followersLabel: 'Followers' },
  { id: 'instagram', label: 'Instagram',  iconName: 'instagram', color: '#E1306C', followersLabel: 'Followers' },
  { id: 'youtube',   label: 'YouTube',    iconName: 'youtube',   color: '#FF0000', followersLabel: 'Subscribers' },
];
const OAUTH_LIVE_PLATFORM_IDS = new Set(['youtube', 'tiktok', 'facebook', 'instagram']);

// Remaining platforms still use manual entry (no OAuth data-access app for these is
// in scope right now).
const ALL_SOCIAL_PLATFORMS: { id: string; label: string; iconName: string; color: string; followersLabel: string }[] = [
  { id: 'twitter',   label: 'X (Twitter)', iconName: 'twitter',  color: '#1DA1F2', followersLabel: 'Followers' },
  { id: 'linkedin',  label: 'LinkedIn',   iconName: 'linkedin',  color: '#0A66C2', followersLabel: 'Connections' },
  { id: 'pinterest', label: 'Pinterest',  iconName: 'pinterest', color: '#E60023', followersLabel: 'Followers' },
  { id: 'snapchat',  label: 'Snapchat',   iconName: 'snapchat',  color: '#FFFC00', followersLabel: 'Friends' },
  { id: 'twitch',    label: 'Twitch',     iconName: 'twitch',    color: '#9146FF', followersLabel: 'Followers' },
];

// Union of both — used to look up label/icon/color for ANY existing account
// (including ones from before this redesign, e.g. a manually-added Instagram row).
const PLATFORM_CONFIG: Record<string, { id: string; label: string; iconName: string; color: string; followersLabel: string }> =
  Object.fromEntries([...CONNECTABLE_SOCIAL_PLATFORMS, ...ALL_SOCIAL_PLATFORMS].map((p) => [p.id, p]));

const PORTFOLIO_TYPES: { id: string; label: string; iconName: string; iconLib: 'fa5' | 'ion'; color: string; urlHint: string }[] = [
  { id: 'instagram', label: 'Instagram',   iconName: 'logo-instagram',    iconLib: 'ion', color: '#E1306C', urlHint: 'e.g. CxYz1AbC2d' },
  { id: 'tiktok',    label: 'TikTok',      iconName: 'logo-tiktok',       iconLib: 'ion', color: '#010101', urlHint: 'e.g. yourhandle/video/7123456789012345678' },
  { id: 'youtube',   label: 'YouTube',     iconName: 'logo-youtube',      iconLib: 'ion', color: '#FF0000', urlHint: 'e.g. dQw4w9WgXcQ' },
  { id: 'facebook',  label: 'Facebook',    iconName: 'logo-facebook',     iconLib: 'ion', color: '#1877F2', urlHint: 'e.g. 1234567890123456' },
  { id: 'twitter',   label: 'X / Twitter', iconName: 'logo-twitter',      iconLib: 'ion', color: '#1DA1F2', urlHint: 'e.g. 1717171717171717171' },
  { id: 'blog',      label: 'Blog Post',   iconName: 'newspaper-outline', iconLib: 'ion', color: '#F59E0B', urlHint: 'https://yourblog.com/post-title' },
  { id: 'website',   label: 'Website',     iconName: 'globe-outline',     iconLib: 'ion', color: '#6366F1', urlHint: 'https://yourwebsite.com' },
  { id: 'photo',     label: 'Photography', iconName: 'camera-outline',    iconLib: 'ion', color: '#10B981', urlHint: 'https://...' },
  { id: 'video',     label: 'Other Video', iconName: 'videocam-outline',  iconLib: 'ion', color: '#EF4444', urlHint: 'https://...' },
];

const PORTFOLIO_CONFIG: Record<string, typeof PORTFOLIO_TYPES[0]> =
  Object.fromEntries(PORTFOLIO_TYPES.map((p) => [p.id, p]));

// Platforms where the creator can just type the content ID and we build the full link ourselves.
const PORTFOLIO_URL_PREFIX: Record<string, string> = {
  instagram: 'https://www.instagram.com/reels/',
  tiktok:    'https://www.tiktok.com/@',
  youtube:   'https://www.youtube.com/watch?v=',
  facebook:  'https://www.facebook.com/watch/?v=',
  twitter:   'https://x.com/i/status/',
};

/** Builds the final portfolio link from whatever the creator typed — a bare ID, or a full URL they pasted themselves. */
function buildPortfolioUrl(type: string, idOrUrl: string): string {
  const trimmed = idOrUrl.trim();
  const prefix = PORTFOLIO_URL_PREFIX[type];
  if (!prefix || /^https?:\/\//i.test(trimmed)) return trimmed;
  return prefix + trimmed.replace(/^\/+/, '');
}

function PlatformIcon({ iconName, iconLib, size, color, style }: { iconName: string; iconLib?: 'fa5' | 'ion'; size: number; color: string; style?: any }) {
  if (iconLib === 'ion') return <Ionicons name={iconName as any} size={size} color={color} style={style} />;
  return <FontAwesome5 name={iconName as any} size={size} color={color} style={style} />;
}

const PAYMENT_METHODS = [
  { id: 'esewa',   icon: 'wallet',       label: 'eSewa',   color: '#60BB46' },
  { id: 'khalti',  icon: 'money-check-alt', label: 'Khalti',  color: '#5C2D91' },
  { id: 'fonepay', icon: 'credit-card',  label: 'FonePay', color: '#003087' },
] as const;

const LANGUAGE_OPTIONS = [
  { label: 'English', native: 'English', flag: '🇬🇧', desc: 'Default app language', future: false },
  { label: 'Nepali',  native: 'नेपाली',  flag: '🇳🇵', desc: 'स्थानीय भाषा समर्थन', future: false },
  { label: 'Hindi',   native: 'हिंदी',   flag: '🇮🇳', desc: 'Coming soon',         future: true  },
];

const SECTION_TITLES: Record<string, string> = {
  social:      'creatorSettings.sectionSocial',
  earnings:    'creatorSettings.sectionEarnings',
  'past-work': 'creatorSettings.sectionPastWork',
  security:    'creatorSettings.sectionSecurity',
  support:     'creatorSettings.sectionSupport',
  legal:       'creatorSettings.sectionLegal',
};

const SUB_PAGE_TITLES: Record<string, string> = {
  'help-center':      'creatorSettings.subHelpCenter',
  'contact-support':  'creatorSettings.subContactSupport',
  'report-issue':     'creatorSettings.subReportIssue',
  'faqs':             'creatorSettings.subFaqs',
  'privacy-policy':   'creatorSettings.subPrivacyPolicy',
  'terms':            'creatorSettings.subTerms',
  'guidelines':       'creatorSettings.subGuidelines',
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

type SwitchRowProps = { label: string; faIcon?: string; faIconColor?: string; value: boolean; onChange: () => void; isLast?: boolean };
function SwitchRow({ label, faIcon, faIconColor, value, onChange, isLast = false }: SwitchRowProps) {
  const C = useContext(ColorCtx);
  const iColor = faIconColor ?? C.brinjal1;
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      {faIcon ? (
        <View style={[styles.navIonIconWrap, { backgroundColor: iColor + '18' }]}>
          <FontAwesome5 name={faIcon as any} size={16} color={iColor} />
        </View>
      ) : null}
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

type NavRowProps = { faIcon?: string; faIconColor?: string; ionIcon?: keyof typeof Ionicons.glyphMap; ionIconColor?: string; label: string; value?: string; onPress: () => void; danger?: boolean; isLast?: boolean };
function NavRow({ faIcon, faIconColor, ionIcon, ionIconColor, label, value, onPress, danger = false, isLast = false }: NavRowProps) {
  const C = useContext(ColorCtx);
  const iColor = ionIconColor ?? faIconColor ?? C.brinjal1;
  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]} onPress={onPress}>
      {ionIcon ? (
        <View style={[styles.navIonIconWrap, { backgroundColor: iColor + '18' }]}>
          <Ionicons name={ionIcon} size={18} color={iColor} />
        </View>
      ) : faIcon ? (
        <View style={[styles.navIonIconWrap, { backgroundColor: (danger ? C.error : iColor) + '18' }]}>
          <FontAwesome5 name={faIcon as any} size={16} color={danger ? C.error : iColor} />
        </View>
      ) : null}
      <Text style={[styles.rowLabel, { color: danger ? C.error : C.text }]}>{label}</Text>
      <View style={styles.navRight}>
        {value ? <Text style={[styles.navValue, { color: C.textSecondary }]}>{value}</Text> : null}
        <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function CreatorSettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleDark } = useIsDark();
  const { language, setLanguage, t } = useLanguage();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const C: ColorsType = useAppColors();
  const toast = useToast();

  const [subPage, setSubPage] = useState<string | null>(null);

  // Social accounts state (API-driven)
  type SocialAccount = { id: string; platform: string; profileUrl: string; followers: number; connectedViaOAuth?: boolean };
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const keyboardOffset = useKeyboardOffset();
  const youtubeAuth = useGoogleAccessToken(['https://www.googleapis.com/auth/youtube.readonly']);
  const facebookPagesAuth = useFacebookAccessToken(['pages_show_list', 'pages_read_engagement', 'instagram_basic']);
  // When a creator manages more than one Facebook Page, they pick which one to connect
  // (or which one's linked Instagram account to connect) here.
  const [pagePicker, setPagePicker] = useState<{ mode: 'facebook' | 'instagram'; accessToken: string; pages: FacebookPageOption[] } | null>(null);

  // Portfolio (in Social section)
  type PortfolioItem = { id: string; label: string; url: string };
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [showPortfolioSheet, setShowPortfolioSheet] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({ type: '', url: '' });
  const [portfolioFormErrors, setPortfolioFormErrors] = useState<Record<string, string>>({});
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const portfolioSheetAnim = useRef(new Animated.Value(0)).current;

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

  // Account action modals (kept for legacy renders if any)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal,     setShowDeleteModal]     = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  // Confirmation modal
  const [appModal, setAppModal] = useState({ visible: false, title: '', body: '', confirmLabel: '', type: 'danger' as 'danger' | 'warning', warning: undefined as string | undefined, onConfirm: async () => {} });
  function closeAppModal() { setAppModal((m) => ({ ...m, visible: false })); }

  // Support / Report submitting
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Language — synced to LanguageContext
  const langLabelToCode = (label: string): 'en' | 'ne' => label === 'Nepali' ? 'ne' : 'en';
  const langCodeToLabel = (code: string): string => code === 'ne' ? 'Nepali' : 'English';
  const [selectedLang, setSelectedLang] = useState(() => langCodeToLabel(language));

  // Email/phone verification
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  // Citizenship verification
  const [citizenshipStatus, setCitizenshipStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NONE');
  const [creatorIsVerified, setCreatorIsVerified] = useState(false);
  const [citizenshipUploading, setCitizenshipUploading] = useState(false);

  // Phone verification sub-page
  const [phoneSubPage, setPhoneSubPage] = useState<'input' | 'otp' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Email verification sub-page — for accounts that signed up via phone and
  // still hold a placeholder email (mirrors the phone verification flow above)
  const [emailSubPage, setEmailSubPage] = useState<'input' | 'otp' | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  // Change password — inline collapsible panel (Security section)
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Accordion (support / legal sub-pages)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  function toggleExpand(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
      // Email verified status from DB
      if (profile.user?.isEmailVerified != null) setEmailVerified(profile.user.isEmailVerified);
      if (profile.citizenshipStatus) setCitizenshipStatus(profile.citizenshipStatus);
      setCreatorIsVerified(profile.isVerified === true);
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

  useEffect(() => { setExpandedItems(new Set()); }, [subPage]);

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

  function handleConnectYoutube() {
    setConnectingPlatform('youtube');
    youtubeAuth.prompt((accessToken) => {
      creatorService.connectYoutubeAccount(accessToken)
        .then((account) => {
          setSocialAccounts((prev) => {
            const without = prev.filter((a) => a.platform !== 'youtube');
            return [...without, { id: account.id, platform: account.platform, profileUrl: account.profileUrl, followers: account.followers, connectedViaOAuth: account.connectedViaOAuth }];
          });
          showToast(t('creatorSettings.socialAddedToast'));
        })
        .catch((e) => showToast(e instanceof Error ? e.message : t('creatorSettings.socialSaveFailed'), true))
        .finally(() => setConnectingPlatform(null));
    });
  }

  useEffect(() => {
    if (youtubeAuth.error) {
      showToast(youtubeAuth.error, true);
      setConnectingPlatform(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeAuth.error]);

  // TikTok requires an HTTPS redirect URI (no custom app-scheme redirects), so unlike
  // YouTube the code exchange happens server-side: the backend hands back a TikTok
  // authorize URL, we open it in a browser, and TikTok's redirect lands on our API,
  // which saves the account and then 302s back into the app via the kolab:// scheme.
  async function handleConnectTiktok() {
    setConnectingPlatform('tiktok');
    try {
      const url = await creatorService.getTiktokAuthorizeUrl();
      // preferEphemeralSession (iOS) stops the login screen from silently reusing the
      // TikTok account already logged into the shared browser session — otherwise a
      // creator who disconnects can't switch to a different TikTok account.
      const result = await WebBrowser.openAuthSessionAsync(url, 'kolab://tiktok-callback', { preferEphemeralSession: true });
      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const success = parsed.searchParams.get('success') === 'true';
        if (success) {
          const accounts = await creatorService.getSocialAccounts();
          setSocialAccounts(accounts);
          showToast(t('creatorSettings.socialAddedToast'));
        } else {
          const error = parsed.searchParams.get('error') ?? t('creatorSettings.socialSaveFailed');
          showToast(error, true);
        }
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('creatorSettings.socialSaveFailed'), true);
    } finally {
      setConnectingPlatform(null);
    }
  }

  // Facebook only exposes follower counts for Pages (never personal profiles), and an
  // Instagram Business account's stats are only reachable via the Facebook Page it's
  // linked to — so both buttons share this one Facebook Login + Page-listing step, and
  // just differ in which pages qualify and which fields get saved.
  function handleConnectFacebook() {
    setConnectingPlatform('facebook');
    facebookPagesAuth.prompt(async (accessToken) => {
      try {
        const pages = await creatorService.getFacebookPages(accessToken);
        if (pages.length === 0) {
          showToast(t('creatorSettings.noFacebookPages'), true);
          setConnectingPlatform(null);
          return;
        }
        if (pages.length === 1) {
          await finishFacebookConnect(accessToken, pages[0].id);
          return;
        }
        setPagePicker({ mode: 'facebook', accessToken, pages });
        setConnectingPlatform(null);
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('creatorSettings.socialSaveFailed'), true);
        setConnectingPlatform(null);
      }
    });
  }

  function handleConnectInstagram() {
    setConnectingPlatform('instagram');
    facebookPagesAuth.prompt(async (accessToken) => {
      try {
        const pages = (await creatorService.getFacebookPages(accessToken)).filter((p) => p.hasInstagram);
        if (pages.length === 0) {
          showToast(t('creatorSettings.noInstagramPages'), true);
          setConnectingPlatform(null);
          return;
        }
        if (pages.length === 1) {
          await finishInstagramConnect(accessToken, pages[0].id);
          return;
        }
        setPagePicker({ mode: 'instagram', accessToken, pages });
        setConnectingPlatform(null);
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('creatorSettings.socialSaveFailed'), true);
        setConnectingPlatform(null);
      }
    });
  }

  useEffect(() => {
    if (facebookPagesAuth.error) {
      showToast(facebookPagesAuth.error, true);
      setConnectingPlatform(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebookPagesAuth.error]);

  async function finishFacebookConnect(accessToken: string, pageId: string) {
    setConnectingPlatform('facebook');
    try {
      const account = await creatorService.connectFacebookPage(accessToken, pageId);
      setSocialAccounts((prev) => {
        const without = prev.filter((a) => a.platform !== 'facebook');
        return [...without, { id: account.id, platform: account.platform, profileUrl: account.profileUrl, followers: account.followers, connectedViaOAuth: account.connectedViaOAuth }];
      });
      showToast(t('creatorSettings.socialAddedToast'));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('creatorSettings.socialSaveFailed'), true);
    } finally {
      setConnectingPlatform(null);
      setPagePicker(null);
    }
  }

  async function finishInstagramConnect(accessToken: string, pageId: string) {
    setConnectingPlatform('instagram');
    try {
      const account = await creatorService.connectInstagramAccount(accessToken, pageId);
      setSocialAccounts((prev) => {
        const without = prev.filter((a) => a.platform !== 'instagram');
        return [...without, { id: account.id, platform: account.platform, profileUrl: account.profileUrl, followers: account.followers, connectedViaOAuth: account.connectedViaOAuth }];
      });
      showToast(t('creatorSettings.socialAddedToast'));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('creatorSettings.socialSaveFailed'), true);
    } finally {
      setConnectingPlatform(null);
      setPagePicker(null);
    }
  }

  function deleteSocialAccount(acct: SocialAccount) {
    const cfg = PLATFORM_CONFIG[acct.platform];
    setAppModal({
      visible: true, type: 'danger',
      title: t('creatorSettings.removeAccountTitle', { platform: cfg?.label ?? acct.platform }),
      body: t('creatorSettings.removeAccountBody'),
      confirmLabel: t('common.remove'),
      warning: undefined,
      onConfirm: async () => {
        closeAppModal();
        try {
          await creatorService.deleteSocialAccount(acct.id);
          setSocialAccounts((prev) => prev.filter((a) => a.id !== acct.id));
          showToast(t('creatorSettings.socialRemovedToast'));
        } catch { showToast(t('creatorSettings.socialRemoveFailed'), true); }
      },
    });
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
    if (!portfolioForm.type) errors.type = t('creatorSettings.errSelectContentType');
    const raw = portfolioForm.url.trim();
    if (!raw) { errors.url = t('creatorSettings.errUrlRequired'); return errors; }

    const hasPrefix = !!PORTFOLIO_URL_PREFIX[portfolioForm.type];
    if (hasPrefix && !/^https?:\/\//i.test(raw) && /\s/.test(raw)) {
      errors.url = t('creatorSettings.errInvalidId');
    } else {
      try { new URL(buildPortfolioUrl(portfolioForm.type, raw)); } catch { errors.url = t('creatorSettings.errInvalidUrl'); }
    }
    return errors;
  }

  async function savePortfolio() {
    const errors = validatePortfolioForm();
    if (Object.keys(errors).length > 0) { setPortfolioFormErrors(errors); return; }
    setPortfolioLoading(true);
    try {
      const finalUrl = buildPortfolioUrl(portfolioForm.type, portfolioForm.url);
      if (editingPortfolioId) {
        await creatorService.removePortfolioLink(editingPortfolioId);
        const updated = await creatorService.addPortfolioLink(portfolioForm.type, finalUrl);
        setPortfolio(updated.portfolioLinks);
      } else {
        const updated = await creatorService.addPortfolioLink(portfolioForm.type, finalUrl);
        setPortfolio(updated.portfolioLinks);
      }
      resetPortfolioSheet();
      showToast(editingPortfolioId ? t('creatorSettings.pastWorkUpdatedToast') : t('creatorSettings.pastWorkAddedToast'));
    } catch (err: unknown) {
      setPortfolioFormErrors({ url: err instanceof Error ? err.message : t('creatorSettings.pastWorkSaveFailed') });
    } finally {
      setPortfolioLoading(false);
    }
  }

  function deletePortfolio(item: PortfolioItem) {
    const cfg = PORTFOLIO_CONFIG[item.label];
    setAppModal({
      visible: true, type: 'danger',
      title: t('creatorSettings.removeWorkTitle', { item: cfg?.label ?? item.label }),
      body: t('creatorSettings.removeWorkBody'),
      confirmLabel: t('common.remove'),
      warning: undefined,
      onConfirm: async () => {
        closeAppModal();
        try {
          const updated = await creatorService.removePortfolioLink(item.id);
          setPortfolio(updated.portfolioLinks);
          showToast(t('creatorSettings.pastWorkRemovedToast'));
        } catch { showToast(t('creatorSettings.pastWorkRemoveFailed'), true); }
      },
    });
  }

  function handleChangePassword() {
    setPwSubmitted(true);
    const pwOk = newPw.length >= 8;
    const matchOk = newPw === confirmPw;
    if (pwOk && matchOk) {
      setNewPw(''); setConfirmPw(''); setPwSubmitted(false);
      showToast(t('creatorSettings.pwChangedToast'));
      setShowChangePassword(false);
    }
  }

  function closeChangePassword() {
    setShowChangePassword(false);
    setNewPw(''); setConfirmPw(''); setPwSubmitted(false);
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
      showToast(t('creatorSettings.deactivatedToast'));
      setTimeout(logout, 1800);
    } catch {
      showToast(t('creatorSettings.deactivateFailed'));
    } finally {
      setAccountActionLoading(false);
    }
  }

  async function confirmDelete() {
    setAccountActionLoading(true);
    try {
      await creatorService.deleteAccount();
      setShowDeleteModal(false);
      showToast(t('creatorSettings.deletedToast'));
      setTimeout(logout, 1800);
    } catch {
      showToast(t('creatorSettings.deleteFailed'));
    } finally {
      setAccountActionLoading(false);
    }
  }

  function handleLogoutAll() {
    setAppModal({
      visible: true, type: 'warning',
      title: t('creatorSettings.logoutAllTitle'),
      body: t('creatorSettings.logoutAllBody'),
      confirmLabel: t('creatorSettings.logoutAllConfirm'),
      warning: undefined,
      onConfirm: async () => { closeAppModal(); logout(); },
    });
  }

  async function handleSupportSubmit() {
    if (!supportMsg.trim() || !supportTopic) return;
    setSupportSubmitting(true);
    try {
      await request('POST', '/api/support/contact', { topic: supportTopic, message: supportMsg.trim() });
      setSupportTopic(''); setSupportMsg('');
      showToast(t('creatorSettings.supportSentToast'));
      setSubPage(null);
    } catch {
      showToast(t('creatorSettings.supportSendFailed'), true);
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
      showToast(t('creatorSettings.reportSentToast'));
      setSubPage(null);
    } catch {
      showToast(t('creatorSettings.reportSendFailed'), true);
    } finally {
      setReportSubmitting(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────

  function handleBack() {
    if (phoneSubPage) { setPhoneSubPage(null); setPhoneNumber(''); setPhoneOtp(''); }
    else if (subPage) setSubPage(null);
    else router.back();
  }

  const topTitle = subPage
    ? t(SUB_PAGE_TITLES[subPage] ?? 'creatorSettings.settings')
    : section
    ? t(SECTION_TITLES[section] ?? 'creatorSettings.settings')
    : t('creatorSettings.settings');

  // ── Sub-page: Help Center ─────────────────────────────────────

  function renderHelpCenter() {
    if (helpLoading) {
      return (
        <View style={{ marginHorizontal: 16, gap: 8, marginTop: 8 }}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.accordionHeader}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border, flex: 1 }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (helpArticles.length === 0) {
      return (
        <View style={[styles.helpEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
          <FontAwesome5 name="question-circle" size={36} color={C.textSecondary} />
          <Text style={[styles.helpEmptyTitle, { color: C.text }]}>{t('creatorSettings.noHelpArticles')}</Text>
          <Text style={[styles.helpEmptySubtitle, { color: C.textSecondary }]}>{t('creatorSettings.noHelpArticlesSub')}</Text>
        </View>
      );
    }

    const grouped: Record<string, typeof helpArticles> = {};
    for (const a of helpArticles) {
      (grouped[a.category] ??= []).push(a);
    }

    return (
      <>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight, marginBottom: 0 }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('creatorSettings.helpFindAnswers')}</Text>
        </View>
        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat}>
            <SectionHeader title={cat} />
            <View style={{ marginHorizontal: 16, gap: 8 }}>
              {items.map((item) => {
                const open = expandedItems.has(item.id);
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={item.id}
                    style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
                    onPress={() => toggleExpand(item.id)}>
                    <View style={styles.accordionHeader}>
                      <Text style={[styles.accordionTitle, { color: C.text }]}>{item.question}</Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
                    </View>
                    {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{item.answer}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </>
    );
  }

  // ── Sub-page: Contact Support ─────────────────────────────────

  const SUPPORT_TOPICS = ['Technical Issue', 'Payment Problem', 'Event Issue', 'Account Help', 'Other'];

  function renderContactSupport() {
    return (
      <>
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('creatorSettings.topicLabel')}</Text>
              <View style={styles.chipGroup}>
                {SUPPORT_TOPICS.map((topic) => {
                  const active = supportTopic === topic;
                  return (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={topic} style={[styles.chip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]} onPress={() => setSupportTopic(topic)}>
                      <Text style={[styles.chipText, { color: active ? C.brinjal1 : C.text }]}>{topic}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('creatorSettings.messageLabel')}</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={supportMsg}
                onChangeText={setSupportMsg}
                placeholder={t('creatorSettings.supportMsgPlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.saveBtn, { backgroundColor: C.brinjal1, opacity: (supportMsg.trim() && supportTopic && !supportSubmitting) ? 1 : 0.45 }]}
              onPress={handleSupportSubmit}
              disabled={supportSubmitting}>
              <Text style={styles.saveBtnText}>{supportSubmitting ? t('creatorSettings.sendingMsg') : t('creatorSettings.sendMessageBtn')}</Text>
            </Pressable>
          </View>
        </Card>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('creatorSettings.supportEmailHint')}</Text>
        </View>
      </>
    );
  }

  // ── Sub-page: Report Issue ────────────────────────────────────

  const REPORT_TYPES = ['App Bug', 'Payment Issue', 'Event Problem', 'Inappropriate Content', 'Other'];

  function renderReportIssue() {
    return (
      <>
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('creatorSettings.issueTypeLabel')}</Text>
              <View style={styles.chipGroup}>
                {REPORT_TYPES.map((rtype) => {
                  const active = reportType === rtype;
                  return (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={rtype} style={[styles.chip, { borderColor: active ? C.error : C.border, backgroundColor: active ? '#FEE2E2' : C.surface }]} onPress={() => setReportType(rtype)}>
                      <Text style={[styles.chipText, { color: active ? C.error : C.text }]}>{rtype}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('creatorSettings.descriptionLabel')}</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={reportDesc}
                onChangeText={setReportDesc}
                placeholder={t('creatorSettings.reportDescPlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.saveBtn, { backgroundColor: C.error, opacity: (reportDesc.trim() && reportType && !reportSubmitting) ? 1 : 0.45 }]}
              onPress={handleReportSubmit}
              disabled={reportSubmitting}>
              <Text style={styles.saveBtnText}>{reportSubmitting ? t('creatorSettings.submittingReport') : t('creatorSettings.submitReportBtn')}</Text>
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
        <View style={{ marginHorizontal: 16, gap: 8, marginTop: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.accordionHeader}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border, flex: 1 }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (faqArticles.length === 0) {
      return (
        <View style={[styles.helpEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
          <FontAwesome5 name="comments" size={36} color={C.textSecondary} />
          <Text style={[styles.helpEmptyTitle, { color: C.text }]}>{t('creatorSettings.noFaqsTitle')}</Text>
          <Text style={[styles.helpEmptySubtitle, { color: C.textSecondary }]}>{t('creatorSettings.noFaqsSub')}</Text>
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
            <View style={{ marginHorizontal: 16, gap: 8 }}>
              {items.map((item) => {
                const open = expandedItems.has(item.id);
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={item.id}
                    style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
                    onPress={() => toggleExpand(item.id)}>
                    <View style={styles.accordionHeader}>
                      <Text style={[styles.accordionTitle, { color: C.text }]}>{item.question}</Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
                    </View>
                    {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{item.answer}</Text>}
                  </Pressable>
                );
              })}
            </View>
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
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.accordionHeader}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border, flex: 1 }]} />
              </View>
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
        <View style={{ gap: 8 }}>
          {(sections ?? []).map((s) => {
            const open = expandedItems.has(s.id);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={s.id}
                style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
                onPress={() => toggleExpand(s.id)}>
                <View style={styles.accordionHeader}>
                  <Text style={[styles.accordionTitle, { color: C.text }]}>{s.title}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
                </View>
                {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{s.body}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Sub-page: Terms & Conditions ──────────────────────────────

  function renderTerms() {
    const sections = legalSections['terms'];
    const lastUpdated = legalLastUpdated['terms'];
    if (legalLoading && !sections) {
      return (
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          {[1,2,3,4].map((i) => (
            <View key={i} style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.accordionHeader}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border, flex: 1 }]} />
              </View>
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
        <View style={{ gap: 8 }}>
          {(sections ?? []).map((s) => {
            const open = expandedItems.has(s.id);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={s.id}
                style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
                onPress={() => toggleExpand(s.id)}>
                <View style={styles.accordionHeader}>
                  <Text style={[styles.accordionTitle, { color: C.text }]}>{s.title}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
                </View>
                {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{s.body}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Sub-page: Community Guidelines ───────────────────────────

  function renderGuidelines() {
    const sections = legalSections['guidelines'];
    if (legalLoading && !sections) {
      return (
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          {[1,2,3].map((i) => (
            <View key={i} style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.accordionHeader}>
                <View style={[styles.helpSkeletonQ, { backgroundColor: C.border, flex: 1 }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    return (
      <View style={{ marginHorizontal: 16, gap: 8 }}>
        {(sections ?? []).map((s) => {
          const open = expandedItems.has(s.id);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={s.id}
              style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
              onPress={() => toggleExpand(s.id)}>
              <View style={styles.accordionHeader}>
                {s.icon ? <Text style={styles.accordionIcon}>{s.icon}</Text> : null}
                <Text style={[styles.accordionTitle, { color: C.text }]}>{s.title}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
              </View>
              {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{s.body}</Text>}
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Section: Social Accounts ──────────────────────────────────

  function renderSocialAccounts() {
    const connectablePlatformIds = new Set(CONNECTABLE_SOCIAL_PLATFORMS.map((p) => p.id));
    const connectedByPlatform = new Map(socialAccounts.filter((a) => connectablePlatformIds.has(a.platform)).map((a) => [a.platform, a]));

    return (
      <>
        {/* ── Connect Accounts: TikTok, Facebook, Instagram, YouTube ──────
            Pulls profile URL + follower/subscriber count straight from the
            platform via OAuth — nothing to type in. ── */}
        <Card>
          {CONNECTABLE_SOCIAL_PLATFORMS.map((p, idx) => {
            const acct = connectedByPlatform.get(p.id);
            const isLive = OAUTH_LIVE_PLATFORM_IDS.has(p.id);
            const isConnecting = connectingPlatform === p.id;
            const isLast = idx === CONNECTABLE_SOCIAL_PLATFORMS.length - 1;
            return (
              <View key={p.id} style={[styles.row, styles.socialRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                <View style={[styles.socialIconWrap, { backgroundColor: p.color + '18' }]}>
                  <PlatformIcon iconName={p.iconName} size={20} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.connectPlatformNameRow}>
                    <Text style={[styles.socialPlatformName, { color: C.text }]}>{p.label}</Text>
                    {acct?.connectedViaOAuth && (
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    )}
                  </View>
                  {acct ? (
                    <>
                      <View style={styles.socialMetaRow}>
                        <View style={[styles.socialFollowerBadge, { backgroundColor: p.color + '15' }]}>
                          <Text style={[styles.socialFollowerBadgeText, { color: p.color }]}>
                            {fmt(String(acct.followers))} {p.followersLabel.toLowerCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.socialUrl, { color: C.textSecondary }]} numberOfLines={1}>{acct.profileUrl}</Text>
                    </>
                  ) : (
                    <Text style={[styles.connectPlatformHint, { color: C.textSecondary }]}>
                      {isLive ? t('creatorSettings.connectHint') : t('creatorSettings.comingSoonHint')}
                    </Text>
                  )}
                </View>
                <View style={styles.socialActions}>
                  {acct ? (
                    <Pressable style={styles.socialDisconnectBtn} onPress={() => deleteSocialAccount(acct)}>
                      <Ionicons name="close" size={14} color={C.error} />
                    </Pressable>
                  ) : isLive ? (
                    <Pressable
                      style={[styles.connectBtn, { backgroundColor: p.color, opacity: isConnecting ? 0.7 : 1 }]}
                      disabled={isConnecting}
                      onPress={() => {
                        if (p.id === 'youtube') handleConnectYoutube();
                        else if (p.id === 'tiktok') void handleConnectTiktok();
                        else if (p.id === 'facebook') handleConnectFacebook();
                        else if (p.id === 'instagram') handleConnectInstagram();
                      }}>
                      {isConnecting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.connectBtnText}>{t('creatorSettings.connectBtn')}</Text>}
                    </Pressable>
                  ) : (
                    <View style={[styles.comingSoonBtn, { borderColor: C.border }]}>
                      <Text style={[styles.comingSoonBtnText, { color: C.textSecondary }]}>{t('creatorSettings.comingSoonBtn')}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        {/* Facebook Page / linked-Instagram picker — only shown when the creator
            manages more than one qualifying Page (auto-selected otherwise). */}
        <Modal visible={!!pagePicker} transparent animationType="fade" onRequestClose={() => setPagePicker(null)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setPagePicker(null)} />
          <View style={[styles.pagePickerSheet, { backgroundColor: C.surface }]}>
            <Text style={[styles.pagePickerTitle, { color: C.text }]}>
              {pagePicker?.mode === 'instagram' ? t('creatorSettings.pickInstagramPage') : t('creatorSettings.pickFacebookPage')}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {pagePicker?.pages.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.pagePickerRow, { borderBottomColor: C.border }]}
                  disabled={connectingPlatform !== null}
                  onPress={() => {
                    if (!pagePicker) return;
                    if (pagePicker.mode === 'facebook') void finishFacebookConnect(pagePicker.accessToken, p.id);
                    else void finishInstagramConnect(pagePicker.accessToken, p.id);
                  }}>
                  <Text style={[styles.pagePickerRowTitle, { color: C.text }]}>
                    {pagePicker?.mode === 'instagram' ? `@${p.instagramUsername ?? p.name}` : p.name}
                  </Text>
                  {pagePicker?.mode === 'facebook' && (
                    <Text style={[styles.pagePickerRowSub, { color: C.textSecondary }]}>{fmt(String(p.fanCount))} {t('creatorSettings.followers')}</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.pagePickerCancel} onPress={() => setPagePicker(null)}>
              <Text style={[styles.pagePickerCancelText, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </Modal>

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
            {
              backgroundColor: C.surface,
              transform: [
                { translateY: portfolioSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) },
                { translateY: keyboardOffset },
              ],
            },
          ]}>
            {/* Header */}
            <View style={[
              styles.sheetHeader,
              { backgroundColor: portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].color : '#6366F1' },
            ]}>
              <View style={styles.sheetHeaderInner}>
                {portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] && (
                  <View style={styles.sheetPlatformIcon}>
                    <PlatformIcon iconName={PORTFOLIO_CONFIG[portfolioForm.type].iconName} iconLib={PORTFOLIO_CONFIG[portfolioForm.type].iconLib} size={28} color="#fff" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>
                    {editingPortfolioId
                      ? t('creatorSettings.editPastWorkModalTitle', { type: PORTFOLIO_CONFIG[portfolioForm.type]?.label ?? 'Work' })
                      : portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type]
                        ? PORTFOLIO_CONFIG[portfolioForm.type].label
                        : t('creatorSettings.addPastWorkModalTitle')}
                  </Text>
                  <Text style={styles.sheetSubtitle}>
                    {editingPortfolioId ? t('creatorSettings.updateWorkSub') : t('creatorSettings.showBrandsBest')}
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
                    <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>{t('creatorSettings.contentTypeLabel')}</Text>
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
                              const prefix = PORTFOLIO_URL_PREFIX[p.id] ?? '';
                              setPortfolioForm((f) => {
                                // Preserve whatever the user typed after the previous platform's
                                // prefix, so switching platforms swaps the prefix shown in the box
                                // instead of leaving the old one stuck in place.
                                const oldPrefix = PORTFOLIO_URL_PREFIX[f.type] ?? '';
                                const handle = f.url.startsWith(oldPrefix) ? f.url.slice(oldPrefix.length) : '';
                                return { ...f, type: p.id, url: prefix + handle };
                              });
                              setPortfolioFormErrors((e) => ({ ...e, type: '' }));
                            }}>
                            <PlatformIcon iconName={p.iconName} iconLib={p.iconLib} size={24} color={isSelected ? p.color : '#888'} />
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
                      <Text style={[styles.sheetLabel, { color: C.textSecondary }]}>
                        {portfolioForm.type && PORTFOLIO_URL_PREFIX[portfolioForm.type] ? t('creatorSettings.linkIdLabel') : t('creatorSettings.linkUrlLabel')}
                      </Text>
                      <View style={[
                        styles.sheetInputWrap,
                        { borderColor: portfolioFormErrors.url ? C.error : (portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].color + '60' : C.border), backgroundColor: C.background },
                      ]}>
                        {portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] && (
                          <PlatformIcon iconName={PORTFOLIO_CONFIG[portfolioForm.type].iconName} iconLib={PORTFOLIO_CONFIG[portfolioForm.type].iconLib} size={14} color={PORTFOLIO_CONFIG[portfolioForm.type].color} style={styles.sheetInputPrefix} />
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
                        : portfolioForm.type && PORTFOLIO_URL_PREFIX[portfolioForm.type]
                          ? <Text style={[styles.sheetFieldHint, { color: C.textSecondary }]}>{t('creatorSettings.linkIdHint')}</Text>
                          : <Text style={[styles.sheetFieldHint, { color: C.textSecondary }]}>{t('creatorSettings.linkUrlHint')}</Text>}
                    </View>

                    <View style={styles.sheetActions}>
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                        style={[
                          styles.sheetSaveBtn,
                          { backgroundColor: portfolioForm.type && PORTFOLIO_CONFIG[portfolioForm.type] ? PORTFOLIO_CONFIG[portfolioForm.type].color : '#6366F1', opacity: portfolioLoading ? 0.6 : 1 },
                        ]}
                        onPress={savePortfolio}
                        disabled={portfolioLoading}>
                        {portfolioLoading ? (
                          <View style={styles.sheetSaveBtnRow}>
                            <View style={styles.sheetSpinner} />
                            <Text style={styles.sheetSaveBtnText}>{t('creatorSettings.savingLabel')}</Text>
                          </View>
                        ) : (
                          <Text style={styles.sheetSaveBtnText}>
                            {editingPortfolioId ? t('creatorSettings.saveChangesBtn') : t('creatorSettings.addWorkBtn', { type: PORTFOLIO_CONFIG[portfolioForm.type]?.label ?? 'Work' })}
                          </Text>
                        )}
                      </Pressable>
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.sheetCancelBtn, { borderColor: C.border }]} onPress={resetPortfolioSheet}>
                        <Text style={[styles.sheetCancelBtnText, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </Modal>

        {/* Empty state */}
        {portfolio.length === 0 && (
          <View style={[styles.socialEmptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
            <FontAwesome5 name="images" size={32} color={C.textSecondary} style={{ marginBottom: 4 }} />
            <Text style={[styles.socialEmptyTitle, { color: C.text }]}>{t('creatorSettings.noPastWorkTitle')}</Text>
            <Text style={[styles.socialEmptySubtitle, { color: C.textSecondary }]}>
              {t('creatorSettings.noPastWorkSub')}
            </Text>
          </View>
        )}

        {/* Portfolio list */}
        {portfolio.length > 0 && (
          <Card>
            {portfolio.map((item, idx) => {
              const cfg = PORTFOLIO_CONFIG[item.label] ?? { iconName: 'link-outline', iconLib: 'ion' as const, label: item.label || 'Link', color: '#6366F1' };
              const isLast = idx === portfolio.length - 1;
              return (
                <View key={item.id} style={[styles.row, styles.socialRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                  <View style={[styles.socialIconWrap, { backgroundColor: cfg.color + '18' }]}>
                    <PlatformIcon iconName={cfg.iconName} iconLib={cfg.iconLib} size={20} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.socialPlatformName, { color: C.text }]}>{cfg.label}</Text>
                    <Text style={[styles.socialUrl, { color: C.textSecondary }]} numberOfLines={1}>{item.url}</Text>
                  </View>
                  <View style={styles.socialActions}>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.socialEditBtn, { backgroundColor: cfg.color + '15' }]} onPress={() => openPortfolioSheet(item)}>
                      <Text style={[styles.socialEditBtnText, { color: cfg.color }]}>{t('creatorSettings.editBtn')}</Text>
                    </Pressable>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.socialDisconnectBtn} onPress={() => deletePortfolio(item)}>
                      <Ionicons name="close" size={14} color={C.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Add button */}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[styles.addSocialBtn, { borderColor: '#6366F1', backgroundColor: '#6366F115' }]}
          onPress={() => openPortfolioSheet()}>
          <Text style={[styles.addSocialBtnText, { color: '#6366F1' }]}>{t('creatorSettings.addPastWorkBtn')}</Text>
        </Pressable>
      </>
    );
  }

  // ── Section: Earnings & Payments ──────────────────────────────

  function renderEarnings() {
    return (
      <>
        <SectionHeader title={t('creatorSettings.earningsSummarySection')} />
        <Card>
          {earningsLoading ? (
            <View style={styles.earningsRow}>
              {[
                { key: 'totalEarned', label: t('creatorSettings.totalEarnedLabel') },
                { key: 'pending', label: t('creatorSettings.pendingEarningsLabel') },
                { key: 'events', label: t('creatorSettings.eventsLabel') },
              ].map(({ key, label }) => (
                <View key={key} style={styles.earningsStat}>
                  <View style={[styles.earningsSkeletonValue, { backgroundColor: C.border }]} />
                  <Text style={[styles.earningsLabel, { color: C.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.earningsRow}>
              {[
                { key: 'totalEarned', label: t('creatorSettings.totalEarnedLabel'),    value: `Rs ${(earningsSummary?.totalEarned     ?? 0).toFixed(0)}`, color: C.brinjal1 },
                { key: 'pending',     label: t('creatorSettings.pendingEarningsLabel'), value: `Rs ${(earningsSummary?.pendingEarnings ?? 0).toFixed(0)}`, color: C.draft    },
                { key: 'events',      label: t('creatorSettings.eventsLabel'),          value: String(earningsSummary?.totalApplications ?? 0),           color: C.active   },
              ].map((stat) => (
                <View key={stat.key} style={styles.earningsStat}>
                  <Text style={[styles.earningsValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.earningsLabel, { color: C.textSecondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
        <SectionHeader title={t('creatorSettings.paymentMethodsSection')} />
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('creatorSettings.paymentMethodsHint')}</Text>
        </View>
        <Card>
          {PAYMENT_METHODS.map((m, idx) => {
            const selected = paymentMethods.includes(m.id);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={m.id}
                style={[styles.row, idx < PAYMENT_METHODS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => togglePayment(m.id)}>
                {isPaymentMethodId(m.id) ? (
                  <PaymentMethodIcon method={m.id} size={38} />
                ) : (
                  <View style={[styles.paymentIcon, { backgroundColor: m.color + '18' }]}>
                    <FontAwesome5 name={m.icon} size={16} color={m.color} />
                  </View>
                )}
                <Text style={[styles.rowLabel, { color: C.text }]}>{m.label}</Text>
                <View style={[styles.checkboxOuter, { borderColor: selected ? C.brinjal1 : C.border, backgroundColor: selected ? C.brinjal1 : 'transparent' }]}>
                  {selected ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      </>
    );
  }

  // ── Phone verification handlers ───────────────────────────────

  async function handleRequestPhoneOtp() {
    if (!phoneNumber.trim()) return;
    setPhoneLoading(true);
    try {
      await authService.requestPhoneOtp(phoneNumber.trim());
      setPhoneSubPage('otp');
    } catch (e: any) {
      showToast(e.message ?? t('creatorSettings.otpSendFailed'), true);
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim()) return;
    setPhoneLoading(true);
    try {
      await authService.verifyPhoneOtp(phoneNumber.trim(), phoneOtp.trim());
      setPhoneSubPage(null);
      setPhoneNumber('');
      setPhoneOtp('');
      showToast(t('creatorSettings.phoneVerifiedToast'));
    } catch (e: any) {
      showToast(e.message ?? t('creatorSettings.otpInvalid'), true);
    } finally {
      setPhoneLoading(false);
    }
  }

  // ── Email verification handlers (mirrors phone above) ──────────

  async function handleRequestEmailOtp() {
    if (!emailInput.trim()) return;
    setEmailOtpLoading(true);
    try {
      await authService.requestEmailOtp(emailInput.trim());
      setEmailSubPage('otp');
    } catch (e: any) {
      showToast(e.message ?? t('creatorSettings.otpSendFailed'), true);
    } finally {
      setEmailOtpLoading(false);
    }
  }

  async function handleVerifyEmailOtp() {
    if (!emailOtp.trim()) return;
    setEmailOtpLoading(true);
    try {
      await authService.verifyEmailOtp(emailInput.trim(), emailOtp.trim());
      setEmailVerified(true);
      updateUser({ email: emailInput.trim() });
      setEmailSubPage(null);
      setEmailInput('');
      setEmailOtp('');
      showToast(t('creatorSettings.emailVerifiedToast'));
    } catch (e: any) {
      showToast(e.message ?? t('creatorSettings.otpInvalid'), true);
    } finally {
      setEmailOtpLoading(false);
    }
  }

  // ── Section: Security ─────────────────────────────────────────

  function renderSecurity() {
    const isEmailVerified = emailVerified === true;
    const pwError  = pwSubmitted ? (!newPw ? t('common.required') : newPw.length < 8 ? t('creatorSettings.errPwTooShort') : undefined) : undefined;
    const cPwError = pwSubmitted ? (!confirmPw ? t('common.required') : confirmPw !== newPw ? t('creatorSettings.errPwMismatch') : undefined) : undefined;

    function closePhone() {
      setPhoneSubPage(null);
      setPhoneNumber('');
      setPhoneOtp('');
    }

    function closeEmail() {
      setEmailSubPage(null);
      setEmailInput('');
      setEmailOtp('');
    }

    async function handleUploadCitizenship() {
      setCitizenshipUploading(true);
      try {
        const result = await pickAndUpload('creator-citizenship');
        if (result) {
          setCitizenshipStatus(result.status ?? 'PENDING');
          toast.success(t('creatorSettings.citizenshipUploadSuccess'));
        }
      } catch {
        toast.error(t('creatorSettings.citizenshipUploadFailed'));
      } finally {
        setCitizenshipUploading(false);
      }
    }

    return (
      <>
        <SectionHeader title={t('creatorSettings.loginPasswordSection')} />
        <Card>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}
            onPress={() => setShowChangePassword((v) => !v)}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#D9770618' }]}>
              <FontAwesome5 name="key" size={16} color="#D97706" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('creatorSettings.subChangePassword')}</Text>
            {!showChangePassword && <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>}
          </Pressable>

          {showChangePassword && (
            <View style={[styles.inlinePhonePanel, { borderBottomColor: C.border, backgroundColor: C.background }]}>
              <View style={styles.inlinePhonePanelHeader}>
                <Text style={[styles.inlinePhonePanelTitle, { color: C.text, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{t('creatorSettings.setNewPasswordSection')}</Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={closeChangePassword} hitSlop={10} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('creatorSettings.newPasswordLabel')}</Text>
                <View style={[styles.pwRow, { backgroundColor: C.surface, borderColor: pwError ? C.error : C.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: C.text }]}
                    value={newPw}
                    onChangeText={(v) => { setNewPw(v); setPwSubmitted(false); }}
                    secureTextEntry={!showNewPw}
                    placeholder={t('creatorSettings.newPasswordPlaceholder')}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                  />
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setShowNewPw((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textSecondary} />
                  </Pressable>
                </View>
                {pwError ? <Text style={[styles.fieldError, { color: C.error }]}>{pwError}</Text> : null}
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('creatorSettings.confirmPasswordLabel')}</Text>
                <View style={[styles.pwRow, { backgroundColor: C.surface, borderColor: cPwError ? C.error : C.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: C.text }]}
                    value={confirmPw}
                    onChangeText={(v) => { setConfirmPw(v); setPwSubmitted(false); }}
                    secureTextEntry={!showConfirmPw}
                    placeholder={t('creatorSettings.confirmPasswordPlaceholder')}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                  />
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setShowConfirmPw((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textSecondary} />
                  </Pressable>
                </View>
                {cPwError ? <Text style={[styles.fieldError, { color: C.error }]}>{cPwError}</Text> : null}
              </View>

              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.saveBtn, { backgroundColor: C.brinjal1 }]} onPress={handleChangePassword}>
                <Text style={styles.saveBtnText}>{t('creatorSettings.updatePasswordBtn')}</Text>
              </Pressable>

              <Text style={[styles.inlinePhonePanelSub, { color: C.textSecondary }]}>{t('creatorSettings.passwordHint')}</Text>
            </View>
          )}

          <NavRow faIcon="mobile-alt" faIconColor="#6366F1" label={t('creatorSettings.logoutAllDevices')} onPress={handleLogoutAll} isLast />
        </Card>

        <SectionHeader title={t('creatorSettings.verificationSection')} />
        <Card>
          {/* Email row */}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}
            disabled={emailVerified !== false}
            onPress={() => {
              if (emailVerified !== false) return;
              if (emailSubPage) closeEmail(); else setEmailSubPage('input');
            }}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#0891B218' }]}>
              <Ionicons name="mail-outline" size={18} color="#0891B2" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('creatorSettings.emailLabel')}</Text>
            {emailVerified === null ? (
              <ActivityIndicator size="small" color={C.brinjal1} />
            ) : isEmailVerified ? (
              <View style={styles.verifiedBadge}><Text style={[styles.badgeText, { color: C.active }]}>{t('creatorSettings.verifiedBadge')}</Text></View>
            ) : !emailSubPage ? (
              <View style={styles.navRight}>
                <View style={[styles.chip, { borderColor: C.brinjal1, backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 2 }]}>
                  <Text style={[styles.chipText, { color: C.brinjal1, fontSize: 12 }]}>{t('creatorSettings.verifyBtnLabel')}</Text>
                </View>
                <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Inline: enter email */}
          {emailSubPage === 'input' && (
            <View style={[styles.inlinePhonePanel, { borderBottomColor: C.border, backgroundColor: C.background }]}>
              <View style={styles.inlinePhonePanelHeader}>
                <Text style={[styles.inlinePhonePanelTitle, { color: C.text, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{t('creatorSettings.enterEmailTitle')}</Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={closeEmail} hitSlop={10} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>
              <View style={[styles.pwRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: C.text }]}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder={t('creatorSettings.emailPlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.saveBtn, { backgroundColor: C.brinjal1, opacity: (emailInput.trim() && !emailOtpLoading) ? 1 : 0.45 }]}
                onPress={handleRequestEmailOtp}
                disabled={emailOtpLoading || !emailInput.trim()}>
                <Text style={styles.saveBtnText}>{emailOtpLoading ? t('creatorSettings.sendingOtp') : t('creatorSettings.sendVerificationCode')}</Text>
              </Pressable>
            </View>
          )}

          {/* Inline: enter email OTP */}
          {emailSubPage === 'otp' && (
            <View style={[styles.inlinePhonePanel, { borderBottomColor: C.border, backgroundColor: C.background }]}>
              <View style={styles.inlinePhonePanelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inlinePhonePanelTitle, { color: C.text }]}>{t('creatorSettings.enterOtpTitle')}</Text>
                  <Text style={[styles.inlinePhonePanelSub, { color: C.textSecondary }]}>{t('creatorSettings.sentToEmail', { email: emailInput })}</Text>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={closeEmail} hitSlop={10} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>
              <View style={[styles.pwRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: C.text, letterSpacing: 8, fontSize: 18, textAlign: 'center' }]}
                  value={emailOtp}
                  onChangeText={(v) => setEmailOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="------"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.saveBtn, { backgroundColor: C.brinjal1, opacity: (emailOtp.length === 6 && !emailOtpLoading) ? 1 : 0.45 }]}
                onPress={handleVerifyEmailOtp}
                disabled={emailOtpLoading || emailOtp.length < 6}>
                <Text style={styles.saveBtnText}>{emailOtpLoading ? t('creatorSettings.verifyingOtp') : t('creatorSettings.verifyBtnLabel')}</Text>
              </Pressable>
            </View>
          )}

          {/* Phone row */}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.row, { borderBottomWidth: phoneSubPage ? 1 : 1, borderBottomColor: C.border }]}
            onPress={() => { if (phoneSubPage) closePhone(); else setPhoneSubPage('input'); }}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="call-outline" size={18} color="#10B981" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('creatorSettings.phoneNumberLabel')}</Text>
            {!phoneSubPage && (
              <View style={styles.navRight}>
                <View style={[styles.chip, { borderColor: C.brinjal1, backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 2 }]}>
                  <Text style={[styles.chipText, { color: C.brinjal1, fontSize: 12 }]}>{t('creatorSettings.verifyBtnLabel')}</Text>
                </View>
                <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>
              </View>
            )}
          </Pressable>

          {/* Inline: enter phone number */}
          {phoneSubPage === 'input' && (
            <View style={[styles.inlinePhonePanel, { borderBottomColor: C.border, backgroundColor: C.background }]}>
              <View style={styles.inlinePhonePanelHeader}>
                <Text style={[styles.inlinePhonePanelTitle, { color: C.text, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{t('creatorSettings.enterPhoneTitle')}</Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={closePhone} hitSlop={10} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>
              <View style={[styles.pwRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: C.text }]}
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9+]/g, ''))}
                  placeholder={t('creatorSettings.phonePlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.saveBtn, { backgroundColor: C.brinjal1, opacity: (phoneNumber.trim() && !phoneLoading) ? 1 : 0.45 }]}
                onPress={handleRequestPhoneOtp}
                disabled={phoneLoading || !phoneNumber.trim()}>
                <Text style={styles.saveBtnText}>{phoneLoading ? t('creatorSettings.sendingOtp') : t('creatorSettings.sendVerificationCode')}</Text>
              </Pressable>
            </View>
          )}

          {/* Inline: enter OTP */}
          {phoneSubPage === 'otp' && (
            <View style={[styles.inlinePhonePanel, { borderBottomColor: C.border, backgroundColor: C.background }]}>
              <View style={styles.inlinePhonePanelHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inlinePhonePanelTitle, { color: C.text }]}>{t('creatorSettings.enterOtpTitle')}</Text>
                  <Text style={[styles.inlinePhonePanelSub, { color: C.textSecondary }]}>{t('creatorSettings.sentToPhone', { phone: phoneNumber })}</Text>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={closePhone} hitSlop={10}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>
              <View style={[styles.pwRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                <TextInput
                  style={[styles.pwInput, { color: C.text, letterSpacing: 8, fontSize: 22, textAlign: 'center' }]}
                  value={phoneOtp}
                  onChangeText={(t) => setPhoneOtp(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.saveBtn, { backgroundColor: C.brinjal1, opacity: (phoneOtp.length === 6 && !phoneLoading) ? 1 : 0.45 }]}
                onPress={handleVerifyPhoneOtp}
                disabled={phoneLoading || phoneOtp.length < 6}>
                <Text style={styles.saveBtnText}>{phoneLoading ? t('creatorSettings.verifyingOtp') : t('creatorSettings.verifyBtnLabel')}</Text>
              </Pressable>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setPhoneOtp(''); setPhoneSubPage('input'); }} style={{ alignItems: 'center', paddingTop: 4 }}>
                <Text style={[styles.cancelBtnText, { color: C.brinjal1 }]}>{t('creatorSettings.resendCode')}</Text>
              </Pressable>
            </View>
          )}

          {/* Citizenship upload row */}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}
            disabled={citizenshipUploading || citizenshipStatus === 'PENDING' || citizenshipStatus === 'APPROVED'}
            onPress={handleUploadCitizenship}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
              <Ionicons name="card-outline" size={18} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('creatorSettings.uploadCitizenshipLabel')}</Text>
            <View style={styles.navRight}>
              {citizenshipUploading ? (
                <ActivityIndicator size="small" color={C.brinjal1} />
              ) : citizenshipStatus === 'APPROVED' ? (
                <View style={styles.verifiedBadge}><Text style={[styles.badgeText, { color: C.active }]}>{t('creatorSettings.citizenshipApproved')}</Text></View>
              ) : citizenshipStatus === 'PENDING' ? (
                <View style={[styles.soonBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>{t('creatorSettings.citizenshipPending')}</Text></View>
              ) : citizenshipStatus === 'REJECTED' ? (
                <View style={[styles.soonBadge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#DC2626' }]}>{t('creatorSettings.citizenshipRejected')}</Text></View>
              ) : (
                <View style={[styles.chip, { borderColor: C.brinjal1, backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 2 }]}>
                  <Text style={[styles.chipText, { color: C.brinjal1, fontSize: 12 }]}>{t('creatorSettings.citizenshipNotUploaded')}</Text>
                </View>
              )}
              {!citizenshipUploading && citizenshipStatus !== 'PENDING' && citizenshipStatus !== 'APPROVED' && (
                <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>
              )}
            </View>
          </Pressable>

          {/* Creator Badge row */}
          <View style={styles.row}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#F59E0B18' }]}>
              <Ionicons name="ribbon-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('creatorSettings.creatorBadgeLabel')}</Text>
            {creatorIsVerified ? (
              <View style={styles.verifiedBadge}><Text style={[styles.badgeText, { color: C.active }]}>{t('creatorSettings.verifiedBadge')}</Text></View>
            ) : (
              <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.badgeText, { color: C.brinjal1 }]}>{t('creatorSettings.notVerifiedBadge')}</Text>
              </View>
            )}
          </View>
        </Card>

        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('creatorSettings.verifiedHint')}</Text>
        </View>
      </>
    );
  }

  // ── Section: Support ──────────────────────────────────────────

  function renderSupport() {
    return (
      <>
        <Card>
          <NavRow ionIcon="help-circle-outline"        ionIconColor="#0891B2" label={t('creatorSettings.helpCenterLabel')}      onPress={() => setSubPage('help-center')} />
          <NavRow ionIcon="chatbubble-ellipses-outline" ionIconColor="#7C3AED" label={t('creatorSettings.contactSupportLabel')} onPress={() => setSubPage('contact-support')} />
          <NavRow ionIcon="warning-outline"            ionIconColor="#EF4444" label={t('creatorSettings.reportIssueLabel')}    onPress={() => setSubPage('report-issue')} />
          <NavRow ionIcon="reader-outline"             ionIconColor="#F59E0B" label={t('creatorSettings.faqsLabel')}            onPress={() => setSubPage('faqs')} isLast />
        </Card>
        <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('creatorSettings.supportResponseHint')}</Text>
        </View>
      </>
    );
  }

  // ── Section: Legal ────────────────────────────────────────────

  function renderLegal() {
    return (
      <>
        <Card>
          <NavRow ionIcon="shield-checkmark-outline" ionIconColor="#3B82F6" label={t('creatorSettings.privacyPolicyLabel')}  onPress={() => setSubPage('privacy-policy')} />
          <NavRow ionIcon="document-text-outline"    ionIconColor="#6366F1" label={t('creatorSettings.termsLabel')}          onPress={() => setSubPage('terms')} />
          <NavRow ionIcon="people-outline"           ionIconColor="#16A34A" label={t('creatorSettings.guidelinesLabel')}     onPress={() => setSubPage('guidelines')} isLast />
        </Card>
      </>
    );
  }

  // ── Main Settings ─────────────────────────────────────────────

  function renderMainSettings() {
    return (
      <>
        {/* Account */}
        <SectionHeader title={t('creatorSettings.accountSection')} />
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
          <NavRow ionIcon="create-outline" ionIconColor={C.brinjal1} label={t('creatorSettings.editProfileLabel')} onPress={() => router.push('/(creator)/edit-profile')} />
          <NavRow faIcon="pause-circle" faIconColor="#F59E0B" label={t('creatorSettings.deactivateAccount')} onPress={handleDeactivateAccount} />
          <NavRow faIcon="trash-alt" label={t('creatorSettings.deleteAccount')} onPress={handleDeleteAccount} danger isLast />
        </Card>

        {/* Language */}
        <SectionHeader title={t('creatorSettings.languageSection')} />
        <View style={{ marginHorizontal: 16, gap: 10 }}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = selectedLang === lang.label;
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={lang.label}
                disabled={lang.future}
                onPress={() => {
                  if (!lang.future) {
                    setSelectedLang(lang.label);
                    setLanguage(langLabelToCode(lang.label));
                  }
                }}
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
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                ) : (
                  <View style={[styles.inactiveLangCircle, { borderColor: C.border }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* App Settings */}
        <SectionHeader title={t('creatorSettings.appSettingsSection')} />
        <Card>
          <SwitchRow faIcon="moon" faIconColor="#6366F1" label={t('creatorSettings.darkModeLabel')} value={isDark} onChange={toggleDark} />
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#3B82F618' }]}>
              <FontAwesome5 name="info-circle" size={16} color="#3B82F6" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('creatorSettings.appVersionLabel')}</Text>
            <Text style={[styles.versionText, { color: C.textSecondary }]}>1.0.0</Text>
          </View>
          <NavRow faIcon="globe" faIconColor="#10B981" label={t('creatorSettings.languageSection')} value={selectedLang} onPress={() => {}} isLast />
        </Card>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <ColorCtx.Provider value={C}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
        <LinearGradient colors={['#F97316', '#EF4444', '#EC4899']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientTopBar}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <BackButton onPress={handleBack} />
            <Text style={[styles.topTitle, { color: '#fff' }]}>{topTitle}</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Sub-pages */}
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
          {!subPage && section === 'earnings'   && renderEarnings()}
          {!subPage && section === 'past-work'  && renderPastWork()}
          {!subPage && section === 'security'   && renderSecurity()}
          {!subPage && section === 'support'    && renderSupport()}
          {!subPage && section === 'legal'      && renderLegal()}
        </ScrollView>


        {/* ── Deactivate Account Modal ──────────────────────────── */}
        <Modal visible={showDeactivateModal} transparent animationType="fade" onRequestClose={() => setShowDeactivateModal(false)}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.confirmOverlay} onPress={() => { if (!accountActionLoading) setShowDeactivateModal(false); }}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.confirmCard, { backgroundColor: C.surface }]} onPress={() => {}}>
              <View style={[styles.confirmIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <FontAwesome5 name="pause-circle" size={26} color="#F59E0B" />
              </View>
              <Text style={[styles.confirmTitle, { color: C.text }]}>{t('creatorSettings.deactivateTitle')}</Text>
              <Text style={[styles.confirmBody, { color: C.textSecondary }]}>{t('creatorSettings.deactivateBody')}</Text>
              <View style={styles.confirmActions}>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.confirmCancelBtn, { borderColor: C.border }]}
                  onPress={() => setShowDeactivateModal(false)}
                  disabled={accountActionLoading}>
                  <Text style={[styles.confirmCancelText, { color: C.text }]}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.confirmActionBtn, { backgroundColor: '#F97316', opacity: accountActionLoading ? 0.6 : 1 }]}
                  onPress={confirmDeactivate}
                  disabled={accountActionLoading}>
                  <Text style={styles.confirmActionText}>{accountActionLoading ? t('creatorSettings.deactivatingBtn') : t('creatorSettings.deactivateConfirmBtn')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Delete Account Modal ─────────────────────────────── */}
        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.confirmOverlay} onPress={() => { if (!accountActionLoading) setShowDeleteModal(false); }}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.confirmCard, { backgroundColor: C.surface }]} onPress={() => {}}>
              <View style={[styles.dangerBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <FontAwesome5 name="exclamation-triangle" size={14} color="#DC2626" solid />
                <Text style={[styles.dangerBannerText, { color: '#DC2626' }]}>{t('creatorSettings.deletePermanentWarning')}</Text>
              </View>
              <View style={[styles.confirmIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <FontAwesome5 name="trash-alt" size={26} color="#DC2626" />
              </View>
              <Text style={[styles.confirmTitle, { color: '#DC2626' }]}>{t('creatorSettings.deleteTitle')}</Text>
              <Text style={[styles.confirmBody, { color: C.textSecondary }]}>
                {t('creatorSettings.deleteBodyIntro')} <Text style={{ fontWeight: '700', color: C.text }}>{t('creatorSettings.deleteCannotRecover')}</Text>:{'\n'}
                {'•'} {t('creatorSettings.deleteBullet1')}{'\n'}
                {'•'} {t('creatorSettings.deleteBullet2')}{'\n'}
                {'•'} {t('creatorSettings.deleteBullet3')}{'\n'}
                {'•'} {t('creatorSettings.deleteBullet4')}{'\n\n'}
                {t('creatorSettings.deleteBodyOutro')}
              </Text>
              <View style={styles.confirmActions}>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.confirmCancelBtn, { borderColor: C.border }]}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={accountActionLoading}>
                  <Text style={[styles.confirmCancelText, { color: C.text }]}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.confirmActionBtn, { backgroundColor: '#DC2626', opacity: accountActionLoading ? 0.6 : 1 }]}
                  onPress={confirmDelete}
                  disabled={accountActionLoading}>
                  <Text style={styles.confirmActionText}>{accountActionLoading ? t('creatorSettings.deletingBtn') : t('creatorSettings.deleteConfirmBtn')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <AppModal
          visible={appModal.visible}
          type={appModal.type}
          title={appModal.title}
          body={appModal.body}
          confirmLabel={appModal.confirmLabel}
          warning={appModal.warning}
          onConfirm={() => { void appModal.onConfirm(); }}
          onCancel={closeAppModal}
        />
      </SafeAreaView>
    </ColorCtx.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 24 },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  topTitle: { fontSize: 20, fontFamily: F.bold, lineHeight: 24 },

  sectionHeader: {
    fontSize: 11,
    letterSpacing: 0, marginTop: 20, marginBottom: 6, marginHorizontal: 20, fontFamily: F.bold,
  },
  card: {
    marginHorizontal: 16, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden',
  },
  hintCard: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  hintText: { fontSize: 13, lineHeight: 18, fontFamily: F.regular },
  saveHint: { textAlign: 'center', fontSize: 12, marginTop: 8, marginHorizontal: 16, fontFamily: F.regular },
  subLabel: { fontSize: 11, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  subDivider: { height: 1, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: F.medium },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navArrow: { fontSize: 18 },
  navValue: { fontSize: 14, fontFamily: F.regular },
  navIonIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  accordionCard: { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden', backgroundColor: 'transparent' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  accordionTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: F.bold },
  accordionBody: { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14, fontFamily: F.regular },
  accordionIcon: { fontSize: 20 },

  chipSection: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  sliderSection: { paddingHorizontal: 16, paddingVertical: 16 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: F.medium },

  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  accountAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { fontSize: 20, color: '#fff', fontFamily: F.bold },
  accountName: { fontSize: 16, fontFamily: F.bold },
  accountEmail: { fontSize: 13, marginTop: 2, fontFamily: F.regular },
  editBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontFamily: F.bold },

  // Language (improved)
  langCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 2, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  langFlag: { fontSize: 32 },
  langNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  langName: { fontSize: 15, fontFamily: F.bold },
  langNative: { fontSize: 13, fontFamily: F.regular },
  langDesc: { fontSize: 12, fontFamily: F.regular },
  activeLangCheck: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  inactiveLangCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  soonBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontFamily: F.bold },

  versionText: { fontSize: 14, fontFamily: F.medium },

  socialRow: { alignItems: 'center' },
  socialIconWrap: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  socialEmoji: { fontSize: 20 },
  socialPlatformName: { fontSize: 14, fontFamily: F.bold },
  socialMeta: { fontSize: 12, marginTop: 1, fontFamily: F.regular },
  socialUrl: { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  socialNotConnected: { fontSize: 12, marginTop: 2, fontFamily: F.regular },
  socialActions: { flexDirection: 'row', gap: 6 },
  socialEditBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  socialEditBtnText: { fontSize: 12, fontFamily: F.bold },
  socialDisconnectBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },

  // ── Connect Accounts (OAuth) ─────────────────────────────────────────────────
  connectPlatformNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectPlatformHint:    { fontSize: 11, marginTop: 2, fontFamily: F.regular },
  connectBtn:     { borderRadius: 8, paddingHorizontal: 14, height: 32, justifyContent: 'center', alignItems: 'center', minWidth: 84 },
  connectBtnText: { fontSize: 12, fontFamily: F.bold, color: '#fff' },
  comingSoonBtn:  { borderRadius: 8, paddingHorizontal: 10, height: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  comingSoonBtnText: { fontSize: 11, fontFamily: F.semibold },

  // ── Facebook/Instagram Page picker ────────────────────────────────────────────
  pagePickerSheet: {
    position: 'absolute', top: '25%', left: 20, right: 20,
    borderRadius: 16, padding: 16, maxHeight: '55%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 20,
  },
  pagePickerTitle: { fontSize: 16, fontFamily: F.bold, marginBottom: 8 },
  pagePickerRow: { paddingVertical: 12, borderBottomWidth: 1 },
  pagePickerRowTitle: { fontSize: 14, fontFamily: F.semibold },
  pagePickerRowSub: { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  pagePickerCancel: { paddingVertical: 12, alignItems: 'center' },
  pagePickerCancelText: { fontSize: 14, fontFamily: F.semibold },

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
  sheetTitle: { fontSize: 20, color: '#fff', fontFamily: F.bold },
  sheetSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontFamily: F.regular },
  sheetBody: { padding: 20, paddingBottom: 36 },
  sheetSection: { marginBottom: 20 },
  sheetLabel: { fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: F.bold },
  sheetFieldError: { fontSize: 12, marginTop: 5, fontFamily: F.medium },
  sheetFieldHint: { fontSize: 11, marginTop: 5, fontFamily: F.regular },

  // Platform grid
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  platformGridItem: {
    width: '30%', borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 6, position: 'relative', overflow: 'hidden',
  },
  platformGridItemDisabled: { opacity: 0.5 },
  platformGridLabel: { fontSize: 11, textAlign: 'center', fontFamily: F.bold },
  platformGridAddedBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  platformGridSelectedDot: { position: 'absolute', bottom: 6, width: 6, height: 6, borderRadius: 3 },

  // Inputs inside sheet
  sheetInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, minHeight: 50 },
  sheetInputPrefix: { fontSize: 18, marginRight: 6 },
  sheetInput: { flex: 1, fontSize: 15, paddingVertical: 12, fontFamily: F.regular },
  sheetCountBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  sheetCountBadgeText: { fontSize: 13, fontFamily: F.bold },

  // Sheet action buttons
  sheetActions: { gap: 10, marginTop: 6 },
  sheetSaveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  sheetSaveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetSpinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' },
  sheetSaveBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  sheetCancelBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  sheetCancelBtnText: { fontSize: 14, fontFamily: F.semibold },

  // Add social button (dashed)
  addSocialBtn: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 15, alignItems: 'center' },
  addSocialBtnText: { fontSize: 14, letterSpacing: 0.3, fontFamily: F.bold },

  // Empty state
  socialEmptyState: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center', gap: 6 },
  socialEmptyTitle: { fontSize: 15, fontFamily: F.bold },
  socialEmptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },

  // Follower badge on account cards
  socialMetaRow: { flexDirection: 'row', marginTop: 3, marginBottom: 2 },
  socialFollowerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  socialFollowerBadgeText: { fontSize: 11, fontFamily: F.bold },

  // Form section title (kept for other uses)
  formSectionTitle: { fontSize: 15, marginBottom: 16, fontFamily: F.bold },

  inlineForm: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 12 },
  formField: { gap: 4 },
  formFieldLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  formInput: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: F.regular },
  formTextarea: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 120, fontFamily: F.regular },
  fieldError: { fontSize: 12, fontFamily: F.medium },
  formActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { fontSize: 14, color: '#fff', fontFamily: F.bold },
  cancelBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: F.semibold },

  inlinePhonePanel: { paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  inlinePhonePanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inlinePhonePanelTitle: { fontSize: 14, fontFamily: F.bold },
  inlinePhonePanelSub: { fontSize: 12, fontFamily: F.regular, marginTop: 2 },

  pwRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12 },
  pwInput: { flex: 1, fontSize: 14, paddingVertical: 11, fontFamily: F.regular },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },

  portfolioType: { fontSize: 14, fontFamily: F.semibold },
  portfolioUrl: { fontSize: 12, marginTop: 2, fontFamily: F.regular },
  portfolioActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  portfolioActionText: { fontSize: 13, fontFamily: F.semibold },
  portfolioSep: { fontSize: 13 },
  addPortfolioBtn: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 14 },
  addPortfolioBtnText: { fontSize: 14, fontFamily: F.bold },

  earningsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 16 },
  earningsStat: { alignItems: 'center', gap: 4 },
  earningsValue: { fontSize: 22, fontFamily: F.bold },
  earningsLabel: { fontSize: 11, textAlign: 'center', fontFamily: F.semibold },
  earningsSkeletonValue: { width: 52, height: 26, borderRadius: 6, marginBottom: 2 },

  paymentIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxOuter: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  verifiedBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },

  // FAQ / legal
  faqCard: { borderRadius: 12, padding: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  faqQ: { fontSize: 14, lineHeight: 20, fontFamily: F.bold },
  faqA: { fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  helpSkeletonQ: { height: 14, borderRadius: 7, marginBottom: 8, width: '80%' },
  helpSkeletonA: { height: 11, borderRadius: 5, marginBottom: 4, width: '100%' },
  helpEmpty: { margin: 20, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8 },
  helpEmptyTitle: { fontSize: 15, textAlign: 'center', fontFamily: F.bold },
  helpEmptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, fontFamily: F.regular },
  legalDate: { fontSize: 12, marginTop: 12, marginBottom: 4, fontFamily: F.regular },
  legalSection: { paddingVertical: 14, borderBottomWidth: 1, gap: 6 },
  legalTitle: { fontSize: 14, fontFamily: F.bold },
  legalBody: { fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  guideCard: { borderRadius: 14, padding: 16, gap: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guideIcon: { fontSize: 22 },
  guideTitle: { fontSize: 15, fontFamily: F.bold },
  guideBody: { fontSize: 13, lineHeight: 20, fontFamily: F.regular },

  // Toast
  toast: {
    position: 'absolute', bottom: 32, left: 32, right: 32,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.semibold },

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
  confirmTitle: { fontSize: 20, marginBottom: 10, fontFamily: F.bold },
  confirmBody: { fontSize: 14, lineHeight: 22, marginBottom: 24, fontFamily: F.regular },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, fontFamily: F.semibold },
  confirmActionBtn: {
    flex: 1, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmActionText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
  dangerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 20,
  },
  dangerBannerText: { fontSize: 12, flex: 1, lineHeight: 18, fontFamily: F.bold },
});
