import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { creatorService, type ApiCreatorPublicProfile } from '@/services/creator';
import { chatService } from '@/services/chat';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', youtube: '▶️', tiktok: '🎵',
  twitter: '🐦', facebook: '📘', linkedin: '💼',
  snapchat: '👻', pinterest: '📌',
};

const CATEGORY_META: Record<string, { emoji: string; bg: string }> = {
  Fashion:    { emoji: '👗', bg: '#F2DCF0' },
  Food:       { emoji: '🍽️', bg: '#F2E6DC' },
  Tech:       { emoji: '💻', bg: '#DCE6F2' },
  Technology: { emoji: '💻', bg: '#DCE6F2' },
  Beauty:     { emoji: '✨', bg: '#DCF2E6' },
  Travel:     { emoji: '✈️', bg: '#F2F2DC' },
  Fitness:    { emoji: '💪', bg: '#DCF2EE' },
  Lifestyle:  { emoji: '🌿', bg: '#E6F2DC' },
  Gaming:     { emoji: '🎮', bg: '#E6DCF2' },
  Music:      { emoji: '🎵', bg: '#F2DCE6' },
  Education:  { emoji: '📚', bg: '#FDEFD0' },
  Sports:     { emoji: '⚽', bg: '#E8F4DC' },
  Wellness:   { emoji: '🧘', bg: '#DCF2EE' },
  Adventure:  { emoji: '🏕️', bg: '#E8EFD4' },
};

function getPlatformEmoji(p: string) { return PLATFORM_EMOJI[p.toLowerCase()] ?? '📱'; }
function normalizePlatform(p: string) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function getAvatarBg(categories: string[]) {
  for (const c of categories) {
    if (CATEGORY_META[c]) return CATEGORY_META[c].bg;
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

  const [profile, setProfile]     = useState<ApiCreatorPublicProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Message request state
  const [convId, setConvId]       = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      creatorService.getCreatorPublicProfile(id),
      chatService.checkConversation(id),
    ])
      .then(([prof, conv]) => {
        setProfile(prof);
        if (conv) { setConvId(conv.id); setConvStatus(conv.status); }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load creator'))
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
      params: { id: convId, name: profile.fullName, status: convStatus ?? 'ACCEPTED' },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={[s.backArrow, { color: C.text }]}>‹</Text>
          </Pressable>
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
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={[s.backArrow, { color: C.text }]}>‹</Text>
          </Pressable>
        </View>
        <View style={s.centered}>
          <Text style={s.errorEmoji}>😕</Text>
          <Text style={[s.errorTitle, { color: C.text }]}>Creator not found</Text>
          <Text style={[s.errorHint, { color: C.textSecondary }]}>{error || 'This creator profile is unavailable.'}</Text>
          <Pressable onPress={() => router.back()} style={[s.retryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[s.retryText, { color: C.brinjal1 }]}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (profile.fullName ?? 'C').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarBg = getAvatarBg(profile.categories);
  const hasBudget = profile.prefBudgetMin > 0 || profile.prefBudgetMax > 0;
  const portfolioLinks = (profile.portfolioLinks ?? []) as { id: string; label: string; url: string }[];

  // Merge socialLinks (JSON handles) + socialAccounts (structured with followers)
  const socialLinksMap = (profile.socialLinks ?? {}) as Record<string, string | null>;
  type MergedPlatform = { key: string; platform: string; handle: string | null; followers: number | null; profileUrl: string | null };
  const mergedPlatforms: MergedPlatform[] = [];
  const coveredPlatforms = new Set<string>();

  // First: structured social accounts (have followers)
  for (const acc of profile.socialAccounts) {
    mergedPlatforms.push({ key: acc.id, platform: acc.platform, handle: null, followers: acc.followers, profileUrl: acc.profileUrl });
    coveredPlatforms.add(acc.platform.toLowerCase());
  }
  // Then: socialLinks entries not already covered
  for (const [platform, handle] of Object.entries(socialLinksMap)) {
    if (handle && !coveredPlatforms.has(platform.toLowerCase())) {
      mergedPlatforms.push({ key: platform, platform, handle, followers: null, profileUrl: null });
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backArrow, { color: C.text }]}>‹</Text>
        </Pressable>
        <Text style={[s.topTitle, { color: C.text }]}>Creator Profile</Text>
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
                  <Text style={s.verifiedText}>✓ Verified</Text>
                </View>
              )}
            </View>
            {profile.username ? (
              <Text style={[s.username, { color: C.textSecondary }]}>@{profile.username}</Text>
            ) : null}
            {profile.location ? (
              <Text style={[s.location, { color: C.textSecondary }]}>📍 {profile.location}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Bio ── */}
        {profile.bio ? (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label="About" color={C.textSecondary} />
            <Text style={[s.bioText, { color: C.text }]}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Categories ── */}
        {profile.categories.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label="Content Categories" color={C.textSecondary} />
            <View style={s.chips}>
              {profile.categories.map((cat) => {
                const meta = CATEGORY_META[cat];
                return (
                  <View key={cat} style={[s.catChip, { backgroundColor: C.primaryLight }]}>
                    {meta && <Text style={s.catEmoji}>{meta.emoji}</Text>}
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
            <SectionTitle label="Social Platforms" color={C.textSecondary} />
            <View style={s.socialList}>
              {mergedPlatforms.map((p) => {
                const canOpen = !!p.profileUrl;
                return (
                  <Pressable
                    key={p.key}
                    style={[s.socialRow, { borderColor: C.border }]}
                    onPress={() => canOpen ? Linking.openURL(p.profileUrl!).catch(() => {}) : null}>
                    <View style={[s.socialIconWrap, { backgroundColor: C.primaryLight }]}>
                      <Text style={s.socialEmoji}>{getPlatformEmoji(p.platform)}</Text>
                    </View>
                    <View style={s.socialInfo}>
                      <Text style={[s.socialPlatform, { color: C.text }]}>{normalizePlatform(p.platform)}</Text>
                      {p.followers !== null ? (
                        <Text style={[s.socialSub, { color: C.textSecondary }]}>{formatFollowers(p.followers)} followers</Text>
                      ) : p.handle ? (
                        <Text style={[s.socialSub, { color: C.textSecondary }]}>{p.handle}</Text>
                      ) : null}
                    </View>
                    {canOpen && <Text style={[s.socialLink, { color: C.brinjal1 }]}>↗</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Rate / Budget ── */}
        {hasBudget && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label="Rate Preference" color={C.textSecondary} />
            <View style={[s.budgetCard, { backgroundColor: C.primaryLight }]}>
              <Text style={s.budgetEmoji}>💰</Text>
              <View style={s.budgetInfo}>
                <Text style={[s.budgetLabel, { color: C.textSecondary }]}>Preferred range</Text>
                <Text style={[s.budgetValue, { color: C.brinjal1 }]}>
                  ${profile.prefBudgetMin} – ${profile.prefBudgetMax}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Preferred Platforms ── */}
        {profile.prefPlatforms.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label="Preferred Platforms" color={C.textSecondary} />
            <View style={s.chips}>
              {profile.prefPlatforms.map((p) => (
                <View key={p} style={[s.platChip, { backgroundColor: C.background, borderColor: C.border }]}>
                  <Text style={s.catEmoji}>{getPlatformEmoji(p)}</Text>
                  <Text style={[s.catChipText, { color: C.text }]}>{normalizePlatform(p)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Portfolio ── */}
        {portfolioLinks.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label="Portfolio" color={C.textSecondary} />
            <View style={s.portfolioList}>
              {portfolioLinks.map((link) => (
                <Pressable
                  key={link.id}
                  style={[s.portfolioRow, { borderColor: C.border }]}
                  onPress={() => Linking.openURL(link.url).catch(() => {})}>
                  <View style={[s.portfolioIconWrap, { backgroundColor: C.primaryLight }]}>
                    <Text style={s.portfolioIcon}>🔗</Text>
                  </View>
                  <Text style={[s.portfolioLabel, { color: C.text }]} numberOfLines={1}>{link.label}</Text>
                  <Text style={[s.portfolioArrow, { color: C.brinjal1 }]}>↗</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sticky message button */}
      <View style={[msgBtn.bar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        {convStatus === 'ACCEPTED' ? (
          <Pressable style={[msgBtn.btn, { backgroundColor: C.brinjal1 }]} onPress={openChat}>
            <Text style={msgBtn.txt}>💬  Open Chat</Text>
          </Pressable>
        ) : convStatus === 'PENDING' ? (
          <View style={[msgBtn.btn, { backgroundColor: C.border }]}>
            <Text style={[msgBtn.txt, { color: '#fff' }]}>⏳  Request Sent</Text>
          </View>
        ) : (
          <Pressable style={[msgBtn.btn, { backgroundColor: C.brinjal1 }]} onPress={() => setShowModal(true)}>
            <Text style={msgBtn.txt}>✉️  Send Message</Text>
          </Pressable>
        )}
      </View>

      {/* Request message modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={rm.overlay}>
          <Pressable style={rm.scrim} onPress={() => setShowModal(false)} />
          <View style={[rm.sheet, { backgroundColor: C.surface }]}>
            <View style={[rm.handle, { backgroundColor: C.border }]} />
            <Text style={[rm.title, { color: C.text }]}>Send Message Request</Text>
            <Text style={[rm.subtitle, { color: C.textSecondary }]}>
              Write an optional message to introduce yourself. {profile?.fullName} will see this when deciding to accept.
            </Text>
            <TextInput
              style={[rm.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={requestMsg}
              onChangeText={setRequestMsg}
              placeholder={`Hi ${profile?.fullName?.split(' ')[0] ?? 'there'}, I'd love to collaborate…`}
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={500}
            />
            <Text style={[rm.counter, { color: C.textSecondary }]}>{requestMsg.length}/500</Text>
            <Pressable
              style={[rm.sendBtn, { backgroundColor: sending ? C.border : C.brinjal1 }]}
              onPress={handleSendRequest}
              disabled={sending}>
              <Text style={rm.sendTxt}>{sending ? 'Sending…' : 'Send Request'}</Text>
            </Pressable>
          </View>
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
  backBtn:   { width: 40, padding: 4 },
  backArrow: { fontSize: 32, lineHeight: 36, fontWeight: '300' },
  topTitle:  { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },

  scroll: { paddingBottom: 16, gap: 12 },

  // Hero
  hero:         { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 24, marginHorizontal: 20, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 26, fontWeight: '800' },
  heroInfo:     { flex: 1, gap: 4 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroName:     { fontSize: 20, fontWeight: '800' },
  verifiedBadge:{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  username:     { fontSize: 13 },
  location:     { fontSize: 13 },

  // Sections
  section:      { marginHorizontal: 20, borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Bio
  bioText: { fontSize: 14, lineHeight: 22 },

  // Chips
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  catEmoji:    { fontSize: 14 },
  catChipText: { fontSize: 13, fontWeight: '600' },
  platChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },

  // Social accounts
  socialList:      { gap: 10 },
  socialRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  socialIconWrap:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialEmoji:     { fontSize: 18 },
  socialInfo:      { flex: 1 },
  socialPlatform:  { fontSize: 14, fontWeight: '700' },
  socialSub:       { fontSize: 12, marginTop: 1 },
  socialLink:      { fontSize: 18, fontWeight: '600' },

  // Budget
  budgetCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12 },
  budgetEmoji: { fontSize: 24 },
  budgetInfo:  { flex: 1 },
  budgetLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  budgetValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },

  // Portfolio
  portfolioList:    { gap: 10 },
  portfolioRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  portfolioIconWrap:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  portfolioIcon:    { fontSize: 16 },
  portfolioLabel:   { flex: 1, fontSize: 14, fontWeight: '600' },
  portfolioArrow:   { fontSize: 18, fontWeight: '600' },

  // Error state
  errorEmoji: { fontSize: 48 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  errorHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:   { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:  { fontSize: 14, fontWeight: '700' },
});

// Message button bar
const msgBtn = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  btn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  txt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// Request modal
const rm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 14 },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  title:   { fontSize: 18, fontWeight: '800' },
  subtitle:{ fontSize: 13, lineHeight: 20 },
  input:   { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  counter: { fontSize: 11, textAlign: 'right', marginTop: -6 },
  sendBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  sendTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
