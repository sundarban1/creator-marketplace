import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { creatorService, type ApiCreatorPublicProfile } from '@/services/creator';
import { chatService } from '@/services/chat';
import { F } from '@/utilities/constants';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import type { ApiCategory } from '@/services/category';

// ─── Constants ────────────────────────────────────────────────────────────────

type PlatformInfo = { iconName: string; color: string; label: string; brand: boolean };

const PLATFORM_MAP: Record<string, PlatformInfo> = {
  instagram: { iconName: 'instagram',   color: '#E1306C', label: 'Instagram',   brand: true },
  tiktok:    { iconName: 'tiktok',      color: '#010101', label: 'TikTok',      brand: true },
  youtube:   { iconName: 'youtube',     color: '#FF0000', label: 'YouTube',     brand: true },
  facebook:  { iconName: 'facebook',    color: '#1877F2', label: 'Facebook',    brand: true },
  twitter:   { iconName: 'twitter',     color: '#1DA1F2', label: 'X / Twitter', brand: true },
  linkedin:  { iconName: 'linkedin',    color: '#0A66C2', label: 'LinkedIn',    brand: true },
  pinterest: { iconName: 'pinterest',   color: '#E60023', label: 'Pinterest',   brand: true },
  snapchat:  { iconName: 'snapchat',    color: '#FFFC00', label: 'Snapchat',    brand: true },
  twitch:    { iconName: 'twitch',      color: '#9146FF', label: 'Twitch',      brand: true },
};

function getPlatformInfo(platform: string): PlatformInfo {
  return PLATFORM_MAP[platform.toLowerCase()] ?? {
    iconName: 'globe',
    color: '#6366F1',
    label: platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase(),
    brand: false,
  };
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function getAvatarBg(allCategories: ApiCategory[], categories: string[]) {
  for (const c of categories) {
    const match = allCategories.find((cat) => cat.name === c);
    if (match) return match.iconBg;
  }
  return '#E8EAF6';
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionTitle({ label, color }: { label: string; color: string }) {
  return <Text style={[s.sectionTitle, { color }]}>{label}</Text>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useAppColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();

  const [profile, setProfile]     = useState<ApiCreatorPublicProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Message request state
  const [convId, setConvId]       = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const keyboardOffset = useKeyboardOffset();
  const [requestMsg, setRequestMsg] = useState('');
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    if (!id) return;
    setProfile(null);
    setError('');
    setConvId(null);
    setConvStatus(null);
    setShowModal(false);
    setRequestMsg('');
    setLoading(true);

    creatorService.getCreatorPublicProfile(id)
      .then((prof) => {
        setProfile(prof);
        return chatService.checkConversation(id).then((conv) => {
          if (conv) { setConvId(conv.id); setConvStatus(conv.status); }
        }).catch(() => {});
      })
      .catch((e) => setError(e instanceof Error ? e.message : t('creatorDetailExtra.notFound')))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSendRequest() {
    if (!profile) return;
    setSending(true);
    try {
      const conv = await chatService.sendMessageRequest(profile.userId, requestMsg.trim() || undefined);
      setConvId(conv.id);
      setConvStatus('PENDING');
      setShowModal(false);
      setRequestMsg('');
    } finally {
      setSending(false);
    }
  }

  function openChat() {
    if (!convId || !profile) return;
    router.push({
      pathname: '/(business)/messages/[id]',
      params: { id: convId, name: profile.fullName ?? profile.username ?? 'Creator', status: convStatus ?? 'ACCEPTED' },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={s.topBar}>
          <BackButton fallback="/(business)/explore-creators" />
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={s.topBar}>
          <BackButton fallback="/(business)/explore-creators" />
        </View>
        <View style={s.centered}>
          <FontAwesome5 name="user-slash" size={40} color={C.textSecondary} style={s.errorEmoji} />
          <Text style={[s.errorTitle, { color: C.text }]}>{t('creatorDetailExtra.notFound')}</Text>
          <Text style={[s.errorHint, { color: C.textSecondary }]}>{error || t('creatorDetailExtra.notFoundSub')}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => router.back()} style={[s.retryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[s.retryText, { color: C.brinjal1 }]}>{t('creatorDetailExtra.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (profile.fullName ?? 'C').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarBg = getAvatarBg(allCategories, profile.categories);
  const hasBudget = profile.prefBudgetMin > 0 || profile.prefBudgetMax > 0;
  const portfolioLinks = (profile.portfolioLinks ?? []) as { id: string; label: string; url: string }[];

  // Merge socialLinks (JSON handles) + socialAccounts (structured with followers)
  const socialLinksMap = (profile.socialLinks ?? {}) as Record<string, string | null>;
  type MergedPlatform = { key: string; platform: string; handle: string | null; followers: number | null; profileUrl: string | null; verified: boolean };
  const mergedPlatforms: MergedPlatform[] = [];
  const coveredPlatforms = new Set<string>();

  // First: structured social accounts (have followers)
  for (const acc of profile.socialAccounts) {
    mergedPlatforms.push({ key: acc.id, platform: acc.platform, handle: null, followers: acc.followers, profileUrl: acc.profileUrl, verified: acc.connectedViaOAuth });
    coveredPlatforms.add(acc.platform.toLowerCase());
  }
  // Then: socialLinks entries not already covered
  for (const [platform, handle] of Object.entries(socialLinksMap)) {
    if (handle && !coveredPlatforms.has(platform.toLowerCase())) {
      mergedPlatforms.push({ key: platform, platform, handle, followers: null, profileUrl: null, verified: false });
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <BackButton fallback="/(business)/explore-creators" />
        <Text style={[s.topTitle, { color: C.text }]}>{t('creatorDetailExtra.topTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ── */}
        <View style={[s.hero, { backgroundColor: C.surface }]}>
          <View style={[s.avatarCircle, { backgroundColor: avatarBg }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>

          <View style={s.heroInfo}>
            <View style={s.nameRow}>
              <Text style={[s.heroName, { color: C.text }]}>{profile.fullName ?? 'Creator'}</Text>
              {profile.isVerified && (
                <View style={[s.verifiedBadge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={s.verifiedText}>{t('creatorDetailExtra.verified')}</Text>
                </View>
              )}
            </View>
            {profile.username ? (
              <Text style={[s.username, { color: C.textSecondary }]}>@{profile.username}</Text>
            ) : null}
            {profile.location ? (
              <View style={s.locationRow}>
                <Ionicons name="location" size={11} color={C.textSecondary} />
                <Text style={[s.location, { color: C.textSecondary }]}>{profile.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Stats ── */}
        {profile.stats && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionStats')} color={C.textSecondary} />
            <View style={s.statsGrid}>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>{profile.stats.profileCompletion}%</Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.profileCompletion')}</Text>
              </View>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <Ionicons name="star-outline" size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>
                  {profile.stats.averageRating.toFixed(1)}
                </Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.averageRating')}</Text>
              </View>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <Ionicons name="time-outline" size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>
                  {profile.stats.responseTimeAvgMins} min
                </Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.responseTime')}</Text>
              </View>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <Ionicons name="trending-up-outline" size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>{profile.stats.completionRate}%</Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.completionRate')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Bio ── */}
        {profile.bio ? (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionAbout')} color={C.textSecondary} />
            <Text style={[s.bioText, { color: C.text }]}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Categories ── */}
        {profile.categories.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionCategories')} color={C.textSecondary} />
            <View style={s.chips}>
              {profile.categories.map((cat) => {
                const meta = getCategoryMeta(allCategories, cat);
                return (
                  <View key={cat} style={[s.catChip, { backgroundColor: C.primaryLight }]}>
                    <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                    <Text style={[s.catChipText, { color: C.brinjal1 }]}>{cat}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Social Platforms ── */}
        {mergedPlatforms.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionPlatforms')} color={C.textSecondary} />
            <View style={s.socialList}>
              {mergedPlatforms.map((p) => {
                const canOpen = !!p.profileUrl;
                const info = getPlatformInfo(p.platform);
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={p.key}
                    style={[s.socialRow, { borderColor: C.border }]}
                    onPress={() => canOpen ? Linking.openURL(p.profileUrl!).catch(() => {}) : null}>
                    <View style={[s.socialIconWrap, { backgroundColor: info.color }]}>
                      <FontAwesome5 name={info.iconName} size={18} color="#fff" />
                    </View>
                    <View style={s.socialInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[s.socialPlatform, { color: C.text }]}>{info.label}</Text>
                        {p.verified && <Ionicons name="checkmark-circle" size={13} color="#16A34A" />}
                      </View>
                      {p.followers !== null ? (
                        <Text style={[s.socialSub, { color: C.textSecondary }]}>{formatFollowers(p.followers)} {t('creatorDetailExtra.followersSuffix')}</Text>
                      ) : p.handle ? (
                        <Text style={[s.socialSub, { color: C.textSecondary }]}>{p.handle}</Text>
                      ) : null}
                    </View>
                    {canOpen && <Ionicons name="open-outline" size={16} color={C.brinjal1} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Rate / Budget ── */}
        {hasBudget && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionRatePreference')} color={C.textSecondary} />
            <View style={[s.budgetCard, { backgroundColor: C.primaryLight }]}>
              <FontAwesome5 name="wallet" size={22} color={getIconColor('wallet')} />
              <View style={s.budgetInfo}>
                <Text style={[s.budgetLabel, { color: C.textSecondary }]}>{t('creatorDetailExtra.preferredRange')}</Text>
                <Text style={[s.budgetValue, { color: C.brinjal1 }]}>
                  Rs. {profile.prefBudgetMin} – Rs. {profile.prefBudgetMax}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Preferred Platforms ── */}
        {profile.prefPlatforms.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionPreferredPlatforms')} color={C.textSecondary} />
            <View style={s.chips}>
              {profile.prefPlatforms.map((p) => {
                const info = getPlatformInfo(p);
                return (
                  <View key={p} style={[s.platChip, { backgroundColor: C.background, borderColor: C.border }]}>
                    <FontAwesome5 name={info.iconName} size={14} color={info.color} />
                    <Text style={[s.catChipText, { color: C.text }]}>{info.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Portfolio ── */}
        {portfolioLinks.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionPortfolio')} color={C.textSecondary} />
            <View style={s.portfolioList}>
              {portfolioLinks.map((link) => (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={link.id}
                  style={[s.portfolioRow, { borderColor: C.border }]}
                  onPress={() => Linking.openURL(link.url).catch(() => {})}>
                  <View style={[s.portfolioIconWrap, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name="link" size={16} color={C.brinjal1} />
                  </View>
                  <Text style={[s.portfolioLabel, { color: C.text }]} numberOfLines={1}>{link.label}</Text>
                  <Ionicons name="open-outline" size={15} color={C.brinjal1} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sticky action bar */}
      <View style={[msgBtn.bar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: Math.max(14, insets.bottom) }]}>
        {convStatus === 'ACCEPTED' ? (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[msgBtn.btn, { backgroundColor: C.brinjal1 }]} onPress={openChat}>
            <FontAwesome5 name="comment-dots" size={16} color="#fff" solid />
            <Text style={msgBtn.txt}>{t('creatorDetailExtra.openChat')}</Text>
          </Pressable>
        ) : convStatus === 'PENDING' ? (
          <View style={[msgBtn.btn, { backgroundColor: C.border }]}>
            <Text style={[msgBtn.txt, { color: '#fff' }]}>{t('creatorDetailExtra.requestSent')}</Text>
          </View>
        ) : (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[msgBtn.btn, { backgroundColor: C.brinjal1 }]} onPress={() => setShowModal(true)}>
            <Text style={msgBtn.txt}>{t('creatorDetailExtra.sendMessage')}</Text>
          </Pressable>
        )}
      </View>

      {/* Request message modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={rm.overlay}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={rm.scrim} onPress={() => setShowModal(false)} />
          <Animated.View style={[rm.sheet, { backgroundColor: C.surface, transform: [{ translateY: keyboardOffset }] }]}>
            <View style={[rm.handle, { backgroundColor: C.border }]} />
            <View style={rm.titleRow}>
              <Text style={[rm.title, { color: C.text }]}>{t('creatorDetailExtra.messageRequestTitle')}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[rm.closeBtn, { backgroundColor: C.background }]} onPress={() => setShowModal(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={C.textSecondary} />
              </Pressable>
            </View>
            <Text style={[rm.subtitle, { color: C.textSecondary }]}>
              {t('creatorDetailExtra.messageRequestSubtitle', { name: profile?.fullName ?? '' })}
            </Text>
            <TextInput
              style={[rm.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={requestMsg}
              onChangeText={setRequestMsg}
              placeholder={t('creatorDetailExtra.messageRequestPlaceholder', { firstName: profile?.fullName?.split(' ')[0] ?? 'there' })}
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={500}
            />
            <Text style={[rm.counter, { color: C.textSecondary }]}>{requestMsg.length}/500</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[rm.sendBtn, { backgroundColor: sending ? C.border : C.brinjal1 }]}
              onPress={handleSendRequest}
              disabled={sending}>
              <Text style={rm.sendTxt}>{sending ? t('creatorDetailExtra.sendingLabel') : t('creatorDetailExtra.sendRequestBtn')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },

  topBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  topTitle:  { flex: 1, fontSize: 17, textAlign: 'center', fontFamily: F.bold },

  scroll: { paddingBottom: 16, gap: 12 },

  // Hero
  hero:         { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 24, marginHorizontal: 20, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 26, fontFamily: F.bold },
  heroInfo:     { flex: 1, gap: 4 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroName:     { fontSize: 20, fontFamily: F.bold },
  verifiedBadge:{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, color: '#2E7D32', fontFamily: F.bold },
  username:     { fontSize: 13, fontFamily: F.regular },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location:     { fontSize: 13, fontFamily: F.regular },

  // Sections
  section:      { marginHorizontal: 20, borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  sectionTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, fontFamily: F.bold },

  // Bio
  bioText: { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  // Chips
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  catChipText: { fontSize: 13, fontFamily: F.semibold },
  platChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5 },

  // Social accounts
  socialList:      { gap: 10 },
  socialRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  socialIconWrap:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialInfo:      { flex: 1 },
  socialPlatform:  { fontSize: 14, fontFamily: F.bold },
  socialSub:       { fontSize: 12, marginTop: 1, fontFamily: F.regular },
  socialLink:      { fontSize: 18, fontFamily: F.semibold },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile:   { width: '47%', borderRadius: 12, padding: 12, gap: 4, alignItems: 'flex-start' },
  statValue:  { fontSize: 16, fontFamily: F.bold },
  statLabel:  { fontSize: 11, fontFamily: F.medium },

  // Budget
  budgetCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12 },
  budgetInfo:  { flex: 1 },
  budgetLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, fontFamily: F.semibold },
  budgetValue: { fontSize: 16, marginTop: 2, fontFamily: F.bold },

  // Portfolio
  portfolioList:    { gap: 10 },
  portfolioRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  portfolioIconWrap:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  portfolioLabel:   { flex: 1, fontSize: 14, fontFamily: F.semibold },

  // Error state
  errorEmoji: { marginBottom: 4 },
  errorTitle: { fontSize: 18, fontFamily: F.bold },
  errorHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  retryBtn:   { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:  { fontSize: 14, fontFamily: F.bold },
});

// Message button bar
const msgBtn = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  btn: { borderRadius: 14, height: 52, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  txt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});

// Request modal
const rm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim:   { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 14 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:    { fontSize: 18, fontFamily: F.bold, flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  subtitle:{ fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  input:   { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', fontFamily: F.regular },
  counter: { fontSize: 11, textAlign: 'right', marginTop: -6, fontFamily: F.regular },
  sendBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  sendTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
