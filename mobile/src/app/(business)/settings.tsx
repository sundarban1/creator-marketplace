import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { businessService } from '@/services/business';
import { authService } from '@/services/auth';
import { COLORS } from '@/utilities/constants';

type ColorsType = typeof COLORS;
const ColorCtx = createContext<ColorsType>(COLORS);

// ── Data ──────────────────────────────────────────────────────────────────────

const BUSINESS_CATEGORIES = [
  'Food & Beverage', 'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Fitness',
  'Home & Living', 'Technology', 'Education', 'Travel & Tourism', 'Wellness',
  'Gaming & Entertainment', 'Automotive', 'Finance & Banking', 'E-commerce',
  'Healthcare', 'Art & Design', 'Photography', 'Media & Film', 'Sustainability',
];

const CREATOR_CATEGORIES = ['Food', 'Travel', 'Fashion', 'Lifestyle', 'Tech', 'Fitness', 'Beauty', 'Gaming'];

const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'YouTube'];

const BUDGET_RANGES = ['Under NPR 5,000', 'NPR 5,000–15,000', 'NPR 15,000–50,000', 'NPR 50,000+'];

const NEPAL_PAYMENTS = [
  { id: 'esewa',    icon: '💚', label: 'eSewa',         color: '#60BB46' },
  { id: 'khalti',   icon: '💜', label: 'Khalti',        color: '#5C2D91' },
  { id: 'bank',     icon: '🏦', label: 'Bank Transfer', color: '#1877F2' },
];
const INTL_PAYMENTS = [
  { id: 'card',     icon: '💳', label: 'Visa / Mastercard', color: '#003087' },
  { id: 'stripe',   icon: '⚡', label: 'Stripe',            color: '#635BFF', future: true },
];

const MOCK_SAVED_CREATORS = [
  { id: 's1', name: 'Sarah Johnson',  handle: '@sarahjcreates',  followers: '28.4K', category: 'Lifestyle', avatar: 'SJ', avatarBg: '#EDE9FE', avatarColor: '#4F46E5', notes: '' },
  { id: 's2', name: 'James Liu',      handle: '@jamesliu_nz',    followers: '63.2K', category: 'Tech',      avatar: 'JL', avatarBg: '#FFF7ED', avatarColor: '#D97706', notes: 'Great engagement rate' },
  { id: 's3', name: 'Priya Patel',    handle: '@priyalifestyle', followers: '14.9K', category: 'Fashion',   avatar: 'PP', avatarBg: '#FEE2E2', avatarColor: '#DC2626', notes: '' },
];

const MOCK_TRANSACTIONS = [
  { id: 't1', date: 'Jun 10, 2026', desc: 'Campaign: Winter Menu',      amount: '-NZ$200', type: 'debit' },
  { id: 't2', date: 'Jun 05, 2026', desc: 'Wallet Top-up',              amount: '+NZ$500', type: 'credit' },
  { id: 't3', date: 'May 28, 2026', desc: 'Campaign: New Collection',   amount: '-NZ$380', type: 'debit' },
];

const SECTION_TITLES: Record<string, string> = {
  profile:       'Business Profile',
  account:       'Account & Security',
  notifications: 'Notification Settings',
  payment:       'Payment Settings',
  campaigns:     'Campaign Preferences',
  saved:         'Saved Creators',
  verification:  'Verification',
  privacy:       'Privacy Settings',
  support:       'Support',
  app:           'Settings',
};

const SUB_PAGE_TITLES: Record<string, string> = {
  'change-password': 'Change Password',
  'help-center':     'Help Center',
  'contact-support': 'Contact Support',
  'report-issue':    'Report Issue',
  'faqs':            'FAQs',
};

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

type SwitchRowProps = { label: string; icon?: string; iconNode?: ReactNode; sub?: string; value: boolean; onChange: () => void; isLast?: boolean };
function SwitchRow({ label, icon, iconNode, sub, value, onChange, isLast = false }: SwitchRowProps) {
  const C = useContext(ColorCtx);
  return (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      {iconNode ? <View style={styles.rowIconNode}>{iconNode}</View> : icon ? <Text style={styles.rowIcon}>{icon}</Text> : null}
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

type NavRowProps = { icon?: string; label: string; sub?: string; value?: string; badge?: string; onPress: () => void; danger?: boolean; isLast?: boolean };
function NavRow({ icon, label, sub, value, badge, onPress, danger = false, isLast = false }: NavRowProps) {
  const C = useContext(ColorCtx);
  return (
    <Pressable style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]} onPress={onPress}>
      {icon ? <Text style={styles.rowIcon}>{icon}</Text> : null}
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
          <Pressable
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
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useIsDark();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const C: ColorsType = useAppColors();
  const toast = useToast();

  const [subPage, setSubPage] = useState<string | null>(null);

  // ── Section 1: Business Profile ──
  const [bizName, setBizName] = useState(user?.name ?? '');
  const [bizCategory, setBizCategory] = useState<string[]>([]);
  const [bizDescription, setBizDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');

  // ── Section 2: Account ──
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSubmitted, setPwSubmitted] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Section 3: Notifications ──
  const [notifApplications, setNotifApplications] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifCampaignUpdates, setNotifCampaignUpdates] = useState(true);
  const [notifCreatorAccepted, setNotifCreatorAccepted] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(true);

  // ── Section 4: Payment ──
  const [nepalPayments, setNepalPayments] = useState<string[]>(['esewa']);
  const [intlPayments, setIntlPayments] = useState<string[]>([]);
  const [billingCompany, setBillingCompany] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [vatPan, setVatPan] = useState('');

  // ── Section 5: Campaign Preferences ──
  const [prefPlatforms, setPrefPlatforms] = useState(['Instagram', 'TikTok']);
  const [prefCreatorCats, setPrefCreatorCats] = useState(['Food', 'Fashion']);
  const [prefBudget, setPrefBudget] = useState('NPR 5,000–15,000');

  // ── Section 6: Saved Creators ──
  const [savedCreators, setSavedCreators] = useState(MOCK_SAVED_CREATORS);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // ── Section 8: Verification ──
  const [panUploaded, setPanUploaded] = useState(false);
  const [regCertUploaded, setRegCertUploaded] = useState(false);
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const verificationStatus = panUploaded && regCertUploaded ? 'under_review' : 'not_verified';

  // ── Section 9: Privacy ──
  const [showProfilePublic, setShowProfilePublic] = useState(true);
  const [hideContactDetails, setHideContactDetails] = useState(false);
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);

  useEffect(() => {
    businessService.getMyProfile().then((p) => {
      setShowProfilePublic(p.showPublicProfile);
      setHideContactDetails(p.hideContactDetails);
      setAllowDirectMessages(p.allowDirectMessages);
    }).catch(() => {});
  }, []);

  // ── Support forms ──
  const [supportTopic, setSupportTopic] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  function showToast(msg: string) { toast.success(msg); }

  // ── Helpers ──

  function toggleChip(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function toggleBizCategory(val: string) {
    setBizCategory((prev) => {
      if (prev.includes(val)) return prev.filter((x) => x !== val);
      if (prev.length >= 3) return prev;
      return [...prev, val];
    });
  }

  function togglePayment(arr: string[], setArr: (v: string[]) => void, id: string) {
    setArr((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleSaveProfile() {
    showToast('Business profile saved!');
  }

  function handleSavePayment() {
    showToast('Billing information saved!');
  }

  function handleChangePassword() {
    setPwSubmitted(true);
    if (newPw.length >= 8 && newPw === confirmPw) {
      setNewPw(''); setConfirmPw(''); setPwSubmitted(false);
      showToast('Password changed successfully!');
      setSubPage(null);
    }
  }

  function handleLogoutAll() {
    Alert.alert('Logout All Devices', 'You will be signed out from all devices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout All', style: 'destructive', onPress: logout },
    ]);
  }

  function handleDeactivateAccount() {
    Alert.alert(
      'Deactivate Account',
      'Your account will be temporarily disabled. Your campaigns will be paused and your profile will be hidden from creators. You can reactivate anytime by logging back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.deactivateAccount();
              await logout();
            } catch {
              toast.error('Failed to deactivate. Please try again.');
            }
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert('Delete Account', 'This permanently deletes your account and all data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: logout },
    ]);
  }

  function removeCreator(id: string) {
    Alert.alert('Remove Creator', 'Remove from saved creators?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setSavedCreators((p) => p.filter((c) => c.id !== id)) },
    ]);
  }

  function saveNote(id: string) {
    setSavedCreators((p) => p.map((c) => c.id === id ? { ...c, notes: noteText } : c));
    setEditingNoteId(null);
    setNoteText('');
    showToast('Note saved');
  }

  function handleSupportSubmit() {
    if (!supportMsg.trim()) return;
    setSupportTopic(''); setSupportMsg('');
    showToast("Message sent. We'll respond within 24 hours.");
    setSubPage(null);
  }

  function handleReportSubmit() {
    if (!reportDesc.trim()) return;
    setReportType(''); setReportDesc('');
    showToast('Issue reported. Thank you!');
    setSubPage(null);
  }

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
                  <Text>{showNewPw ? '🙈' : '👁'}</Text>
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
                  <Text>{showConfirmPw ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
              {cPwError ? <Text style={[styles.fieldError, { color: C.error }]}>{cPwError}</Text> : null}
            </View>
            <Pressable style={[styles.primaryBtn, { backgroundColor: C.brinjal1 }]} onPress={handleChangePassword}>
              <Text style={styles.primaryBtnText}>Update Password</Text>
            </Pressable>
          </View>
        </Card>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Use a strong password with letters, numbers, and symbols.</Text>
        </HintCard>
      </>
    );
  }

  // ── Sub-page: Help Center ─────────────────────────────────────

  const HELP_FAQS = [
    { q: 'How do I post a campaign?', a: 'Go to Campaigns → tap the + button → fill in your campaign details, budget, and requirements → publish. Creators will begin applying within hours.' },
    { q: 'How are payments handled?', a: 'Budgets are held in escrow before work begins. Once you confirm content delivery, payment is released to the creator within 5 business days.' },
    { q: 'How do I pick the right creator?', a: 'Review their follower count, engagement rate, past work, and category match. Check proposal rate vs. your budget. Shortlisted creators stay in your pipeline.' },
    { q: 'Can I cancel a campaign?', a: 'Yes, draft campaigns can be cancelled anytime. Active campaigns can be closed, but you may need to pay creators who have already delivered work.' },
    { q: "What if a creator doesn't deliver?", a: 'Open a dispute from the campaign detail page. Our team mediates and you are eligible for a refund if the creator fails to deliver as agreed.' },
  ];

  function renderHelpCenter() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Find answers to common questions about running campaigns on CreatorMarket.</Text>
        </HintCard>
        {HELP_FAQS.map((item, i) => (
          <View key={i} style={{ marginTop: 12, marginHorizontal: 16 }}>
            <View style={[styles.faqCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.faqQ, { color: C.text }]}>{item.q}</Text>
              <Text style={[styles.faqA, { color: C.textSecondary }]}>{item.a}</Text>
            </View>
          </View>
        ))}
      </>
    );
  }

  // ── Sub-page: Contact Support ─────────────────────────────────

  const SUPPORT_TOPICS = ['Technical Issue', 'Payment Problem', 'Campaign Issue', 'Creator Issue', 'Billing', 'Other'];

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
            <Pressable style={[styles.primaryBtn, { backgroundColor: C.brinjal1, opacity: supportMsg.trim() ? 1 : 0.45 }]} onPress={handleSupportSubmit}>
              <Text style={styles.primaryBtnText}>Send Message</Text>
            </Pressable>
          </View>
        </Card>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>📧 support@creatormarket.com — we respond within 24 hours.</Text>
        </HintCard>
      </>
    );
  }

  // ── Sub-page: Report Issue ────────────────────────────────────

  const REPORT_TYPES = ['App Bug', 'Payment Issue', 'Creator Issue', 'Campaign Problem', 'Inappropriate Content', 'Other'];

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
                placeholder="Describe the issue in as much detail as possible..."
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
            <Pressable style={[styles.primaryBtn, { backgroundColor: C.error, opacity: reportDesc.trim() ? 1 : 0.45 }]} onPress={handleReportSubmit}>
              <Text style={styles.primaryBtnText}>Submit Report</Text>
            </Pressable>
          </View>
        </Card>
      </>
    );
  }

  // ── Sub-page: FAQs ────────────────────────────────────────────

  const FAQS = [
    { q: 'What is CreatorMarket for businesses?', a: 'CreatorMarket lets you find and hire local content creators for paid collaborations — video promotions, product reviews, social media marketing, and more.' },
    { q: 'How much does it cost?', a: 'Posting campaigns is free. A 10% platform fee applies on each completed collaboration, deducted from the campaign budget.' },
    { q: 'How do I find the right creators?', a: 'Browse creator profiles by category, follower count, and platform. Or post a campaign and let creators apply to you.' },
    { q: 'What payment methods are supported?', a: 'For Nepal: eSewa, Khalti, and Bank Transfer. For international campaigns: Visa/Mastercard. Stripe support is coming soon.' },
    { q: 'Can I run multiple campaigns at once?', a: 'Yes. You can have multiple active campaigns simultaneously and manage all proposals in one place.' },
    { q: 'Is my business information secure?', a: 'Yes. We use industry-standard encryption. Your contact details can be hidden from the public profile in Privacy Settings.' },
  ];

  function renderFAQs() {
    return (
      <>
        {FAQS.map((item, i) => (
          <View key={i} style={{ marginTop: 10, marginHorizontal: 16 }}>
            <View style={[styles.faqCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.faqQ, { color: C.text }]}>{item.q}</Text>
              <Text style={[styles.faqA, { color: C.textSecondary }]}>{item.a}</Text>
            </View>
          </View>
        ))}
      </>
    );
  }

  // ── Section: Business Profile ─────────────────────────────────

  function renderProfile() {
    return (
      <>
        {/* Company Information */}
        <SectionHeader title="Company Information" />
        <Card>
          <View style={styles.inlineForm}>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Business Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={bizName}
                onChangeText={setBizName}
                placeholder="Your business name"
                placeholderTextColor={C.textSecondary}
              />
            </View>
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Business Logo</Text>
              <Pressable style={[styles.logoPicker, { backgroundColor: C.background, borderColor: C.border }]}>
                <Text style={styles.logoPickerEmoji}>🏢</Text>
                <Text style={[styles.logoPickerText, { color: C.brinjal1 }]}>Tap to upload logo</Text>
                <Text style={[styles.logoPickerSub, { color: C.textSecondary }]}>JPG or PNG, square preferred</Text>
              </Pressable>
            </View>
            <View style={styles.formField}>
              <View style={styles.labelRow}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Business Category</Text>
                <Text style={[styles.optionalTag, { color: C.textSecondary }]}>{bizCategory.length}/3</Text>
              </View>
              <View style={styles.chipGroup}>
                {BUSINESS_CATEGORIES.map((cat) => {
                  const active = bizCategory.includes(cat);
                  const disabled = !active && bizCategory.length >= 3;
                  return (
                    <Pressable
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
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Business Description</Text>
              <TextInput
                style={[styles.formTextarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={bizDescription}
                onChangeText={setBizDescription}
                placeholder="Describe your business, products, and what you're looking for in a creator..."
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </Card>

        {/* Online Presence */}
        <SectionHeader title="Online Presence" />
        <Card>
          <View style={styles.inlineForm}>
            {[
              { label: 'Website', icon: '🌐', value: website, set: setWebsite, placeholder: 'https://yourbusiness.com', keyboard: 'url' as const },
              { label: 'Facebook Page', icon: '💬', value: facebook, set: setFacebook, placeholder: 'https://facebook.com/yourpage', keyboard: 'url' as const },
              { label: 'Instagram', icon: '📸', value: instagram, set: setInstagram, placeholder: '@yourhandle', keyboard: 'default' as const },
              { label: 'TikTok', icon: '🎵', value: tiktok, set: setTiktok, placeholder: '@yourhandle', keyboard: 'default' as const },
            ].map((f) => (
              <View key={f.label} style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{f.label}</Text>
                <View style={[styles.socialInputRow, { backgroundColor: C.background, borderColor: C.border }]}>
                  <Text style={styles.socialInputIcon}>{f.icon}</Text>
                  <TextInput
                    style={[styles.socialInput, { color: C.text }]}
                    value={f.value}
                    onChangeText={f.set}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={f.keyboard}
                  />
                </View>
              </View>
            ))}
            <View style={styles.formField}>
              <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>Location</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City, Country"
                placeholderTextColor={C.textSecondary}
              />
            </View>
          </View>
        </Card>

        {/* Contact Information */}
        <SectionHeader title="Contact Information" />
        <Card>
          <View style={styles.inlineForm}>
            {[
              { label: 'Contact Person Name', value: contactName, set: setContactName, placeholder: 'Full name', keyboard: 'default' as const },
              { label: 'Email Address', value: contactEmail, set: setContactEmail, placeholder: 'email@business.com', keyboard: 'email-address' as const },
              { label: 'Phone Number', value: contactPhone, set: setContactPhone, placeholder: '+977 9800000000', keyboard: 'phone-pad' as const },
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
          <Pressable style={[styles.primaryBtn, { backgroundColor: C.brinjal1 }]} onPress={handleSaveProfile}>
            <Text style={styles.primaryBtnText}>Save Changes</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[styles.secondaryBtnText, { color: C.brinjal1 }]}>Preview Profile</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // ── Section: Account & Security ───────────────────────────────

  function renderAccount() {
    return (
      <>
        <SectionHeader title="Login & Security" />
        <Card>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text }]}>Email Address</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>{user?.email ?? 'business@example.com'}</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.badgeText, { color: C.active }]}>✓ Verified</Text>
            </View>
          </View>
          <NavRow icon="🔑" label="Change Password" onPress={() => setSubPage('change-password')} />
          <View style={[styles.row, { borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.text }]}>Login Sessions</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>1 active session</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>🔐</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>Two-Factor Authentication</Text>
            <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.badgeText, { color: C.brinjal1 }]}>Coming Soon</Text>
            </View>
          </View>
        </Card>

        <SectionHeader title="Actions" />
        <Card>
          <NavRow icon="📱" label="Logout All Devices" onPress={handleLogoutAll} />
          <NavRow icon="⏸️" label="Deactivate Account" sub="Temporarily disable your account" onPress={handleDeactivateAccount} danger />
          <NavRow icon="🗑️" label="Delete Account" sub="Permanently remove all your data" onPress={handleDeleteAccount} danger isLast />
        </Card>

        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Deactivating pauses your account — you can return anytime by logging back in. Deletion is permanent.</Text>
        </HintCard>
      </>
    );
  }

  // ── Section: Notifications ────────────────────────────────────

  function renderNotifications() {
    return (
      <>
        <SectionHeader title="Push Notifications" />
        <Card>
          <SwitchRow icon="📋" label="New Creator Applications" sub="When creators apply to your campaigns" value={notifApplications} onChange={() => setNotifApplications((v) => !v)} />
          <SwitchRow icon="💬" label="New Messages" sub="Chat messages from creators" value={notifMessages} onChange={() => setNotifMessages((v) => !v)} />
          <SwitchRow icon="📊" label="Campaign Updates" sub="Status changes for your campaigns" value={notifCampaignUpdates} onChange={() => setNotifCampaignUpdates((v) => !v)} />
          <SwitchRow icon="✅" label="Creator Accepted Campaign" sub="When a creator confirms collaboration" value={notifCreatorAccepted} onChange={() => setNotifCreatorAccepted((v) => !v)} isLast />
        </Card>

        <SectionHeader title="Email Notifications" />
        <Card>
          <SwitchRow icon="📧" label="Enable Emails" sub="Receive email notifications" value={emailEnabled} onChange={() => setEmailEnabled((v) => !v)} />
          <SwitchRow icon="📈" label="Weekly Campaign Summary" sub="Performance digest every Monday" value={emailWeeklySummary} onChange={() => setEmailWeeklySummary((v) => !v)} isLast />
        </Card>

        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Changes are saved automatically. You can change your email preferences anytime.</Text>
        </HintCard>
      </>
    );
  }

  // ── Section: Payment Settings ─────────────────────────────────

  function renderPayment() {
    return (
      <>
        <SectionHeader title="Nepal Payment Methods" />
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Select all methods you want to use for campaign payments.</Text>
        </HintCard>
        <Card>
          {NEPAL_PAYMENTS.map((m, idx) => {
            const selected = nepalPayments.includes(m.id);
            return (
              <Pressable
                key={m.id}
                style={[styles.row, idx < NEPAL_PAYMENTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => togglePayment(nepalPayments, setNepalPayments, m.id)}>
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

        <SectionHeader title="International Payment Methods" />
        <Card>
          {INTL_PAYMENTS.map((m, idx) => {
            const selected = intlPayments.includes(m.id);
            return (
              <Pressable
                key={m.id}
                style={[styles.row, idx < INTL_PAYMENTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => { if (!m.future) togglePayment(intlPayments, setIntlPayments, m.id); }}>
                <View style={[styles.paymentIcon, { backgroundColor: m.color + '18' }]}>
                  <Text style={styles.paymentEmoji}>{m.icon}</Text>
                </View>
                <Text style={[styles.rowLabel, { color: C.text }]}>{m.label}</Text>
                {'future' in m && m.future ? (
                  <View style={[styles.soonBadge, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.badgeText, { color: C.brinjal1 }]}>Coming Soon</Text>
                  </View>
                ) : (
                  <View style={[styles.checkboxOuter, { borderColor: selected ? C.brinjal1 : C.border, backgroundColor: selected ? C.brinjal1 : 'transparent' }]}>
                    {selected ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </Card>

        <SectionHeader title="Billing Information" />
        <Card>
          <View style={styles.inlineForm}>
            {[
              { label: 'Company Name', value: billingCompany, set: setBillingCompany, placeholder: 'Registered company name' },
              { label: 'Billing Address', value: billingAddress, set: setBillingAddress, placeholder: 'Street, City, Country' },
              { label: 'VAT / PAN Number', value: vatPan, set: setVatPan, placeholder: 'e.g. 123456789' },
            ].map((f) => (
              <View key={f.label} style={styles.formField}>
                <Text style={[styles.formFieldLabel, { color: C.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.textSecondary}
                />
              </View>
            ))}
            <Pressable style={[styles.primaryBtn, { backgroundColor: C.brinjal1 }]} onPress={handleSavePayment}>
              <Text style={styles.primaryBtnText}>Save Billing Info</Text>
            </Pressable>
          </View>
        </Card>

        <SectionHeader title="Payment History" />
        <Card>
          {MOCK_TRANSACTIONS.map((tx, idx) => (
            <View key={tx.id} style={[styles.txRow, idx < MOCK_TRANSACTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: C.text }]}>{tx.desc}</Text>
                <Text style={[styles.txDate, { color: C.textSecondary }]}>{tx.date}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'credit' ? C.active : C.text }]}>{tx.amount}</Text>
            </View>
          ))}
        </Card>
        <Card>
          <NavRow icon="🧾" label="Receipts" onPress={() => showToast('No receipts yet')} />
          <NavRow icon="📄" label="Invoices" onPress={() => showToast('No invoices yet')} isLast />
        </Card>
      </>
    );
  }

  // ── Section: Campaign Preferences ────────────────────────────

  function renderCampaignPreferences() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>These help us show your campaigns to the most relevant creators.</Text>
        </HintCard>

        <SectionHeader title="Preferred Platforms" />
        <Card>
          <View style={styles.chipSection}>
            <ChipGroup options={PLATFORMS} selected={prefPlatforms} onToggle={(v) => toggleChip(prefPlatforms, setPrefPlatforms, v)} />
          </View>
        </Card>

        <SectionHeader title="Preferred Creator Categories" />
        <Card>
          <View style={styles.chipSection}>
            <ChipGroup options={CREATOR_CATEGORIES} selected={prefCreatorCats} onToggle={(v) => toggleChip(prefCreatorCats, setPrefCreatorCats, v)} />
          </View>
        </Card>

        <SectionHeader title="Default Budget Range" />
        <Card>
          {BUDGET_RANGES.map((range, idx) => (
            <Pressable
              key={range}
              style={[styles.row, idx < BUDGET_RANGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => setPrefBudget(range)}>
              <Text style={[styles.rowLabel, { color: C.text }]}>{range}</Text>
              <View style={[styles.radioOuter, { borderColor: prefBudget === range ? C.brinjal1 : C.border }]}>
                {prefBudget === range ? <View style={[styles.radioInner, { backgroundColor: C.brinjal1 }]} /> : null}
              </View>
            </Pressable>
          ))}
        </Card>

        <Text style={[styles.saveHint, { color: C.textSecondary }]}>Changes are saved automatically.</Text>
      </>
    );
  }

  // ── Section: Saved Creators ───────────────────────────────────

  function renderSavedCreators() {
    if (savedCreators.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔖</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>No saved creators yet</Text>
          <Text style={[styles.emptySubText, { color: C.textSecondary }]}>Browse campaigns and save creators you like</Text>
        </View>
      );
    }
    return (
      <>
        <SectionHeader title={`Saved (${savedCreators.length})`} />
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
                <Pressable style={[styles.removeBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => removeCreator(creator.id)}>
                  <Text style={[styles.removeBtnText, { color: C.error }]}>Remove</Text>
                </Pressable>
              </View>

              {creator.notes && !isEditingNote ? (
                <View style={[styles.noteBubble, { backgroundColor: C.background }]}>
                  <Text style={[styles.noteText, { color: C.textSecondary }]}>📝 {creator.notes}</Text>
                </View>
              ) : null}

              {isEditingNote ? (
                <View style={[styles.noteEditRow, { backgroundColor: C.background }]}>
                  <TextInput
                    style={[styles.noteInput, { color: C.text, borderColor: C.border }]}
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="Add a note..."
                    placeholderTextColor={C.textSecondary}
                    autoFocus
                  />
                  <Pressable style={[styles.noteSaveBtn, { backgroundColor: C.brinjal1 }]} onPress={() => saveNote(creator.id)}>
                    <Text style={styles.noteSaveBtnText}>Save</Text>
                  </Pressable>
                  <Pressable onPress={() => setEditingNoteId(null)}>
                    <Text style={[styles.noteCancelText, { color: C.textSecondary }]}>✕</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.addNoteBtn} onPress={() => { setEditingNoteId(creator.id); setNoteText(creator.notes); }}>
                  <Text style={[styles.addNoteText, { color: C.brinjal1 }]}>{creator.notes ? 'Edit note' : '+ Add note'}</Text>
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
      not_verified:  { label: 'Not Verified',  bg: '#F3F4F6', color: C.textSecondary },
      under_review:  { label: 'Under Review',  bg: '#FFF7ED', color: C.draft },
      verified:      { label: 'Verified ✓',    bg: '#DCFCE7', color: C.active },
    };
    const st = statusConfig[verificationStatus];

    return (
      <>
        <SectionHeader title="Verification Status" />
        <Card>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.rowIcon}>🛡️</Text>
              <Text style={[styles.rowLabel, { color: C.text }]}>Business Verification</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
        </Card>

        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Verified businesses get a badge on their profile and higher trust from creators.</Text>
        </HintCard>

        <SectionHeader title="Upload Documents" />
        <Card>
          {[
            { label: 'PAN Registration', icon: '📄', uploaded: panUploaded, toggle: () => setPanUploaded((v) => !v) },
            { label: 'Company Registration Certificate', icon: '🏢', uploaded: regCertUploaded, toggle: () => setRegCertUploaded((v) => !v) },
            { label: 'Business License', icon: '📋', uploaded: licenseUploaded, toggle: () => setLicenseUploaded((v) => !v) },
          ].map((doc, idx, arr) => (
            <Pressable
              key={doc.label}
              style={[styles.row, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={doc.toggle}>
              <Text style={styles.rowIcon}>{doc.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>{doc.label}</Text>
                <Text style={[styles.rowSub, { color: doc.uploaded ? C.active : C.textSecondary }]}>
                  {doc.uploaded ? '✓ Uploaded' : 'Tap to upload'}
                </Text>
              </View>
              {doc.uploaded ? (
                <View style={[styles.verifiedBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.badgeText, { color: C.active }]}>Done</Text>
                </View>
              ) : (
                <View style={[styles.uploadBtn, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: C.brinjal1 }]}>Upload</Text>
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
      toast.error('Failed to save. Please try again.');
    }
  }

  function renderPrivacy() {
    return (
      <>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Control who can see your business information and contact you.</Text>
        </HintCard>
        <SectionHeader title="Visibility" />
        <Card>
          <SwitchRow
            iconNode={<Ionicons name="eye-outline" size={20} color={C.brinjal1} />}
            label="Show Business Profile Publicly"
            sub="Creators can find and view your profile"
            value={showProfilePublic}
            onChange={() => {
              const next = !showProfilePublic;
              setShowProfilePublic(next);
              savePrivacy({ showPublicProfile: next });
            }}
          />
          <SwitchRow
            iconNode={<Ionicons name="lock-closed-outline" size={20} color={C.brinjal1} />}
            label="Hide Contact Details"
            sub="Keep website and contact info private"
            value={hideContactDetails}
            onChange={() => {
              const next = !hideContactDetails;
              setHideContactDetails(next);
              savePrivacy({ hideContactDetails: next });
            }}
          />
          <SwitchRow
            iconNode={<Ionicons name="chatbubble-outline" size={20} color={C.brinjal1} />}
            label="Allow Creators to Message Directly"
            sub="Creators can initiate conversations from your profile"
            value={allowDirectMessages}
            onChange={() => {
              const next = !allowDirectMessages;
              setAllowDirectMessages(next);
              savePrivacy({ allowDirectMessages: next });
            }}
            isLast
          />
        </Card>
        <Text style={[styles.saveHint, { color: C.textSecondary }]}>Changes are saved automatically.</Text>
      </>
    );
  }

  // ── Section: Support ──────────────────────────────────────────

  function renderSupport() {
    return (
      <>
        <SectionHeader title="Get Help" />
        <Card>
          <NavRow icon="❓" label="Help Center"       onPress={() => setSubPage('help-center')} />
          <NavRow icon="💌" label="Contact Support"   onPress={() => setSubPage('contact-support')} />
          <NavRow icon="🚨" label="Report Issue"      onPress={() => setSubPage('report-issue')} />
          <NavRow icon="📖" label="FAQs"              onPress={() => setSubPage('faqs')} isLast />
        </Card>
        <HintCard>
          <Text style={[styles.hintText, { color: C.brinjal1 }]}>Average response time: under 24 hours on business days.</Text>
        </HintCard>
      </>
    );
  }

  // ── Section: App Settings ─────────────────────────────────────

  function renderAppSettings() {
    return (
      <>
        <SectionHeader title="Appearance" />
        <Card>
          <SwitchRow icon="🌙" label="Dark Mode" sub="Switch between light and dark theme" value={isDark} onChange={toggleDark} isLast />
        </Card>

        <SectionHeader title="About" />
        <Card>
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>ℹ️</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>App Version</Text>
            <Text style={[styles.navValue, { color: C.textSecondary }]}>1.0.0</Text>
          </View>
          <NavRow icon="👥" label="Team Members" badge="V1.1" onPress={() => showToast('Team management coming in V1.1')} isLast />
        </Card>
      </>
    );
  }

  // ── Main Settings ─────────────────────────────────────────────

  function renderMainSettings() {
    return (
      <>
        <SectionHeader title="Account" />
        <Card>
          <View style={[styles.accountCard, { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <View style={[styles.accountAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={styles.accountAvatarText}>{(user?.name ?? 'B')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: C.text }]}>{user?.name ?? 'Business'}</Text>
              <Text style={[styles.accountEmail, { color: C.textSecondary }]}>{user?.email ?? 'business@example.com'}</Text>
            </View>
            <Pressable style={[styles.editBtn, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(business)/settings?section=profile' as Parameters<typeof router.push>[0])}>
              <Text style={[styles.editBtnText, { color: C.brinjal1 }]}>Edit</Text>
            </Pressable>
          </View>
          <NavRow icon="🏢" label="Business Profile"    onPress={() => router.push('/(business)/settings?section=profile' as Parameters<typeof router.push>[0])} />
          <NavRow icon="✅" label="Verification"         onPress={() => router.push('/(business)/settings?section=verification' as Parameters<typeof router.push>[0])} />
          <NavRow icon="🗑️" label="Delete Account"      onPress={handleDeleteAccount} danger isLast />
        </Card>

        <SectionHeader title="Preferences" />
        <Card>
          <NavRow icon="🔔" label="Notifications"        onPress={() => router.push('/(business)/settings?section=notifications' as Parameters<typeof router.push>[0])} />
          <NavRow icon="💳" label="Payment Settings"     onPress={() => router.push('/(business)/settings?section=payment' as Parameters<typeof router.push>[0])} />
          <NavRow icon="🎯" label="Campaign Preferences" onPress={() => router.push('/(business)/settings?section=campaigns' as Parameters<typeof router.push>[0])} />
          <NavRow icon="🔖" label="Saved Creators"       onPress={() => router.push('/(business)/settings?section=saved' as Parameters<typeof router.push>[0])} />
          <NavRow icon="🔒" label="Privacy Settings"     onPress={() => router.push('/(business)/settings?section=privacy' as Parameters<typeof router.push>[0])} />
          <NavRow icon="🛡️" label="Account & Security"  onPress={() => router.push('/(business)/settings?section=account' as Parameters<typeof router.push>[0])} isLast />
        </Card>

        <SectionHeader title="App" />
        <Card>
          <SwitchRow icon="🌙" label="Dark Mode" value={isDark} onChange={toggleDark} />
          <View style={[styles.row, { borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={styles.rowIcon}>ℹ️</Text>
            <Text style={[styles.rowLabel, { color: C.text }]}>App Version</Text>
            <Text style={[styles.navValue, { color: C.textSecondary }]}>1.0.0</Text>
          </View>
          <NavRow icon="👥" label="Team Members" badge="V1.1" onPress={() => showToast('Team management coming in V1.1')} isLast />
        </Card>

        <SectionHeader title="Help" />
        <Card>
          <NavRow icon="❓" label="Support" onPress={() => router.push('/(business)/settings?section=support' as Parameters<typeof router.push>[0])} isLast />
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


      </SafeAreaView>
    </ColorCtx.Provider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, lineHeight: 30 },
  topTitle: { fontSize: 16, fontWeight: '700' },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginTop: 20, marginBottom: 6, marginHorizontal: 20,
  },
  card: {
    marginHorizontal: 16, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden',
  },
  hintCard: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  hintText: { fontSize: 13, lineHeight: 18 },
  saveHint: { textAlign: 'center', fontSize: 12, marginTop: 8, marginHorizontal: 16 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowIconNode: { width: 24, alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 1 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navArrow: { fontSize: 18 },
  navValue: { fontSize: 14 },

  chipSection: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13 },

  logoPicker: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', height: 100, justifyContent: 'center', alignItems: 'center', gap: 4 },
  logoPickerEmoji: { fontSize: 28 },
  logoPickerText: { fontSize: 13, fontWeight: '700' },
  logoPickerSub: { fontSize: 11 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionalTag: { fontSize: 12 },

  socialInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, height: 46, gap: 8 },
  socialInputIcon: { fontSize: 16 },
  socialInput: { flex: 1, fontSize: 14 },

  actionGroup: { marginHorizontal: 16, marginTop: 20, gap: 10 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },

  inlineForm: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 14 },
  formField: { gap: 5 },
  formFieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  formTextarea: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, minHeight: 110 },
  fieldError: { fontSize: 12, fontWeight: '500' },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12 },
  pwInput: { flex: 1, fontSize: 14, paddingVertical: 11 },
  eyeBtn: { padding: 6 },

  paymentIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  paymentEmoji: { fontSize: 20 },
  checkboxOuter: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '800' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 11, height: 11, borderRadius: 6 },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  txDesc: { fontSize: 14, fontWeight: '600' },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },

  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  accountAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  accountName: { fontSize: 16, fontWeight: '700' },
  accountEmail: { fontSize: 13, marginTop: 2 },
  editBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontSize: 13, fontWeight: '700' },

  soonBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  verifiedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  uploadBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },

  creatorCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  creatorCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  creatorAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  creatorAvatarText: { fontSize: 16, fontWeight: '800' },
  creatorName: { fontSize: 14, fontWeight: '700' },
  creatorMeta: { fontSize: 12, marginTop: 2 },
  categoryPill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  categoryPillText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  removeBtnText: { fontSize: 12, fontWeight: '700' },
  noteBubble: { marginTop: 10, borderRadius: 8, padding: 10 },
  noteText: { fontSize: 13 },
  addNoteBtn: { paddingTop: 10 },
  addNoteText: { fontSize: 13, fontWeight: '600' },
  noteEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderRadius: 8, padding: 8 },
  noteInput: { flex: 1, fontSize: 13, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  noteSaveBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  noteSaveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  noteCancelText: { fontSize: 16, paddingHorizontal: 4 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubText: { fontSize: 13 },

  faqCard: { borderRadius: 12, padding: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  faqQ: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  faqA: { fontSize: 13, lineHeight: 19 },

  toast: {
    position: 'absolute', bottom: 32, left: 32, right: 32,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
});
