import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ProviderTypeBadge } from '@/components/ProviderTypeBadge';
import { ReviewsList } from '@/components/ReviewsList';
import { ReportModal } from '@/components/ReportModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorPublicProfile, type ApiPublicService } from '@/services/creator';
import type { ApiPortfolioItem } from '@/services/portfolio';
import { chatService } from '@/services/chat';
import { serviceRequestService } from '@/services/serviceRequest';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
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

// Mirrors toLabelKey in (creator)/service-form.tsx — kept local since that
// helper isn't exported.
const PRICING_LABEL_KEY: Record<ApiPublicService['pricingModel'], string> = {
  PER_PROJECT: 'PerProject', PER_HOUR: 'PerHour', PER_DAY: 'PerDay', PER_CAMPAIGN: 'PerCampaign', CUSTOM_QUOTE: 'CustomQuote',
};

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
  const [requestMsg, setRequestMsg] = useState('');
  const [sending, setSending]     = useState(false);

  // Service request state (§33/34) — distinct from the message-request flow
  // above; requestingService is which service the sheet is open for (null = closed).
  const [requestingService, setRequestingService] = useState<ApiPublicService | null>(null);
  const [serviceReqMessage, setServiceReqMessage] = useState('');
  const [serviceReqBudget, setServiceReqBudget]   = useState('');
  const [sendingServiceReq, setSendingServiceReq] = useState(false);
  const [serviceReqError, setServiceReqError]     = useState('');
  const [sentServiceReqIds, setSentServiceReqIds] = useState<Set<string>>(new Set());
  const [showReportModal, setShowReportModal] = useState(false);

  // Portfolio media the viewer tapped — opened in the same full-screen preview
  // chrome the deliverables sheets use (image vs. video picked by mediaType).
  const [previewItem, setPreviewItem] = useState<ApiPortfolioItem | null>(null);

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

  function openRequestModal() {
    if (!requestMsg.trim()) {
      const firstName = profile?.fullName?.split(' ')[0] ?? 'there';
      setRequestMsg(t('creatorDetailExtra.messageRequestDefault', { firstName }));
    }
    setShowModal(true);
  }

  function openServiceRequestModal(service: ApiPublicService) {
    setServiceReqMessage('');
    setServiceReqBudget('');
    setServiceReqError('');
    setRequestingService(service);
  }

  async function handleSendServiceRequest() {
    if (!requestingService || serviceReqMessage.trim().length < 10) return;
    setSendingServiceReq(true);
    setServiceReqError('');
    try {
      await serviceRequestService.create(
        requestingService.id,
        serviceReqMessage.trim(),
        serviceReqBudget.trim() ? Number(serviceReqBudget) : undefined
      );
      setSentServiceReqIds((prev) => new Set(prev).add(requestingService.id));
      setRequestingService(null);
    } catch (e) {
      setServiceReqError(e instanceof Error ? e.message : t('creatorDetailExtra.serviceRequestFailed'));
    } finally {
      setSendingServiceReq(false);
    }
  }

  function openChat() {
    if (!convId || !profile) return;
    // Outer-stack chat route (sibling of this screen), not the Messages tab's
    // nested one — this screen itself is reached from outside the tabs stack
    // (e.g. tapping an avatar inside a chat conversation), so pushing back
    // into the tabs-nested route here would leave a broken back stack (same
    // reasoning as activity-timeline.tsx's identical openChat pattern).
    router.push({
      pathname: '/(business)/chat/[id]',
      params: { id: convId, name: profile.fullName ?? profile.username ?? 'Creator', avatar: profile.avatarUrl ?? '', status: convStatus ?? 'ACCEPTED', participantId: profile.id },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={{ backgroundColor: C.surface }}>
          <View style={s.topBar}>
            <BackButton fallback="/(business)/explore-creators" />
          </View>
          <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
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
        <View style={{ backgroundColor: C.surface }}>
          <View style={s.topBar}>
            <BackButton fallback="/(business)/explore-creators" />
          </View>
          <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
        </View>
        <View style={s.centered}>
          <FontAwesome5 name="user-slash" size={40} color={C.textSecondary} style={s.errorEmoji} />
          <Text style={[s.errorTitle, { color: C.text }]}>{t('creatorDetailExtra.notFound')}</Text>
          <Text style={[s.errorHint, { color: C.textSecondary }]}>{error || t('creatorDetailExtra.notFoundSub')}</Text>
          <Pressable onPress={() => router.back()} style={[s.retryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[s.retryText, { color: C.brinjal1 }]}>{t('creatorDetailExtra.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Creator has disabled showPublicProfile — the backend only sends
  // id/fullName/avatarUrl in that case, so bail before reading any other field.
  if (profile.isPrivate) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={{ backgroundColor: C.surface }}>
          <View style={s.topBar}>
            <BackButton fallback="/(business)/explore-creators" />
          </View>
          <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
        </View>
        <View style={s.centered}>
          <FontAwesome5 name="lock" solid size={40} color={C.textSecondary} style={s.errorEmoji} />
          <Text style={[s.errorTitle, { color: C.text }]}>{t('creatorDetailExtra.isPrivateTitle')}</Text>
          <Text style={[s.errorHint, { color: C.textSecondary }]}>{t('creatorDetailExtra.isPrivateSub')}</Text>
          <Pressable onPress={() => router.back()} style={[s.retryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[s.retryText, { color: C.brinjal1 }]}>{t('creatorDetailExtra.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (profile.fullName ?? 'C').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarBg = getAvatarBg(allCategories, profile.categories);
  const portfolioLinks = (profile.portfolioLinks ?? []) as { id: string; label: string; url: string }[];
  const portfolioItems = profile.portfolioItems ?? [];

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
      <MaxWidthContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero Cover ── */}
        <View style={s.cover}>
          <LinearGradient
            colors={['#7C3AED', '#EC4899', '#F97316']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}>
            <View style={[s.bubble, s.bubble1]} />
            <View style={[s.bubble, s.bubble2]} />
            <View style={[s.bubble, s.bubble3]} />
          </LinearGradient>

          <View style={s.coverTopBar}>
            <BackButton variant="overlay" fallback="/(business)/explore-creators" />
            <View style={s.coverTopTitleRow} />
            <Pressable
              style={s.topIconSpacer}
              onPress={() => setShowReportModal(true)}
              accessibilityRole="button"
              accessibilityLabel={t('reportModal.title')}>
              <FontAwesome5 name="flag" solid size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* ── Avatar card (overlaps cover) ── */}
        <View style={[s.profileCard, { backgroundColor: C.surface }]}>
          <View style={s.avatarArea}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                <Text style={s.avatarInitial}>{initials}</Text>
              </View>
            )}
          </View>

          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={2}>{profile.fullName ?? 'Creator'}</Text>
            {(profile.fullyVerified || profile.isVerified) && <VerifiedBadge size={16} />}
            <ProviderTypeBadge type={profile.providerType} teamSize={profile.teamSize} />
          </View>
          {profile.username ? (
            <Text style={[s.username, { color: C.textSecondary }]}>@{profile.username}</Text>
          ) : null}
          {profile.location ? (
            <View style={s.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={13} color={C.brinjal1} />
              <Text style={[s.location, { color: C.textSecondary }]}>{profile.location}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Bio ── */}
        {profile.bio ? (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionAbout')} color={C.textSecondary} />
            <Text style={[s.bioText, { color: C.text }]}>{profile.bio}</Text>
          </View>
        ) : null}

        {/* ── Stats ── */}
        {profile.stats && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionStats')} color={C.textSecondary} />
            <View style={s.statsGrid}>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <FontAwesome5 name="check-circle" solid size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>{profile.stats.profileCompletion}%</Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.profileCompletion')}</Text>
              </View>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <FontAwesome5 name="star" size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>
                  {profile.stats.averageRating.toFixed(1)}
                </Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.averageRating')}</Text>
              </View>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <FontAwesome5 name="clock" size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>
                  {profile.stats.responseTimeAvgMins} min
                </Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.responseTime')}</Text>
              </View>
              <View style={[s.statTile, { backgroundColor: C.background }]}>
                <FontAwesome5 name="chart-line" solid size={16} color={C.brinjal1} />
                <Text style={[s.statValue, { color: C.text }]}>{profile.stats.completionRate}%</Text>
                <Text style={[s.statLabel, { color: C.textSecondary }]}>{t('analytics.completionRate')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Services (§33/34) ── */}
        {!!profile.services?.length && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionServices')} color={C.textSecondary} />
            <View style={{ gap: 10 }}>
              {profile.services.map((svc) => {
                const requested = sentServiceReqIds.has(svc.id);
                return (
                  <View key={svc.id} style={[sv.card, { borderColor: C.border, backgroundColor: C.background }]}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[sv.catChip, { backgroundColor: `${svc.category.color}1A` }]}>
                          <FontAwesome5 name={svc.category.icon as any} solid size={10} color={svc.category.color} />
                        </View>
                        <Text style={[sv.name, { color: C.text }]} numberOfLines={1}>{svc.name}</Text>
                      </View>
                      <Text style={[sv.price, { color: C.textSecondary }]}>
                        {svc.startingPrice != null ? `Rs. ${svc.startingPrice.toLocaleString()}` : t('creatorDetailExtra.servicePriceNegotiable')}
                        {' · '}{t(`servicesScreen.pricing${PRICING_LABEL_KEY[svc.pricingModel]}`)}
                      </Text>
                    </View>
                    <Pressable
                      style={[sv.reqBtn, requested ? { backgroundColor: C.background, borderWidth: 1, borderColor: C.border } : { backgroundColor: C.brinjal1 }]}
                      disabled={requested}
                      onPress={() => openServiceRequestModal(svc)}>
                      <Text style={[sv.reqBtnTxt, { color: requested ? C.textSecondary : '#fff' }]}>
                        {requested ? t('creatorDetailExtra.serviceRequested') : t('creatorDetailExtra.serviceRequestBtn')}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Reviews (§60) — from businesses this provider has worked with ── */}
        {!!profile.reviews?.length && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionReviews')} color={C.textSecondary} />
            <ReviewsList reviews={profile.reviews} />
          </View>
        )}

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

        {/* ── Industries (agencies only, §6) ── */}
        {(profile.industries?.length ?? 0) > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionIndustries')} color={C.textSecondary} />
            <View style={s.chips}>
              {profile.industries.map((ind) => {
                const meta = getCategoryMeta(allCategories, ind);
                return (
                  <View key={ind} style={[s.catChip, { backgroundColor: C.primaryLight }]}>
                    <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                    <Text style={[s.catChipText, { color: C.brinjal1 }]}>{ind}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Service mode (§3 step 4) ── */}
        {profile.serviceMode ? (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('serviceMode.label')} color={C.textSecondary} />
            <View style={s.socialRow2}>
              <FontAwesome5
                name={profile.serviceMode === 'ONLINE' ? 'laptop' : profile.serviceMode === 'MY_LOCATION' ? 'store' : profile.serviceMode === 'HYBRID' ? 'random' : 'car-side'}
                solid size={14} color={C.brinjal1}
              />
              <Text style={[s.websiteText, { color: C.text }]}>{t(`serviceMode.${profile.serviceMode}`)}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Website (§5) ── */}
        {profile.website ? (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionWebsite')} color={C.textSecondary} />
            <Pressable
              style={s.socialRow2}
              onPress={() => Linking.openURL(profile.website!).catch(() => {})}
              accessibilityRole="link">
              <FontAwesome5 name="globe" solid size={14} color={C.brinjal1} />
              <Text style={[s.websiteText, { color: C.brinjal1 }]} numberOfLines={1}>{profile.website}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Social Platforms ── */}
        {mergedPlatforms.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionPlatforms')} color={C.textSecondary} />
            <View style={s.socialList}>
              {mergedPlatforms.map((p) => {
                const canOpen = !!p.profileUrl;
                const info = getPlatformInfo(p.platform);
                return (
                  <Pressable
                    key={p.key}
                    style={[s.socialRow, { borderColor: C.border }]}
                    onPress={() => canOpen ? Linking.openURL(p.profileUrl!).catch(() => {}) : null}>
                    <View
                      style={[
                        s.socialIconWrap,
                        {
                          backgroundColor: info.color,
                          ...Platform.select({ ios: { shadowColor: info.color, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } }),
                        },
                      ]}
                    >
                      <FontAwesome5 name={info.iconName} size={18} color="#fff" />
                    </View>
                    <View style={s.socialInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[s.socialPlatform, { color: C.text }]}>{info.label}</Text>
                        {p.verified && <FontAwesome5 name="check-circle" solid size={13} color="#16A34A" />}
                      </View>
                      {p.followers !== null ? (
                        <Text style={[s.socialSub, { color: C.textSecondary }]}>{formatFollowers(p.followers)} {t('creatorDetailExtra.followersSuffix')}</Text>
                      ) : p.handle ? (
                        <Text style={[s.socialSub, { color: C.textSecondary }]}>{p.handle}</Text>
                      ) : null}
                    </View>
                    {canOpen && <FontAwesome5 name="external-link-alt" solid size={16} color={C.brinjal1} />}
                  </Pressable>
                );
              })}
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

        {/* ── Portfolio work (media-backed PortfolioItem entries) ── */}
        {portfolioItems.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionPortfolio')} color={C.textSecondary} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.workRow}>
              {portfolioItems.map((item) => {
                const hasMedia = !!item.mediaUrl;
                return (
                  <Pressable
                    key={item.id}
                    style={[s.workTile, { backgroundColor: C.background, borderColor: C.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={item.title ?? t('portfolioScreen.untitled')}
                    onPress={() => {
                      if (hasMedia) setPreviewItem(item);
                      else if (item.externalUrl) Linking.openURL(item.externalUrl).catch(() => {});
                    }}>
                    {hasMedia ? (
                      <Image source={{ uri: item.mediaUrl! }} style={s.workThumb} resizeMode="cover" />
                    ) : (
                      <View style={[s.workThumb, s.workThumbFallback, { backgroundColor: C.primaryLight }]}>
                        <FontAwesome5 name="external-link-alt" solid size={20} color={C.brinjal1} />
                      </View>
                    )}
                    {item.mediaType === 'VIDEO' && hasMedia && (
                      <View style={s.workPlayBadge}>
                        <FontAwesome5 name="play" solid size={10} color="#fff" />
                      </View>
                    )}
                    <View style={s.workMeta}>
                      <Text style={[s.workTitle, { color: C.text }]} numberOfLines={1}>
                        {item.title ?? t('portfolioScreen.untitled')}
                      </Text>
                      {!!item.category && (
                        <Text style={[s.workCategory, { color: C.textSecondary }]} numberOfLines={1}>
                          {item.category}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Portfolio links (legacy label+url list) ── */}
        {portfolioLinks.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface }]}>
            <SectionTitle label={t('creatorDetailExtra.sectionPortfolioLinks')} color={C.textSecondary} />
            <View style={s.portfolioList}>
              {portfolioLinks.map((link) => (
                <Pressable
                  key={link.id}
                  style={[s.portfolioRow, { borderColor: C.border }]}
                  onPress={() => Linking.openURL(link.url).catch(() => {})}>
                  <View
                    style={[
                      s.portfolioIconWrap,
                      {
                        backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
                        shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                      },
                    ]}
                  >
                    <FontAwesome5 name="link" solid size={16} color={C.brinjal1} />
                  </View>
                  <Text style={[s.portfolioLabel, { color: C.text }]} numberOfLines={1}>{link.label}</Text>
                  <FontAwesome5 name="external-link-alt" solid size={15} color={C.brinjal1} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sticky action bar */}
      <View style={[msgBtn.bar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: Math.max(14, insets.bottom) }]}>
        {convStatus === 'ACCEPTED' ? (
          <Pressable
            style={[
              msgBtn.btn,
              {
                backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
              },
            ]}
            onPress={openChat}>
            <FontAwesome5 name="comment-dots" size={16} color="#fff" solid />
            <Text style={msgBtn.txt}>{t('creatorDetailExtra.openChat')}</Text>
          </Pressable>
        ) : convStatus === 'PENDING' ? (
          <View style={[msgBtn.btn, { backgroundColor: C.border }]}>
            <Text style={[msgBtn.txt, { color: '#fff' }]}>{t('creatorDetailExtra.requestSent')}</Text>
          </View>
        ) : (
          <Pressable
            style={[
              msgBtn.btn,
              {
                backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
              },
            ]}
            onPress={openRequestModal}>
            <Text style={msgBtn.txt}>{t('creatorDetailExtra.sendMessage')}</Text>
          </Pressable>
        )}
      </View>
      </MaxWidthContainer>

      {/* Request message modal */}
      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={t('creatorDetailExtra.messageRequestTitle')}
        subtitle={t('creatorDetailExtra.messageRequestSubtitle', { name: profile?.fullName ?? '' })}
        footer={
          <Pressable
            style={[
              rm.sendBtn,
              { backgroundColor: sending ? C.border : C.brinjal1 },
              !sending && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
            ]}
            onPress={handleSendRequest}
            disabled={sending}>
            <Text style={rm.sendTxt}>{sending ? t('creatorDetailExtra.sendingLabel') : t('creatorDetailExtra.sendRequestBtn')}</Text>
          </Pressable>
        }>
        <TextInputWithLabel
          label={t('creatorDetailExtra.messageRequestPlaceholder')}
          value={requestMsg}
          onChangeText={setRequestMsg}
          multiline
          maxLength={500}
        />
        <Text style={[rm.counter, { color: C.textSecondary }]}>{requestMsg.length}/500</Text>
      </BottomSheet>

      {/* Service request modal (§33/34) */}
      <BottomSheet
        visible={!!requestingService}
        onClose={() => setRequestingService(null)}
        title={t('creatorDetailExtra.serviceRequestTitle')}
        subtitle={requestingService?.name}
        footer={
          <Pressable
            style={[
              rm.sendBtn,
              { backgroundColor: (sendingServiceReq || serviceReqMessage.trim().length < 10) ? C.border : C.brinjal1 },
            ]}
            onPress={handleSendServiceRequest}
            disabled={sendingServiceReq || serviceReqMessage.trim().length < 10}>
            <Text style={rm.sendTxt}>{sendingServiceReq ? t('creatorDetailExtra.sendingLabel') : t('creatorDetailExtra.sendRequestBtn')}</Text>
          </Pressable>
        }>
        <TextInputWithLabel
          label={t('creatorDetailExtra.serviceRequestPlaceholder')}
          value={serviceReqMessage}
          onChangeText={setServiceReqMessage}
          multiline
          maxLength={1000}
        />
        <Text style={[rm.counter, { color: C.textSecondary }]}>{serviceReqMessage.length}/1000</Text>
        <View style={{ marginTop: 12 }}>
          <TextInputWithLabel
            label={t('creatorDetailExtra.serviceRequestBudgetLabel')}
            value={serviceReqBudget}
            onChangeText={(v) => setServiceReqBudget(v.replace(/[^0-9]/g, ''))}
            placeholder={t('creatorDetailExtra.serviceRequestBudgetPlaceholder')}
            keyboardType="number-pad"
            leftIcon="dollar-sign"
          />
        </View>
        {!!serviceReqError && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{serviceReqError}</Text>}
      </BottomSheet>

      {profile && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="USER"
          targetId={profile.userId}
        />
      )}

      <ImagePreviewModal
        visible={!!previewItem && previewItem.mediaType !== 'VIDEO'}
        url={previewItem?.mediaUrl ?? null}
        title={previewItem?.title ?? t('portfolioScreen.untitled')}
        onClose={() => setPreviewItem(null)}
      />
      <VideoPlayerModal
        visible={!!previewItem && previewItem.mediaType === 'VIDEO'}
        url={previewItem?.mediaUrl ?? null}
        title={previewItem?.title ?? t('portfolioScreen.untitled')}
        onClose={() => setPreviewItem(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },

  topBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  topTitle:  { flex: 1, fontSize: 18, textAlign: 'center', fontFamily: F.bold },

  scroll: { paddingBottom: 16, gap: 12 },

  // Hero
  // Hero cover
  cover:      { height: 180, overflow: 'hidden' },
  bubble:     { position: 'absolute', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  bubble1:    { width: 160, height: 160, top: -50, right: -30 },
  bubble2:    { width: 100, height: 100, bottom: -20, left: 30 },
  bubble3:    { width: 60,  height: 60,  top: 20,   left: -20  },
  coverTopBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10 },
  coverTopTitleRow: { flex: 1, marginHorizontal: 8 },
  topIconSpacer: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },

  // Avatar card (floats over cover)
  profileCard: { marginHorizontal: 16, marginTop: -72, borderRadius: RADIUS.xl, padding: 20, alignItems: 'center', gap: 6, ...SHADOW.floating },
  avatarArea:  { marginTop: -50, marginBottom: 6, alignItems: 'center', alignSelf: 'center' },
  avatar:      { width: 96, height: 96, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
                 borderWidth: 4, borderColor: '#fff', overflow: 'hidden' },
  avatarInitial: { fontSize: 34, fontFamily: F.bold, textAlign: 'center', lineHeight: 96, width: '100%' },

  // Identity
  nameRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  name:         { fontSize: 22, fontFamily: F.bold, textAlign: 'center' },
  username:     { fontSize: 14, fontFamily: F.regular, marginTop: 2 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  socialRow2:   { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  websiteText:  { fontSize: 14, fontFamily: F.medium, flex: 1 },
  location:     { fontSize: 13, fontFamily: F.regular },

  // Sections
  section:      { marginHorizontal: 20, borderRadius: RADIUS.lg, padding: 16, gap: 12, ...SHADOW.card },
  sectionTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0, fontFamily: F.bold },

  // Bio
  bioText: { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  // Chips
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full },
  catChipText: { fontSize: 13, fontFamily: F.semibold },
  platChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5 },

  // Social accounts
  socialList:      { gap: 10 },
  socialRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  socialIconWrap:  { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialInfo:      { flex: 1 },
  socialPlatform:  { fontSize: 14, fontFamily: F.bold },
  socialSub:       { fontSize: 12, marginTop: 1, fontFamily: F.regular },
  socialLink:      { fontSize: 18, fontFamily: F.semibold },

  // Stats
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile:   { width: '47%', borderRadius: RADIUS.md, padding: 12, gap: 4, alignItems: 'flex-start' },
  statValue:  { fontSize: 16, fontFamily: F.bold },
  statLabel:  { fontSize: 11, fontFamily: F.medium },

  // Portfolio work gallery
  workRow:          { gap: 12, paddingRight: 4 },
  workTile:         { width: 148, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  workThumb:        { width: '100%', height: 148 },
  workThumbFallback:{ justifyContent: 'center', alignItems: 'center' },
  workPlayBadge:    {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center',
  },
  workMeta:         { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  workTitle:        { fontSize: 13, fontFamily: F.semibold },
  workCategory:     { fontSize: 11, fontFamily: F.regular },

  // Portfolio
  portfolioList:    { gap: 10 },
  portfolioRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  portfolioIconWrap:{ width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  portfolioLabel:   { flex: 1, fontSize: 14, fontFamily: F.semibold },

  // Error state
  errorEmoji: { marginBottom: 4 },
  errorTitle: { fontSize: 18, fontFamily: F.bold },
  errorHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  retryBtn:   { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:  { fontSize: 14, fontFamily: F.bold },
});

// Message button bar
const msgBtn = StyleSheet.create({
  bar: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  btn: { borderRadius: RADIUS.full, height: 52, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  txt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});

// Request modal
const rm = StyleSheet.create({
  counter: { fontSize: 11, textAlign: 'right', marginTop: -6, fontFamily: F.regular },
  sendBtn: { borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  sendTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});

const sv = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, padding: 12 },
  catChip:   { width: 22, height: 22, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  name:      { fontSize: 14, fontFamily: F.semibold, flexShrink: 1 },
  price:     { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  reqBtn:    { borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 9 },
  reqBtnTxt: { fontSize: 13, fontFamily: F.bold },
});
