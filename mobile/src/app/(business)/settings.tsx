import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal } from '@/components/AppModal';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import { isPaymentMethodId } from '@/utilities/paymentMethods';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { businessService, type PaymentHistoryEntry } from '@/services/business';
import { authService } from '@/services/auth';
import { profileService, type SocialLinks } from '@/services/profile';
import { COLORS, F } from '@/utilities/constants';
import { request } from '@/lib/api';
import { pickAndUpload } from '@/utilities/uploadImage';
import { useCategories } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';

type ColorsType = typeof COLORS;
const ColorCtx = createContext<ColorsType>(COLORS);


const BUDGET_RANGES = ['Under NPR 5,000', 'NPR 5,000–15,000', 'NPR 15,000–50,000', 'NPR 50,000+'];

const NEPAL_PAYMENTS = [
  { id: 'esewa',    icon: 'wallet',          label: 'eSewa',         color: '#60BB46' },
  { id: 'khalti',   icon: 'money-check-alt', label: 'Khalti',        color: '#5C2D91' },
  { id: 'bank',     icon: 'university',      label: 'Bank Transfer', color: '#1877F2' },
];
const MOCK_SAVED_CREATORS = [
  { id: 's1', name: 'Sarah Johnson',  handle: '@sarahjcreates',  followers: '28.4K', category: 'Lifestyle', avatar: 'SJ', avatarBg: '#EDE9FE', avatarColor: '#4F46E5', notes: '' },
  { id: 's2', name: 'James Liu',      handle: '@jamesliu_nz',    followers: '63.2K', category: 'Tech',      avatar: 'JL', avatarBg: '#FFF7ED', avatarColor: '#D97706', notes: 'Great engagement rate' },
  { id: 's3', name: 'Priya Patel',    handle: '@priyalifestyle', followers: '14.9K', category: 'Fashion',   avatar: 'PP', avatarBg: '#FEE2E2', avatarColor: '#DC2626', notes: '' },
];

const LANGUAGE_OPTIONS = [
  { label: 'English', native: 'English', flag: '🇬🇧', desc: 'Default app language', future: false },
  { label: 'Nepali',  native: 'नेपाली',  flag: '🇳🇵', desc: 'स्थानीय भाषा समर्थन', future: false },
  { label: 'Hindi',   native: 'हिंदी',   flag: '🇮🇳', desc: 'Coming soon',         future: true  },
];

// ── Helper components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const C = useContext(ColorCtx);
  return <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{title.toUpperCase()}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  const C = useContext(ColorCtx);
  return <View style={[styles.card, { backgroundColor: C.surface }]}>{children}</View>;
}

function HintCard({ children }: { children: React.ReactNode }) {
  const C = useContext(ColorCtx);
  return <View style={[styles.hintCard, { backgroundColor: C.primaryLight }]}>{children}</View>;
}

type SwitchRowProps = { label: string; faIcon?: string; faIconColor?: string; iconNode?: ReactNode; sub?: string; value: boolean; onChange: () => void; isLast?: boolean };
function SwitchRow({ label, faIcon, faIconColor, iconNode, sub, value, onChange, isLast = false }: SwitchRowProps) {
  const C = useContext(ColorCtx);
  const iColor = faIconColor ?? C.brinjal1;
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      {iconNode ? (
        <View style={styles.rowIconNode}>{iconNode}</View>
      ) : faIcon ? (
        <View style={[styles.navIonIconWrap, { backgroundColor: iColor + '18' }]}>
          <FontAwesome5 name={faIcon} size={16} color={iColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: C.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: C.textSecondary }]}>{sub}</Text> : null}
      </View>
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

type NavRowProps = { ionIcon?: keyof typeof Ionicons.glyphMap; faIcon?: string; ionIconColor?: string; label: string; sub?: string; value?: string; badge?: string; onPress: () => void; danger?: boolean; isLast?: boolean };
function NavRow({ ionIcon, faIcon, ionIconColor, label, sub, value, badge, onPress, danger = false, isLast = false }: NavRowProps) {
  const C = useContext(ColorCtx);
  const iColor = ionIconColor ?? C.brinjal1;
  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]} onPress={onPress}>
      {ionIcon ? (
        <View style={[styles.navIonIconWrap, { backgroundColor: (danger ? C.error : iColor) + '18' }]}>
          <Ionicons name={ionIcon} size={18} color={danger ? C.error : iColor} />
        </View>
      ) : faIcon ? (
        <View style={[styles.navIonIconWrap, { backgroundColor: (danger ? C.error : iColor) + '18' }]}>
          <FontAwesome5 name={faIcon} size={16} color={danger ? C.error : iColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? C.error : C.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: C.textSecondary }]}>{sub}</Text> : null}
      </View>
      <View style={styles.navRight}>
        {value ? <Text style={[styles.navValue, { color: C.textSecondary }]}>{value}</Text> : null}
        {badge ? (
          <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.badgeText, { color: C.brinjal1 }]}>{badge}</Text>
          </View>
        ) : null}
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
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            key={opt}
            style={[styles.chip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface }]}
            onPress={() => onToggle(opt)}>
            <Text style={[styles.chipText, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '500' }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function BusinessSettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleDark } = useIsDark();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const C: ColorsType = useAppColors();
  const toast = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { categories: businessCategoryOptions } = useCategories('BUSINESS');
  const { categories: creatorCategoryOptions } = useCategories('CREATOR');
  const { platforms: platformOptions } = usePlatforms();

  const langLabelToCode = (label: string): 'en' | 'ne' => label === 'Nepali' ? 'ne' : 'en';
  const langCodeToLabel = (code: string): string => code === 'ne' ? 'Nepali' : 'English';
  const [selectedLang, setSelectedLang] = useState(() => langCodeToLabel(language));

  const [subPage, setSubPage] = useState<string | null>(null);

  // ── Accordion (support sub-pages) ──
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  function toggleExpand(id: string) {
    setExpandedItems((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  useEffect(() => { setExpandedItems(new Set()); }, [subPage]);

  // ── Section 1: Business Profile ──
  const [bizName, setBizName] = useState(user?.name ?? '');
  const [bizCategory, setBizCategory] = useState<string[]>([]);
  const [bizDescription, setBizDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');

  // ── Social Links (Online Presence) ──
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [socialSaving, setSocialSaving] = useState(false);

  // ── Section 2: Account ──
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSubmitted, setPwSubmitted] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // ── Phone verification ──
  type PhoneVerifyStage = 'idle' | 'enter-phone' | 'enter-otp' | 'verified';
  const [phoneStage,     setPhoneStage]     = useState<PhoneVerifyStage>('idle');
  const [phoneInput,     setPhoneInput]     = useState('');
  const [phoneOtp,       setPhoneOtp]       = useState('');
  const [phoneLoading,   setPhoneLoading]   = useState(false);
  const [phoneError,     setPhoneError]     = useState('');
  const [verifiedPhone,  setVerifiedPhone]  = useState('');

  // ── Email verification (mirrors phone above) — for accounts that signed up
  // via phone and still hold a placeholder email ──
  type EmailVerifyStage = 'idle' | 'enter-email' | 'enter-otp' | 'verified';
  const [emailStage,     setEmailStage]     = useState<EmailVerifyStage>(user?.email && user.email.includes('@') && !user.email.endsWith('.internal') ? 'verified' : 'idle');
  const [emailInput,     setEmailInput]     = useState('');
  const [emailOtp,       setEmailOtp]       = useState('');
  const [emailLoading,   setEmailLoading]   = useState(false);
  const [emailError,     setEmailError]     = useState('');
  const [verifiedEmail,  setVerifiedEmail]  = useState(user?.email ?? '');

  // ── Section 3: Notifications ──
  const [notifApplications, setNotifApplications] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifCampaignUpdates, setNotifCampaignUpdates] = useState(true);
  const [notifCreatorAccepted, setNotifCreatorAccepted] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(true);

  // ── Section 4: Payment ──
  const [nepalPayments, setNepalPayments] = useState<string[]>(['esewa']);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(true);

  // ── Section 5: Campaign Preferences ──
  const [prefPlatforms, setPrefPlatforms] = useState(['Instagram', 'TikTok']);
  const [prefCreatorCats, setPrefCreatorCats] = useState(['Food', 'Fashion']);
  const [prefBudget, setPrefBudget] = useState('NPR 5,000–15,000');

  // ── Section 6: Saved Creators ──
  const [savedCreators, setSavedCreators] = useState(MOCK_SAVED_CREATORS);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // ── Section 8: Verification ──
  type DocStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  const [isBizVerified, setIsBizVerified] = useState(false);
  const [panDocStatus, setPanDocStatus] = useState<DocStatus>('NONE');
  const [companyRegDocStatus, setCompanyRegDocStatus] = useState<DocStatus>('NONE');
  const [panUploading, setPanUploading] = useState(false);
  const [companyRegUploading, setCompanyRegUploading] = useState(false);
  const verificationStatus: 'verified' | 'under_review' | 'not_verified' =
    isBizVerified ? 'verified'
    : (panDocStatus === 'PENDING' || companyRegDocStatus === 'PENDING') ? 'under_review'
    : 'not_verified';

  async function handleUploadPan() {
    setPanUploading(true);
    try {
      const result = await pickAndUpload('business-pan');
      if (result) {
        setPanDocStatus(result.status ?? 'PENDING');
        showToast(t('businessSettings.uploadSuccessToast'));
      }
    } catch {
      toast.error(t('businessSettings.uploadFailedToast'));
    } finally {
      setPanUploading(false);
    }
  }

  async function handleUploadCompanyReg() {
    setCompanyRegUploading(true);
    try {
      const result = await pickAndUpload('business-company-reg');
      if (result) {
        setCompanyRegDocStatus(result.status ?? 'PENDING');
        showToast(t('businessSettings.uploadSuccessToast'));
      }
    } catch {
      toast.error(t('businessSettings.uploadFailedToast'));
    } finally {
      setCompanyRegUploading(false);
    }
  }

  // ── Section 9: Privacy ──
  const [showProfilePublic, setShowProfilePublic] = useState(true);
  const [hideContactDetails, setHideContactDetails] = useState(false);
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);

  // ── Confirmation modal ──
  const [appModal, setAppModal] = useState({ visible: false, title: '', body: '', confirmLabel: '', type: 'danger' as 'danger' | 'warning', warning: undefined as string | undefined, onConfirm: () => {} });
  function closeAppModal() { setAppModal((m) => ({ ...m, visible: false })); }

  useEffect(() => {
    businessService.getMyProfile().then((p) => {
      setShowProfilePublic(p.showPublicProfile);
      setHideContactDetails(p.hideContactDetails);
      setAllowDirectMessages(p.allowDirectMessages);
    }).catch(() => {});
    profileService.getBusinessProfile().then((p) => {
      setSocialLinks(p.socialLinks ?? {});
      setIsBizVerified(p.isVerified);
      setPanDocStatus(p.panDocStatus);
      setCompanyRegDocStatus(p.companyRegDocStatus);
      if (p.defaultPlatforms?.length)         setPrefPlatforms(p.defaultPlatforms);
      if (p.defaultCreatorCategories?.length)  setPrefCreatorCats(p.defaultCreatorCategories);
      if (p.defaultBudgetRange)               setPrefBudget(p.defaultBudgetRange);
      if (p.paymentMethods?.length)            setNepalPayments(p.paymentMethods);
    }).catch(() => {});
    businessService.getPaymentHistory()
      .then(setPaymentHistory)
      .catch(() => {})
      .finally(() => setPaymentHistoryLoading(false));
  }, []);

  // ── Support forms ──
  const [supportTopic, setSupportTopic] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  function showToast(msg: string) { toast.success(msg); }

  // ── Helpers ──

  // Toggles a chip/checkbox array locally and persists the resulting array to the
  // business profile — used for auto-saved preference sections (campaign prefs, payment methods).
  async function toggleAndSave(
    arr: string[], setArr: (v: string[]) => void, val: string,
    save: (next: string[]) => Promise<void>,
  ) {
    const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
    setArr(next);
    try { await save(next); } catch { toast.error(t('businessSettings.prefSaveFailed')); }
  }

  function toggleBizCategory(val: string) {
    setBizCategory((prev) => {
      if (prev.includes(val)) return prev.filter((x) => x !== val);
      if (prev.length >= 3) return prev;
      return [...prev, val];
    });
  }

  function handleSaveProfile() {
    showToast(t('businessSettings.profileSavedToast'));
  }

  async function handleSaveSocialLinks() {
    setSocialSaving(true);
    try {
      await profileService.updateBusinessProfile({ socialLinks });
      showToast(t('settings.savedOnlinePresence'));
    } catch {
      toast.error(t('businessSettings.saveSocialFailed'));
    } finally {
      setSocialSaving(false);
    }
  }

  function handleChangePassword() {
    setPwSubmitted(true);
    if (newPw.length >= 8 && newPw === confirmPw) {
      setNewPw(''); setConfirmPw(''); setPwSubmitted(false);
      showToast(t('settings.passwordChanged'));
      setShowChangePassword(false);
    }
  }

  function closeChangePassword() {
    setShowChangePassword(false);
    setNewPw(''); setConfirmPw(''); setPwSubmitted(false);
  }

  function handleLogoutAll() {
    setAppModal({
      visible: true, type: 'warning',
      title: t('businessSettings.logoutAllTitle'),
      body: t('businessSettings.logoutAllMsg'),
      confirmLabel: t('businessSettings.logoutAllConfirmBtn'),
      warning: undefined,
      onConfirm: () => { closeAppModal(); logout(); },
    });
  }

  function handleDeactivateAccount() {
    setAppModal({
      visible: true, type: 'warning',
      title: t('businessSettings.deactivateTitle'),
      body: t('businessSettings.deactivateMsg'),
      confirmLabel: t('businessSettings.deactivateConfirmBtn'),
      warning: undefined,
      onConfirm: async () => {
        closeAppModal();
        try { await authService.deactivateAccount(); await logout(); }
        catch { toast.error(t('businessSettings.deactivateFailed')); }
      },
    });
  }

  function handleDeleteAccount() {
    setAppModal({
      visible: true, type: 'danger',
      title: t('businessSettings.deleteTitle'),
      body: t('businessSettings.deleteMsg'),
      confirmLabel: t('businessSettings.deleteConfirmBtn'),
      warning: 'This permanently deletes your account and all data. This action cannot be undone.',
      onConfirm: async () => {
        closeAppModal();
        try { await authService.deleteAccount(); await logout(); }
        catch { toast.error(t('businessSettings.deleteFailed')); }
      },
    });
  }

  function isValidNepaliPhone(phone: string): boolean {
    const stripped = phone.replace(/^\+?977/, '').replace(/[\s\-()]/g, '');
    return /^(97|98)\d{8}$/.test(stripped);
  }

  function normalisePhone(phone: string): string {
    const stripped = phone.replace(/[\s\-()]/g, '');
    if (stripped.startsWith('+977')) return stripped;
    if (stripped.startsWith('977')) return `+${stripped}`;
    return `+977${stripped}`;
  }

  async function handleSendPhoneOtp() {
    setPhoneError('');
    if (!isValidNepaliPhone(phoneInput)) {
      setPhoneError(t('settings.phoneInvalid'));
      return;
    }
    setPhoneLoading(true);
    try {
      await authService.requestPhoneOtp(normalisePhone(phoneInput));
      setPhoneStage('enter-otp');
      setPhoneOtp('');
    } catch (e: any) {
      setPhoneError(e.message ?? t('settings.phoneOtpFailed'));
    } finally {
      setPhoneLoading(false);
    }
  }

  function isValidEmailAddress(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  async function handleSendEmailOtp() {
    setEmailError('');
    if (!isValidEmailAddress(emailInput)) {
      setEmailError(t('auth.login.emailInvalid'));
      return;
    }
    setEmailLoading(true);
    try {
      await authService.requestEmailOtp(emailInput.trim());
      setEmailStage('enter-otp');
      setEmailOtp('');
    } catch (e: any) {
      setEmailError(e.message ?? t('businessSettings.emailOtpFailed'));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleVerifyEmailOtp() {
    setEmailError('');
    if (emailOtp.length !== 6) {
      setEmailError(t('settings.phoneOtpLength'));
      return;
    }
    setEmailLoading(true);
    try {
      await authService.verifyEmailOtp(emailInput.trim(), emailOtp);
      setVerifiedEmail(emailInput.trim());
      setEmailStage('verified');
      updateUser({ email: emailInput.trim() });
      toast.success(t('businessSettings.emailVerifiedToast'));
    } catch (e: any) {
      setEmailError(e.message ?? t('settings.phoneOtpFailed'));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    setPhoneError('');
    if (phoneOtp.length !== 6) {
      setPhoneError(t('settings.phoneOtpLength'));
      return;
    }
    setPhoneLoading(true);
    try {
      await authService.verifyPhoneOtp(normalisePhone(phoneInput), phoneOtp);
      setVerifiedPhone(normalisePhone(phoneInput));
      setPhoneStage('verified');
    } catch (e: any) {
      setPhoneError(e.message ?? t('settings.phoneVerifyFailed'));
    } finally {
      setPhoneLoading(false);
    }
  }

  function removeCreator(id: string) {
    setAppModal({
      visible: true, type: 'danger',
      title: t('businessSettings.removeCreatorTitle'),
      body: t('businessSettings.removeCreatorMsg'),
      confirmLabel: t('common.remove'),
      warning: undefined,
      onConfirm: () => { closeAppModal(); setSavedCreators((p) => p.filter((c) => c.id !== id)); },
    });
  }

  function saveNote(id: string) {
    setSavedCreators((p) => p.map((c) => c.id === id ? { ...c, notes: noteText } : c));
    setEditingNoteId(null);
    setNoteText('');
    showToast(t('businessSettings.noteSavedToast'));
  }

  async function handleSupportSubmit() {
    if (!supportMsg.trim()) return;
    try {
      await request('POST', '/api/support/contact', { topic: supportTopic || 'General', message: supportMsg });
      setSupportTopic(''); setSupportMsg('');
      showToast(t('businessSettings.supportSentToast'));
      setSubPage(null);
    } catch {
      toast.error(t('businessSettings.supportSendFailed'));
    }
  }

  async function handleReportSubmit() {
    if (!reportDesc.trim()) return;
    try {
      await request('POST', '/api/support/report', { type: reportType || 'Other', description: reportDesc });
      setReportType(''); setReportDesc('');
      showToast(t('businessSettings.reportSentToast'));
      setSubPage(null);
    } catch {
      toast.error(t('businessSettings.reportSendFailed'));
    }
  }

  function handleBack() {
    if (subPage) setSubPage(null);
    else router.back();
  }

  const SECTION_TITLE_KEYS: Record<string, string> = {
    profile:       'businessSettings.sectionProfile',
    account:       'businessSettings.sectionAccount',
    notifications: 'businessSettings.sectionNotifications',
    payment:       'businessSettings.sectionPayment',
    campaigns:     'businessSettings.sectionCampaigns',
    saved:         'businessSettings.sectionSaved',
    verification:  'businessSettings.sectionVerification',
    privacy:       'businessSettings.sectionPrivacy',
    support:       'businessSettings.sectionSupport',
    app:           'businessSettings.sectionApp',
  };
  const SUB_PAGE_TITLE_KEYS: Record<string, string> = {
    'help-center':     'businessSettings.subHelpCenter',
    'contact-support': 'businessSettings.subContactSupport',
    'report-issue':    'businessSettings.subReportIssue',
    'faqs':            'businessSettings.subFaqs',
  };
  const topTitle = subPage
    ? t(SUB_PAGE_TITLE_KEYS[subPage] ?? 'businessSettings.sectionApp')
    : section
    ? t(SECTION_TITLE_KEYS[section] ?? 'businessSettings.sectionApp')
    : t('businessSettings.sectionApp');

  // ── Sub-page: Help Center ─────────────────────────────────────

  const HELP_FAQS = [
    { q: 'How do I post an event?', a: 'Go to Events → tap the + button → fill in your event details, budget, and requirements → publish. Creators will begin applying within hours.' },
    { q: 'How are payments handled?', a: 'Budgets are held in escrow before work begins. Once you confirm content delivery, payment is released to the creator within 5 business days.' },
    { q: 'How do I pick the right creator?', a: 'Review their follower count, engagement rate, past work, and category match. Check proposal rate vs. your budget. Shortlisted creators stay in your pipeline.' },
    { q: 'Can I cancel an event?', a: 'Yes, draft events can be cancelled anytime. Active events can be closed, but you may need to pay creators who have already delivered work.' },
    { q: "What if a creator doesn't deliver?", a: 'Open a dispute from the event detail page. Our team mediates and you are eligible for a refund if the creator fails to deliver as agreed.' },
  ];

  function renderHelpCenter() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.helpHint')}</Text>
        </HintCard>
        <View style={{ marginHorizontal: 16, gap: 8, marginTop: 8 }}>
          {HELP_FAQS.map((item, i) => {
            const id = String(i);
            const open = expandedItems.has(id);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={i}
                style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
                onPress={() => toggleExpand(id)}>
                <View style={styles.accordionHeader}>
                  <Text style={[styles.accordionTitle, { color: C.text }]}>{item.q}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
                </View>
                {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{item.a}</Text>}
              </Pressable>
            );
          })}
        </View>
      </>
    );
  }

  // ── Sub-page: Contact Support ─────────────────────────────────

  const SUPPORT_TOPICS = ['Technical Issue', 'Payment Problem', 'Event Issue', 'Creator Issue', 'Billing', 'Other'];

  function renderContactSupport() {
    return (
      <>
        <SectionHeader title={t('businessSettings.getInTouchSection')} />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.topicLabel')}</Text>
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
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.messageLabel')}</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={supportMsg}
                onChangeText={setSupportMsg}
                placeholder={t('businessSettings.messagePlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.primaryBtn, { backgroundColor: C.brinjal1, opacity: supportMsg.trim() ? 1 : 0.45 }]} onPress={handleSupportSubmit}>
              <Text style={styles.primaryBtnText}>{t('businessSettings.sendMessageBtn')}</Text>
            </Pressable>
          </View>
        </Card>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.supportEmailHint')}</Text>
        </HintCard>
      </>
    );
  }

  // ── Sub-page: Report Issue ────────────────────────────────────

  const REPORT_TYPES = ['App Bug', 'Payment Issue', 'Creator Issue', 'Event Problem', 'Inappropriate Content', 'Other'];

  function renderReportIssue() {
    return (
      <>
        <SectionHeader title={t('businessSettings.reportIssueSection')} />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.issueTypeLabel')}</Text>
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
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.descriptionLabel')}</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={reportDesc}
                onChangeText={setReportDesc}
                placeholder={t('businessSettings.reportDescPlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.primaryBtn, { backgroundColor: C.error, opacity: reportDesc.trim() ? 1 : 0.45 }]} onPress={handleReportSubmit}>
              <Text style={styles.primaryBtnText}>{t('businessSettings.submitReportBtn')}</Text>
            </Pressable>
          </View>
        </Card>
      </>
    );
  }

  // ── Sub-page: FAQs ────────────────────────────────────────────

  const FAQS = [
    { q: 'What is CreatorMarket for businesses?', a: 'CreatorMarket lets you find and hire local content creators for paid collaborations — video promotions, product reviews, social media marketing, and more.' },
    { q: 'How much does it cost?', a: 'Posting events is free. A 10% platform fee applies on each completed collaboration, deducted from the event budget.' },
    { q: 'How do I find the right creators?', a: 'Browse creator profiles by category, follower count, and platform. Or post an event and let creators apply to you.' },
    { q: 'What payment methods are supported?', a: 'For Nepal: eSewa, Khalti, and Bank Transfer. For international events: Visa/Mastercard. Stripe support is coming soon.' },
    { q: 'Can I run multiple events at once?', a: 'Yes. You can have multiple active events simultaneously and manage all proposals in one place.' },
    { q: 'Is my business information secure?', a: 'Yes. We use industry-standard encryption. Your contact details can be hidden from the public profile in Privacy Settings.' },
  ];

  function renderFAQs() {
    return (
      <View style={{ marginHorizontal: 16, gap: 8, marginTop: 8 }}>
        {FAQS.map((item, i) => {
          const id = `faq-${i}`;
          const open = expandedItems.has(id);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={i}
              style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}
              onPress={() => toggleExpand(id)}>
              <View style={styles.accordionHeader}>
                <Text style={[styles.accordionTitle, { color: C.text }]}>{item.q}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textSecondary} />
              </View>
              {open && <Text style={[styles.accordionBody, { color: C.textSecondary }]}>{item.a}</Text>}
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Section: Business Profile ─────────────────────────────────

  function renderProfile() {
    return (
      <>
        {/* Company Information */}
        <SectionHeader title={t('businessSettings.companyInfoSection')} />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.businessNameLabel')}</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={bizName}
                onChangeText={setBizName}
                placeholder={t('businessSettings.businessNamePlaceholder')}
                placeholderTextColor={C.textSecondary}
              />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.businessLogoLabel')}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.logoPicker, { backgroundColor: C.background, borderColor: C.border }]}>
                <FontAwesome5 name="building" size={26} color={C.textSecondary} />
                <Text style={[styles.logoPickerText, { color: C.brinjal1 }]}>{t('businessSettings.logoUploadHint')}</Text>
                <Text style={[styles.logoPickerSub, { color: C.textSecondary }]}>{t('businessSettings.logoFormatHint')}</Text>
              </Pressable>
            </View>
            <View style={styles.formField}>
              <View style={styles.labelRow}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.businessCategoryLabel')}</Text>
                <Text style={[styles.optionalTag, { color: C.textSecondary }]}>{bizCategory.length}/3</Text>
              </View>
              <View style={styles.chipGroup}>
                {businessCategoryOptions.map(({ name: cat }) => {
                  const active = bizCategory.includes(cat);
                  const disabled = !active && bizCategory.length >= 3;
                  return (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      key={cat}
                      style={[styles.chip, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface, opacity: disabled ? 0.4 : 1 }]}
                      onPress={() => { if (!disabled) toggleBizCategory(cat); }}>
                      <Text style={[styles.chipText, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '500' }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.businessDescLabel')}</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={bizDescription}
                onChangeText={setBizDescription}
                placeholder={t('businessSettings.businessDescPlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </Card>

        {/* Online Presence */}
        <SectionHeader title={t('businessSettings.onlinePresenceSection')} />
        <Card>
          <View style={styles.inlineForm}>
            {([
              { key: 'facebook',  label: 'Facebook',  icon: 'logo-facebook'  as const, color: '#1877F2', placeholder: 'https://facebook.com/yourpage' },
              { key: 'instagram', label: 'Instagram', icon: 'logo-instagram' as const, color: '#E1306C', placeholder: 'https://instagram.com/yourhandle' },
              { key: 'tiktok',    label: 'TikTok',    icon: 'musical-notes'  as const, color: '#010101', placeholder: 'https://tiktok.com/@yourhandle' },
              { key: 'linkedin',  label: 'LinkedIn',  icon: 'logo-linkedin'  as const, color: '#0A66C2', placeholder: 'https://linkedin.com/company/yourname' },
            ] as { key: keyof SocialLinks; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; placeholder: string }[]).map((f) => (
              <View key={f.key} style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{f.label}</Text>
                <View style={[styles.socialInputRow, { backgroundColor: C.background, borderColor: C.border }]}>
                  <View style={[styles.socialIconCircle, { backgroundColor: f.color + '18' }]}>
                    <Ionicons name={f.icon} size={18} color={f.color} />
                  </View>
                  <TextInput
                    style={[styles.socialInput, { color: C.text }]}
                    value={socialLinks[f.key] ?? ''}
                    onChangeText={(v) => setSocialLinks((prev) => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  {!!socialLinks[f.key] && (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setSocialLinks((prev) => { const n = { ...prev }; delete n[f.key]; return n; })} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={C.textSecondary} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.primaryBtn, { backgroundColor: C.brinjal1, opacity: socialSaving ? 0.65 : 1 }]}
              onPress={handleSaveSocialLinks}
              disabled={socialSaving}>
              <Text style={styles.primaryBtnText}>{socialSaving ? t('businessSettings.savingLabel') : t('businessSettings.saveOnlinePresenceBtn')}</Text>
            </Pressable>
          </View>
        </Card>

        {/* Contact Information */}
        <SectionHeader title={t('businessSettings.contactInfoSection')} />
        <Card>
          <View style={styles.inlineForm}>
            {[
              { label: t('businessSettings.contactNameLabel'), value: contactName, set: setContactName, placeholder: t('businessSettings.contactNamePlaceholder'), keyboard: 'default' as const },
              { label: t('businessSettings.contactEmailLabel'), value: contactEmail, set: setContactEmail, placeholder: t('businessSettings.contactEmailPlaceholder'), keyboard: 'email-address' as const },
              { label: t('businessSettings.phoneNumberLabel'), value: contactPhone, set: setContactPhone, placeholder: t('businessSettings.contactPhonePlaceholder'), keyboard: 'phone-pad' as const },
            ].map((f) => (
              <View key={f.label} style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.textSecondary}
                  keyboardType={f.keyboard}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionGroup}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.primaryBtn, { backgroundColor: C.brinjal1 }]} onPress={handleSaveProfile}>
            <Text style={styles.primaryBtnText}>{t('businessSettings.saveChangesBtn')}</Text>
          </Pressable>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.secondaryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[styles.secondaryBtnText, { color: C.brinjal1 }]}>{t('businessSettings.previewProfileBtn')}</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ── Section: Account & Security ───────────────────────────────

  function renderAccount() {
    const pwError  = pwSubmitted ? (!newPw ? t('businessSettings.errRequired') : newPw.length < 8 ? t('businessSettings.errPwTooShort') : undefined) : undefined;
    const cPwError = pwSubmitted ? (!confirmPw ? t('businessSettings.errRequired') : confirmPw !== newPw ? t('businessSettings.errPwMismatch') : undefined) : undefined;
    return (
      <>
        <SectionHeader title={t('businessSettings.loginSecuritySection')} />
        <Card>
          {/* Email verification */}
          {emailStage === 'idle' && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => { setEmailStage('enter-email'); setEmailInput(''); setEmailError(''); }}
            >
              <View style={[styles.navIonIconWrap, { backgroundColor: '#0891B218' }]}>
                <FontAwesome5 name="envelope" size={16} color="#0891B2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.emailAddressLabel')}</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>{t('businessSettings.addVerifyEmailLabel')}</Text>
              </View>
              <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.badgeText, { color: C.brinjal1 }]}>{t('businessSettings.addBadge')}</Text>
              </View>
            </Pressable>
          )}
          {emailStage === 'verified' && (
            <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={[styles.navIonIconWrap, { backgroundColor: '#0891B218' }]}>
                <FontAwesome5 name="envelope" size={16} color="#0891B2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.emailAddressLabel')}</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>{verifiedEmail || user?.email}</Text>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.badgeText, { color: C.active }]}>{t('businessSettings.verifiedBadge')}</Text>
              </View>
            </View>
          )}
          {emailStage === 'enter-email' && (
            <View style={[{ borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.navIonIconWrap, { backgroundColor: '#0891B218' }]}>
                <FontAwesome5 name="envelope" size={16} color="#0891B2" />
              </View>
                  <Text style={[styles.rowLabel, { color: C.text, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{t('businessSettings.verifyEmailTitle')}</Text>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setEmailStage('idle'); setEmailInput(''); setEmailError(''); }} hitSlop={10} disabled={emailLoading} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.phoneField, { flex: 0, color: C.text, borderColor: emailError ? C.error : C.border, backgroundColor: C.background }]}
                placeholder={t('businessSettings.emailPlaceholder')}
                placeholderTextColor={C.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={emailInput}
                onChangeText={(v) => { setEmailInput(v); setEmailError(''); }}
              />
              {!!emailError && <Text style={[styles.phoneError, { color: C.error }]}>{emailError}</Text>}
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.phoneActionBtn, { backgroundColor: C.brinjal1, opacity: emailLoading ? 0.7 : 1 }]}
                onPress={handleSendEmailOtp}
                disabled={emailLoading}
              >
                <Text style={[styles.phoneActionBtnText, { color: '#fff' }]}>{emailLoading ? t('businessSettings.sendingCodeLabel') : t('businessSettings.sendCodeBtn')}</Text>
              </Pressable>
            </View>
          )}
          {emailStage === 'enter-otp' && (
            <View style={[{ borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.navIonIconWrap, { backgroundColor: '#0891B218' }]}>
                <FontAwesome5 name="envelope" size={16} color="#0891B2" />
              </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.enterVerificationCode')}</Text>
                  <Text style={[styles.rowSub, { color: C.textSecondary }]}>{t('businessSettings.sentToEmail', { email: emailInput })}</Text>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  onPress={() => { setEmailStage('idle'); setEmailOtp(''); setEmailError(''); setEmailInput(''); }}
                  disabled={emailLoading}
                  hitSlop={8}
                  style={[styles.otpCloseBtn, { backgroundColor: C.background, borderColor: C.border }]}>
                  <Ionicons name="close" size={16} color={C.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.formInput, { color: C.text, borderColor: emailError ? C.error : C.border, backgroundColor: C.background, letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
                placeholder="------"
                placeholderTextColor={C.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={emailOtp}
                onChangeText={(v) => { setEmailOtp(v.replace(/[^0-9]/g, '')); setEmailError(''); }}
              />
              {!!emailError && <Text style={[styles.phoneError, { color: C.error }]}>{emailError}</Text>}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.phoneActionBtn, { backgroundColor: C.brinjal1, opacity: emailLoading ? 0.7 : 1 }]}
                  onPress={handleVerifyEmailOtp}
                  disabled={emailLoading}
                >
                  <Text style={[styles.phoneActionBtnText, { color: '#fff' }]}>{emailLoading ? t('businessSettings.verifyingLabel') : t('businessSettings.verifyBtn')}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.phoneActionBtn, { backgroundColor: C.background, borderWidth: 1, borderColor: C.border }]}
                  onPress={() => { setEmailStage('enter-email'); setEmailOtp(''); setEmailError(''); }}
                  disabled={emailLoading}
                >
                  <Text style={[styles.phoneActionBtnText, { color: C.textSecondary }]}>{t('businessSettings.resendBtn')}</Text>
                </Pressable>
              </View>
            </View>
          )}
          {/* Phone verification */}
          {phoneStage === 'idle' && (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => { setPhoneStage('enter-phone'); setPhoneInput(''); setPhoneError(''); }}
            >
              <View style={[styles.navIonIconWrap, { backgroundColor: '#10B98118' }]}>
                <FontAwesome5 name="phone-alt" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.phoneNumberLabel')}</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>{t('businessSettings.addVerifyPhoneLabel')}</Text>
              </View>
              <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.badgeText, { color: C.brinjal1 }]}>{t('businessSettings.addBadge')}</Text>
              </View>
            </Pressable>
          )}
          {phoneStage === 'verified' && (
            <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={[styles.navIonIconWrap, { backgroundColor: '#10B98118' }]}>
                <FontAwesome5 name="phone-alt" size={16} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.phoneNumberLabel')}</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>{verifiedPhone}</Text>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.badgeText, { color: C.active }]}>{t('businessSettings.verifiedBadge')}</Text>
              </View>
            </View>
          )}
          {phoneStage === 'enter-phone' && (
            <View style={[{ borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.navIonIconWrap, { backgroundColor: '#10B98118' }]}>
                    <FontAwesome5 name="phone-alt" size={16} color="#10B981" />
                  </View>
                  <Text style={[styles.rowLabel, { color: C.text, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{t('businessSettings.verifyPhoneTitle')}</Text>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setPhoneStage('idle'); setPhoneInput(''); setPhoneError(''); }} hitSlop={10} disabled={phoneLoading} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.phoneField, { flex: 0, color: C.text, borderColor: phoneError ? C.error : C.border, backgroundColor: C.background }]}
                placeholder="+977 98XXXXXXXX"
                placeholderTextColor={C.textSecondary}
                keyboardType="phone-pad"
                value={phoneInput}
                onChangeText={(v) => { setPhoneInput(v.replace(/[^0-9+]/g, '')); setPhoneError(''); }}
              />
              {!!phoneError && <Text style={[styles.phoneError, { color: C.error }]}>{phoneError}</Text>}
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.phoneActionBtn, { backgroundColor: C.brinjal1, opacity: phoneLoading ? 0.7 : 1 }]}
                onPress={handleSendPhoneOtp}
                disabled={phoneLoading}
              >
                <Text style={[styles.phoneActionBtnText, { color: '#fff' }]}>{phoneLoading ? t('businessSettings.sendingCodeLabel') : t('businessSettings.sendCodeBtn')}</Text>
              </Pressable>
            </View>
          )}
          {phoneStage === 'enter-otp' && (
            <View style={[{ borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.navIonIconWrap, { backgroundColor: '#10B98118' }]}>
                  <FontAwesome5 name="phone-alt" size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.enterVerificationCode')}</Text>
                  <Text style={[styles.rowSub, { color: C.textSecondary }]}>{t('businessSettings.sentToPhone', { phone: phoneInput })}</Text>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  onPress={() => { setPhoneStage('idle'); setPhoneOtp(''); setPhoneError(''); setPhoneInput(''); }}
                  disabled={phoneLoading}
                  hitSlop={8}
                  style={[styles.otpCloseBtn, { backgroundColor: C.background, borderColor: C.border }]}>
                  <Ionicons name="close" size={16} color={C.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.formInput, { color: C.text, borderColor: phoneError ? C.error : C.border, backgroundColor: C.background, letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
                placeholder="------"
                placeholderTextColor={C.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={phoneOtp}
                onChangeText={(v) => { setPhoneOtp(v.replace(/[^0-9]/g, '')); setPhoneError(''); }}
              />
              {!!phoneError && <Text style={[styles.phoneError, { color: C.error }]}>{phoneError}</Text>}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.phoneActionBtn, { backgroundColor: C.brinjal1, opacity: phoneLoading ? 0.7 : 1 }]}
                  onPress={handleVerifyPhoneOtp}
                  disabled={phoneLoading}
                >
                  <Text style={[styles.phoneActionBtnText, { color: '#fff' }]}>{phoneLoading ? t('businessSettings.verifyingLabel') : t('businessSettings.verifyBtn')}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.phoneActionBtn, { backgroundColor: C.background, borderWidth: 1, borderColor: C.border }]}
                  onPress={() => { setPhoneStage('enter-phone'); setPhoneOtp(''); setPhoneError(''); }}
                  disabled={phoneLoading}
                >
                  <Text style={[styles.phoneActionBtnText, { color: C.textSecondary }]}>{t('businessSettings.resendBtn')}</Text>
                </Pressable>
              </View>
            </View>
          )}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}
            onPress={() => setShowChangePassword((v) => !v)}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
              <FontAwesome5 name="key" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text, flex: 1 }]}>{t('businessSettings.changePasswordLabel')}</Text>
            {!showChangePassword && <Text style={[styles.navArrow, { color: C.textSecondary }]}>›</Text>}
          </Pressable>

          {showChangePassword && (
            <View style={[styles.inlineForm, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.formFieldLabel, { color: C.text, fontSize: 14, flex: 1, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{t('businessSettings.setNewPasswordSection')}</Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={closeChangePassword} hitSlop={10} style={{ flexShrink: 0, marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={22} color={C.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.newPasswordLabel')}</Text>
                <View style={[styles.pwRow, { backgroundColor: C.background, borderColor: pwError ? C.error : C.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: C.text }]}
                    value={newPw}
                    onChangeText={(pw) => { setNewPw(pw); setPwSubmitted(false); }}
                    secureTextEntry={!showNewPw}
                    placeholder={t('businessSettings.newPasswordPlaceholder')}
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
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{t('businessSettings.confirmPasswordLabel')}</Text>
                <View style={[styles.pwRow, { backgroundColor: C.background, borderColor: cPwError ? C.error : C.border }]}>
                  <TextInput
                    style={[styles.pwInput, { color: C.text }]}
                    value={confirmPw}
                    onChangeText={(pw) => { setConfirmPw(pw); setPwSubmitted(false); }}
                    secureTextEntry={!showConfirmPw}
                    placeholder={t('businessSettings.confirmPasswordPlaceholder')}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                  />
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setShowConfirmPw((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textSecondary} />
                  </Pressable>
                </View>
                {cPwError ? <Text style={[styles.fieldError, { color: C.error }]}>{cPwError}</Text> : null}
              </View>

              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.primaryBtn, { backgroundColor: C.brinjal1 }]} onPress={handleChangePassword}>
                <Text style={styles.primaryBtnText}>{t('businessSettings.updatePasswordBtn')}</Text>
              </Pressable>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>{t('businessSettings.passwordHint')}</Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
              <FontAwesome5 name="shield-alt" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.twoFactorLabel')}</Text>
            <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.badgeText, { color: C.brinjal1 }]}>{t('businessSettings.comingSoonBadge')}</Text>
            </View>
          </View>
        </Card>

        <SectionHeader title={t('businessSettings.actionsSection')} />
        <Card>
          <NavRow faIcon="mobile-alt" ionIconColor="#6366F1" label={t('businessSettings.logoutAllDevicesLabel')} onPress={handleLogoutAll} />
          <NavRow faIcon="pause-circle" label={t('businessSettings.deactivateAccountLabel')} sub={t('businessSettings.deactivateAccountSub')} onPress={handleDeactivateAccount} danger />
          <NavRow faIcon="trash-alt" label={t('businessSettings.deleteAccountLabel')} sub={t('businessSettings.deleteAccountSub')} onPress={handleDeleteAccount} danger isLast />
        </Card>

        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.deactivationHint')}</Text>
        </HintCard>
      </>
    );
  }

  // ── Section: Notifications ────────────────────────────────────

  function renderNotifications() {
    return (
      <>
        <SectionHeader title={t('businessSettings.pushNotificationsSection')} />
        <Card>
          <SwitchRow faIcon="clipboard-list" faIconColor="#6366F1" label={t('businessSettings.newApplicationsLabel')} sub={t('businessSettings.newApplicationsSub')} value={notifApplications} onChange={() => setNotifApplications((v) => !v)} />
          <SwitchRow faIcon="comment-dots" faIconColor="#0891B2" label={t('businessSettings.newMessagesLabel')} sub={t('businessSettings.newMessagesSub')} value={notifMessages} onChange={() => setNotifMessages((v) => !v)} />
          <SwitchRow faIcon="chart-bar" faIconColor="#D97706" label={t('businessSettings.eventUpdatesLabel')} sub={t('businessSettings.eventUpdatesSub')} value={notifCampaignUpdates} onChange={() => setNotifCampaignUpdates((v) => !v)} />
          <SwitchRow faIcon="check-circle" faIconColor="#10B981" label={t('businessSettings.creatorAcceptedLabel')} sub={t('businessSettings.creatorAcceptedSub')} value={notifCreatorAccepted} onChange={() => setNotifCreatorAccepted((v) => !v)} isLast />
        </Card>

        <SectionHeader title={t('businessSettings.emailNotificationsSection')} />
        <Card>
          <SwitchRow faIcon="envelope" faIconColor="#0891B2" label={t('businessSettings.enableEmailsLabel')} sub={t('businessSettings.enableEmailsSub')} value={emailEnabled} onChange={() => setEmailEnabled((v) => !v)} />
          <SwitchRow faIcon="chart-line" faIconColor="#10B981" label={t('businessSettings.weeklySummaryLabel')} sub={t('businessSettings.weeklySummarySub')} value={emailWeeklySummary} onChange={() => setEmailWeeklySummary((v) => !v)} isLast />
        </Card>

        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.notifHint')}</Text>
        </HintCard>
      </>
    );
  }

  // ── Section: Payment Settings ─────────────────────────────────

  function renderPayment() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.paymentMethodsHint')}</Text>
        </HintCard>
        <Card>
          {NEPAL_PAYMENTS.map((m, idx) => {
            const selected = nepalPayments.includes(m.id);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={m.id}
                style={[styles.row, idx < NEPAL_PAYMENTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => toggleAndSave(nepalPayments, setNepalPayments, m.id, (next) => profileService.updateBusinessProfile({ paymentMethods: next }))}>
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

        <SectionHeader title={t('businessSettings.paymentHistorySection')} />
        <Card>
          {paymentHistoryLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={C.brinjal1} />
            </View>
          ) : paymentHistory.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: C.textSecondary, fontSize: 13 }}>{t('businessSettings.noTransactionsYet')}</Text>
            </View>
          ) : (
            paymentHistory.map((tx, idx) => (
              <View key={tx.id} style={[styles.txRow, idx < paymentHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txDesc, { color: C.text }]} numberOfLines={1}>{tx.description}</Text>
                  <Text style={[styles.txDate, { color: C.textSecondary }]}>
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? C.active : C.text }]}>
                  {tx.type === 'credit' ? '+' : '-'}Rs. {tx.amount.toLocaleString('en-US')}
                </Text>
              </View>
            ))
          )}
        </Card>
        <Card>
          <NavRow faIcon="receipt" ionIconColor="#6366F1" label={t('businessSettings.receiptsLabel')} onPress={() => showToast(t('businessSettings.noReceiptsToast'))} />
          <NavRow faIcon="file-invoice" ionIconColor="#6366F1" label={t('businessSettings.invoicesLabel')} onPress={() => showToast(t('businessSettings.noInvoicesToast'))} isLast />
        </Card>
      </>
    );
  }

  // ── Section: Campaign Preferences ────────────────────────────

  function renderCampaignPreferences() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.prefHint')}</Text>
        </HintCard>

        <SectionHeader title={t('businessSettings.prefPlatformsSection')} />
        <Card>
          <View style={styles.chipSection}>
            <ChipGroup
              options={platformOptions.map((p) => p.name)}
              selected={prefPlatforms}
              onToggle={(v) => toggleAndSave(prefPlatforms, setPrefPlatforms, v, (next) => profileService.updateBusinessProfile({ defaultPlatforms: next }))}
            />
          </View>
        </Card>

        <SectionHeader title={t('businessSettings.prefCategoriesSection')} />
        <Card>
          <View style={styles.chipSection}>
            <ChipGroup
              options={creatorCategoryOptions.map((c) => c.name)}
              selected={prefCreatorCats}
              onToggle={(v) => toggleAndSave(prefCreatorCats, setPrefCreatorCats, v, (next) => profileService.updateBusinessProfile({ defaultCreatorCategories: next }))}
            />
          </View>
        </Card>

        <SectionHeader title={t('businessSettings.defaultBudgetSection')} />
        <Card>
          {BUDGET_RANGES.map((range, idx) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={range}
              style={[styles.row, idx < BUDGET_RANGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => {
                setPrefBudget(range);
                profileService.updateBusinessProfile({ defaultBudgetRange: range }).catch(() => toast.error(t('businessSettings.prefSaveFailed')));
              }}>
              <Text style={[styles.rowLabel, { color: C.text }]}>{range}</Text>
              <View style={[styles.radioOuter, { borderColor: prefBudget === range ? C.brinjal1 : C.border }]}>
                {prefBudget === range ? <View style={[styles.radioInner, { backgroundColor: C.brinjal1 }]} /> : null}
              </View>
            </Pressable>
          ))}
        </Card>

        <Text style={[styles.saveHint, { color: C.textSecondary }]}>{t('businessSettings.autoSavedHint')}</Text>
      </>
    );
  }

  // ── Section: Saved Creators ───────────────────────────────────

  function renderSavedCreators() {
    if (savedCreators.length === 0) {
      return (
        <View style={styles.emptyState}>
          <FontAwesome5 name="bookmark" size={40} color={C.textSecondary} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>{t('businessSettings.noSavedCreators')}</Text>
          <Text style={[styles.emptySubText, { color: C.textSecondary }]}>{t('businessSettings.noSavedSub')}</Text>
        </View>
      );
    }
    return (
      <>
        <SectionHeader title={t('businessSettings.savedCount', { count: savedCreators.length })} />
        {savedCreators.map((creator) => {
          const isEditingNote = editingNoteId === creator.id;
          return (
            <View key={creator.id} style={[styles.creatorCard, { backgroundColor: C.surface }]}>
              <View style={styles.creatorCardTop}>
                <View style={[styles.creatorAvatar, { backgroundColor: creator.avatarBg }]}>
                  <Text style={[styles.creatorAvatarText, { color: creator.avatarColor }]}>{creator.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.creatorName, { color: C.text }]}>{creator.name}</Text>
                  <Text style={[styles.creatorMeta, { color: C.textSecondary }]}>{creator.handle} · {creator.followers}</Text>
                  <View style={[styles.categoryPill, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.categoryPillText, { color: C.brinjal1 }]}>{creator.category}</Text>
                  </View>
                </View>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.removeBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => removeCreator(creator.id)}>
                  <Text style={[styles.removeBtnText, { color: C.error }]}>{t('businessSettings.removeCreatorBtn')}</Text>
                </Pressable>
              </View>

              {creator.notes && !isEditingNote ? (
                <View style={[styles.noteBubble, { backgroundColor: C.background, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <FontAwesome5 name="sticky-note" size={12} color={C.textSecondary} />
                  <Text style={[styles.noteText, { color: C.textSecondary }]}>{creator.notes}</Text>
                </View>
              ) : null}

              {isEditingNote ? (
                <View style={[styles.noteEditRow, { backgroundColor: C.background }]}>
                  <TextInput
                    style={[styles.noteInput, { color: C.text, borderColor: C.border }]}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder={t('businessSettings.notePlaceholder')}
                    placeholderTextColor={C.textSecondary}
                    autoFocus
                  />
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.noteSaveBtn, { backgroundColor: C.brinjal1 }]} onPress={() => saveNote(creator.id)}>
                    <Text style={styles.noteSaveBtnText}>{t('businessSettings.noteSaveBtnLabel')}</Text>
                  </Pressable>
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setEditingNoteId(null)}>
                    <Ionicons name="close" size={16} color={C.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.addNoteBtn} onPress={() => { setEditingNoteId(creator.id); setNoteText(creator.notes); }}>
                  <Text style={[styles.addNoteText, { color: C.brinjal1 }]}>{creator.notes ? t('businessSettings.editNoteLabel') : t('businessSettings.addNoteLabel')}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </>
    );
  }

  // ── Section: Verification ─────────────────────────────────────

  function renderVerification() {
    const statusConfig = {
      not_verified:  { label: t('businessSettings.notVerifiedLabel'),   bg: '#F3F4F6', color: C.textSecondary },
      under_review:  { label: t('businessSettings.underReviewLabel'),   bg: '#FFF7ED', color: C.draft },
      verified:      { label: t('businessSettings.verifiedStatusLabel'), bg: '#DCFCE7', color: C.active },
    };
    const st = statusConfig[verificationStatus];

    return (
      <>
        <SectionHeader title={t('businessSettings.verificationStatusSection')} />
        <Card>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
                <FontAwesome5 name="shield-alt" size={16} color="#6366F1" />
              </View>
              <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.businessVerificationLabel')}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
        </Card>

        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.verifiedHint')}</Text>
        </HintCard>

        <SectionHeader title={t('businessSettings.uploadDocumentsSection')} />
        <Card>
          {[
            { label: t('businessSettings.panRegistrationLabel'), icon: 'file-invoice', status: panDocStatus, uploading: panUploading, upload: handleUploadPan },
            { label: t('businessSettings.companyRegLabel'), icon: 'building', status: companyRegDocStatus, uploading: companyRegUploading, upload: handleUploadCompanyReg },
          ].map((doc, idx, arr) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={doc.label}
              style={[styles.row, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              disabled={doc.uploading || doc.status === 'PENDING' || doc.status === 'APPROVED'}
              onPress={doc.upload}>
              <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
                <FontAwesome5 name={doc.icon} size={16} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{doc.label}</Text>
                <Text style={[styles.rowSub, { color: doc.status === 'APPROVED' ? C.active : C.textSecondary }]}>
                  {doc.status === 'NONE' ? t('businessSettings.tapToUploadLabel') : t(`businessSettings.docStatus${doc.status}`)}
                </Text>
              </View>
              {doc.uploading ? (
                <ActivityIndicator size="small" color={C.brinjal1} />
              ) : doc.status === 'APPROVED' ? (
                <View style={[styles.verifiedBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.badgeText, { color: C.active }]}>{t('businessSettings.doneBadge')}</Text>
                </View>
              ) : doc.status === 'PENDING' ? (
                <View style={[styles.statusBadge, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[styles.badgeText, { color: C.draft }]}>{t('businessSettings.underReviewLabel')}</Text>
                </View>
              ) : doc.status === 'REJECTED' ? (
                <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.badgeText, { color: '#DC2626' }]}>{t('businessSettings.docStatusREJECTED')}</Text>
                </View>
              ) : (
                <View style={[styles.uploadBtn, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: C.brinjal1 }]}>{t('businessSettings.uploadBtnLabel')}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </Card>
      </>
    );
  }

  // ── Section: Privacy Settings ─────────────────────────────────

  async function savePrivacy(patch: { showPublicProfile?: boolean; hideContactDetails?: boolean; allowDirectMessages?: boolean }) {
    try {
      await businessService.updatePrivacy(patch);
    } catch {
      toast.error(t('businessSettings.privacySaveFailed'));
    }
  }

  function renderPrivacy() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.privacyHint')}</Text>
        </HintCard>
        <SectionHeader title={t('businessSettings.visibilitySection')} />
        <Card>
          <SwitchRow
            iconNode={<Ionicons name="eye-outline" size={20} color={C.brinjal1} />}
            label={t('businessSettings.showProfileLabel')}
            sub={t('businessSettings.showProfileSub')}
            value={showProfilePublic}
            onChange={() => {
              const next = !showProfilePublic;
              setShowProfilePublic(next);
              savePrivacy({ showPublicProfile: next });
            }}
          />
          <SwitchRow
            iconNode={<Ionicons name="lock-closed-outline" size={20} color={C.brinjal1} />}
            label={t('businessSettings.hideContactLabel')}
            sub={t('businessSettings.hideContactSub')}
            value={hideContactDetails}
            onChange={() => {
              const next = !hideContactDetails;
              setHideContactDetails(next);
              savePrivacy({ hideContactDetails: next });
            }}
          />
          <SwitchRow
            iconNode={<Ionicons name="chatbubble-outline" size={20} color={C.brinjal1} />}
            label={t('businessSettings.allowMessagesLabel')}
            sub={t('businessSettings.allowMessagesSub')}
            value={allowDirectMessages}
            onChange={() => {
              const next = !allowDirectMessages;
              setAllowDirectMessages(next);
              savePrivacy({ allowDirectMessages: next });
            }}
            isLast
          />
        </Card>
        <Text style={[styles.saveHint, { color: C.textSecondary }]}>{t('businessSettings.privacyAutoSaved')}</Text>
      </>
    );
  }

  // ── Section: Support ──────────────────────────────────────────

  function renderSupport() {
    return (
      <>
        <SectionHeader title={t('businessSettings.getHelpSection')} />
        <Card>
          <NavRow ionIcon="help-circle-outline"         ionIconColor="#0891B2" label={t('businessSettings.helpCenterNavLabel')}  onPress={() => setSubPage('help-center')} />
          <NavRow ionIcon="chatbubble-ellipses-outline" ionIconColor="#7C3AED" label={t('businessSettings.contactSupportLabel')} onPress={() => setSubPage('contact-support')} />
          <NavRow ionIcon="warning-outline"             ionIconColor="#EF4444" label={t('businessSettings.reportIssueLabel')}    onPress={() => setSubPage('report-issue')} />
          <NavRow ionIcon="reader-outline"              ionIconColor="#F59E0B" label={t('businessSettings.faqsLabel')}           onPress={() => setSubPage('faqs')} isLast />
        </Card>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>{t('businessSettings.supportHint')}</Text>
        </HintCard>
      </>
    );
  }

  // ── Section: App Settings ─────────────────────────────────────

  function renderAppSettings() {
    return (
      <>
        <SectionHeader title={t('businessSettings.languageSection')} />
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

        <SectionHeader title={t('businessSettings.appearanceSection')} />
        <Card>
          <SwitchRow faIcon="moon" faIconColor="#6366F1" label={t('businessSettings.darkModeLabel')} sub={t('businessSettings.darkModeSub')} value={isDark} onChange={toggleDark} isLast />
        </Card>

        <SectionHeader title={t('businessSettings.aboutSection')} />
        <Card>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
              <FontAwesome5 name="info-circle" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.appVersionLabel')}</Text>
            <Text style={[styles.navValue, { color: C.textSecondary }]}>1.0.0</Text>
          </View>
          <NavRow faIcon="users" ionIconColor="#6366F1" label={t('businessSettings.teamMembersLabel')} badge="V1.1" onPress={() => showToast(t('businessSettings.teamMembersToast'))} isLast />
        </Card>
      </>
    );
  }

  // ── Main Settings ─────────────────────────────────────────────

  function renderMainSettings() {
    return (
      <>
        <SectionHeader title={t('businessSettings.accountSection')} />
        <Card>
          <View style={[styles.accountCard, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[styles.accountAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={styles.accountAvatarText}>{(user?.name ?? 'B')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: C.text }]}>{user?.name ?? 'Business'}</Text>
              <Text style={[styles.accountEmail, { color: C.textSecondary }]}>{user?.email ?? 'business@example.com'}</Text>
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.editBtn, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(business)/settings?section=profile' as Parameters<typeof router.push>[0])}>
              <Text style={[styles.editBtnText, { color: C.brinjal1 }]}>{t('businessSettings.editBtnLabel')}</Text>
            </Pressable>
          </View>
          <NavRow faIcon="building" ionIconColor="#6366F1" label={t('businessSettings.businessProfileNav')}  onPress={() => router.push('/(business)/settings?section=profile' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="check-circle" ionIconColor="#10B981" label={t('businessSettings.verificationNav')}      onPress={() => router.push('/(business)/settings?section=verification' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="trash-alt" label={t('businessSettings.deleteAccountNav')}   onPress={handleDeleteAccount} danger isLast />
        </Card>

        <SectionHeader title={t('businessSettings.preferencesSection')} />
        <Card>
          <NavRow faIcon="bell" ionIconColor="#D97706" label={t('businessSettings.notificationsNav')}    onPress={() => router.push('/(business)/settings?section=notifications' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="credit-card" ionIconColor="#059669" label={t('businessSettings.paymentSettingsNav')}  onPress={() => router.push('/(business)/settings?section=payment' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="bullseye" ionIconColor="#DC2626" label={t('businessSettings.eventPreferencesNav')} onPress={() => router.push('/(business)/settings?section=campaigns' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="bookmark" ionIconColor="#6366F1" label={t('businessSettings.savedCreatorsNav')}    onPress={() => router.push('/(business)/settings?section=saved' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="lock" ionIconColor="#6366F1" label={t('businessSettings.privacySettingsNav')}  onPress={() => router.push('/(business)/settings?section=privacy' as Parameters<typeof router.push>[0])} />
          <NavRow faIcon="shield-alt" label={t('businessSettings.accountSecurityNav')} onPress={() => router.push('/(business)/settings?section=account' as Parameters<typeof router.push>[0])} isLast />
        </Card>

        <SectionHeader title={t('businessSettings.appSection')} />
        <Card>
          <SwitchRow faIcon="moon" faIconColor="#6366F1" label={t('businessSettings.darkModeLabel')} value={isDark} onChange={toggleDark} />
          <View style={[styles.row, { borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[styles.navIonIconWrap, { backgroundColor: '#6366F118' }]}>
              <FontAwesome5 name="info-circle" size={16} color="#6366F1" />
            </View>
            <Text style={[styles.rowLabel, { color: C.text }]}>{t('businessSettings.appVersionLabel')}</Text>
            <Text style={[styles.navValue, { color: C.textSecondary }]}>1.0.0</Text>
          </View>
          <NavRow faIcon="users" ionIconColor="#6366F1" label={t('businessSettings.teamMembersLabel')} badge="V1.1" onPress={() => showToast(t('businessSettings.teamMembersToast'))} isLast />
        </Card>

        <SectionHeader title={t('businessSettings.helpSection')} />
        <Card>
          <NavRow faIcon="question-circle" ionIconColor="#6366F1" label={t('businessSettings.supportNav')} onPress={() => router.push('/(business)/settings?section=support' as Parameters<typeof router.push>[0])} isLast />
        </Card>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <ColorCtx.Provider value={C}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
        <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientTopBar}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]} onPress={handleBack}>
              <Text style={[styles.backArrow, { color: '#fff' }]}>‹</Text>
            </Pressable>
            <Text style={[styles.topTitle, { color: '#fff' }]}>{topTitle}</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          {/* Sections */}
          {!subPage && !section                    && renderMainSettings()}
          {!subPage && section === 'profile'       && renderProfile()}
          {!subPage && section === 'account'       && renderAccount()}
          {!subPage && section === 'notifications' && renderNotifications()}
          {!subPage && section === 'payment'       && renderPayment()}
          {!subPage && section === 'campaigns'     && renderCampaignPreferences()}
          {!subPage && section === 'saved'         && renderSavedCreators()}
          {!subPage && section === 'verification'  && renderVerification()}
          {!subPage && section === 'privacy'       && renderPrivacy()}
          {!subPage && section === 'support'       && renderSupport()}
          {!subPage && section === 'app'           && renderAppSettings()}

          <View style={{ height: 48 }} />
        </ScrollView>
        </KeyboardAvoidingView>

        <AppModal
          visible={appModal.visible}
          type={appModal.type}
          title={appModal.title}
          body={appModal.body}
          confirmLabel={appModal.confirmLabel}
          warning={appModal.warning}
          onConfirm={appModal.onConfirm}
          onCancel={closeAppModal}
        />
      </SafeAreaView>
    </ColorCtx.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 24 },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, lineHeight: 30 },
  topTitle: { fontSize: 20, fontWeight: '700', fontFamily: F.bold, lineHeight: 24 },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0,
    marginTop: 20, marginBottom: 6, marginHorizontal: 20, fontFamily: F.bold,
  },
  card: {
    marginHorizontal: 16, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden',
  },
  hintCard: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  hintText: { fontSize: 13, lineHeight: 18, fontFamily: F.regular },
  saveHint: { textAlign: 'center', fontSize: 12, marginTop: 8, marginHorizontal: 16, fontFamily: F.regular },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowIconNode: { width: 24, alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500', fontFamily: F.medium },
  rowSub: { fontSize: 12, marginTop: 1, fontFamily: F.regular },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navArrow: { fontSize: 18 },
  navValue: { fontSize: 14, fontFamily: F.regular },

  chipSection: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: F.medium },

  logoPicker: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', height: 100, justifyContent: 'center', alignItems: 'center', gap: 4 },
  logoPickerText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  logoPickerSub: { fontSize: 11, fontFamily: F.regular },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionalTag: { fontSize: 12, fontFamily: F.regular },

  socialInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, height: 48, gap: 8 },
  socialIconCircle: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialInput: { flex: 1, fontSize: 14, fontFamily: F.regular },

  actionGroup: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  secondaryBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', fontFamily: F.bold },

  inlineForm: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 14 },
  formField: { gap: 5 },
  formFieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  formInput: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: F.regular },
  formTextarea: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, minHeight: 110, fontFamily: F.regular },
  fieldError: { fontSize: 12, fontWeight: '500', fontFamily: F.medium },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12 },
  pwInput: { flex: 1, fontSize: 14, paddingVertical: 11, fontFamily: F.regular },
  eyeBtn: { padding: 6 },

  paymentIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxOuter: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 11, height: 11, borderRadius: 6 },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  txDesc: { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  txDate: { fontSize: 12, marginTop: 2, fontFamily: F.regular },
  txAmount: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },

  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  accountAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: F.bold },
  accountName: { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  accountEmail: { fontSize: 13, marginTop: 2, fontFamily: F.regular },
  editBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  soonBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  verifiedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  uploadBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },

  creatorCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  creatorCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  creatorAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  creatorAvatarText: { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  creatorName: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  creatorMeta: { fontSize: 12, marginTop: 2, fontFamily: F.regular },
  categoryPill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  categoryPillText: { fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  removeBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  removeBtnText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  noteBubble: { marginTop: 10, borderRadius: 8, padding: 10 },
  noteText: { fontSize: 13, fontFamily: F.regular },
  addNoteBtn: { paddingTop: 10 },
  addNoteText: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  noteEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderRadius: 8, padding: 8 },
  noteInput: { flex: 1, fontSize: 13, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontFamily: F.regular },
  noteSaveBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  noteSaveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600', fontFamily: F.semibold },
  emptySubText: { fontSize: 13, fontFamily: F.regular },

  faqCard: { borderRadius: 12, padding: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  faqQ: { fontSize: 14, fontWeight: '700', lineHeight: 20, fontFamily: F.bold },
  faqA: { fontSize: 13, lineHeight: 19, fontFamily: F.regular },

  accordionCard: { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden', backgroundColor: 'transparent' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  accordionTitle: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20, fontFamily: F.bold },
  accordionBody: { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14, fontFamily: F.regular },
  navIonIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  toast: {
    position: 'absolute', bottom: 32, left: 32, right: 32,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, fontFamily: F.semibold },

  otpCloseBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  phoneField: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: F.regular },
  phoneError: { fontSize: 12, fontFamily: F.regular, marginTop: -4 },
  phoneActionBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  phoneActionBtnText: { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },

  langCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 2, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  langFlag: { fontSize: 32 },
  langNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  langName: { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  langNative: { fontSize: 13, fontFamily: F.regular },
  langDesc: { fontSize: 12, fontFamily: F.regular },
  activeLangCheck: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  inactiveLangCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
});
