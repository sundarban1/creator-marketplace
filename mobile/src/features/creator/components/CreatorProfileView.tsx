import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ProviderTypeBadge } from '@/components/ProviderTypeBadge';
import { ProfileRatingRow } from '@/components/ProfileRatingRow';
import { ReviewsModal } from '@/components/ReviewsModal';
import { SeeMoreText } from '@/components/SeeMoreText';
import { SectionEmptyState } from '@/components/SectionEmptyState';
import { ReportModal } from '@/components/ReportModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { BackButton } from '@/components/BackButton';
import { IconButton } from '@/components/IconButton';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useToast } from '@/components/Toast';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { chatService } from '@/services/chat';
import { serviceRequestService } from '@/services/serviceRequest';
import type { ApiPublicService } from '@/services/creator';
import type { ApiPortfolioItem } from '@/services/portfolio';
import { useAllCategories, getCategoryMeta, sortOtherLast } from '@/hooks/useCategories';
import { pickAndUpload } from '@/utilities/uploadImage';
import { logger } from '@/utilities/logger';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import type { CreatorProfileVM, MergedPlatform } from '@/features/creator/utils/creatorProfileVm';

// Modes:
//   owner    — the creator's own Profile tab (editable)
//   business — a business viewing a creator (services + service-request, team
//              roster, portfolio gallery, report)
//   peer     — a creator viewing another creator (no services/team/report)
type Mode = 'owner' | 'business' | 'peer';
type ConvStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';

type Props = {
  mode: Mode;
  vm: CreatorProfileVM | null;
  loading?: boolean;
  error?: boolean;
  isPrivate?: boolean;
  onRetry?: () => void;
  focusReviews?: boolean;
  // §9 badge suppression — set when this profile was reached from a team roster
  // and the member is an INDIVIDUAL (their "Individual" badge is noise there).
  viaTeam?: boolean;
};

const PLATFORM_MAP: Record<string, { iconName: string; color: string; label: string }> = {
  instagram: { iconName: 'instagram', color: '#E1306C', label: 'Instagram' },
  tiktok:    { iconName: 'tiktok',    color: '#010101', label: 'TikTok' },
  youtube:   { iconName: 'youtube',   color: '#FF0000', label: 'YouTube' },
  facebook:  { iconName: 'facebook',  color: '#1877F2', label: 'Facebook' },
  twitter:   { iconName: 'twitter',   color: '#1DA1F2', label: 'X / Twitter' },
  linkedin:  { iconName: 'linkedin',  color: '#0A66C2', label: 'LinkedIn' },
  pinterest: { iconName: 'pinterest', color: '#E60023', label: 'Pinterest' },
  snapchat:  { iconName: 'snapchat',  color: '#FFFC00', label: 'Snapchat' },
  twitch:    { iconName: 'twitch',    color: '#9146FF', label: 'Twitch' },
};

function platformInfo(platform: string) {
  return PLATFORM_MAP[platform.toLowerCase()] ?? {
    iconName: 'globe', color: '#6366F1',
    label: platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase(),
  };
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const PRICING_LABEL_KEY: Record<ApiPublicService['pricingModel'], string> = {
  PER_PROJECT: 'PerProject', PER_HOUR: 'PerHour', PER_DAY: 'PerDay', PER_CAMPAIGN: 'PerCampaign', CUSTOM_QUOTE: 'CustomQuote',
};

function HeroCover({ coverUri, topBar }: { coverUri: string | null; topBar?: React.ReactNode }) {
  return (
    <View style={styles.cover}>
      {coverUri ? (
        <>
          <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, styles.coverScrim]} />
        </>
      ) : (
        <LinearGradient
          colors={['#7C3AED', '#EC4899', '#F97316']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}>
          <View style={[styles.bubble, styles.bubble1]} />
          <View style={[styles.bubble, styles.bubble2]} />
          <View style={[styles.bubble, styles.bubble3]} />
        </LinearGradient>
      )}
      <View style={styles.topBar}>{topBar}</View>
    </View>
  );
}

function CreatorAvatar({ name, avatarUrl, bg }: { name: string; avatarUrl: string | null; bg: string }) {
  const initials = (name ?? 'C').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <Text style={styles.avatarInitial}>{initials}</Text>
    </View>
  );
}

function InfoCard({
  title, icon, action, children,
}: {
  title: string;
  icon: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  const C = useAppColors();
  return (
    <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
      <View style={styles.infoCardHeader}>
        <View
          style={[
            styles.infoIconBox,
            {
              backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
              shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
            },
          ]}
        >
          <FontAwesome5 name={icon as any} solid size={15} color={C.brinjal1} />
        </View>
        <Text style={[styles.infoCardTitle, { color: C.text }]}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8} style={styles.infoCardAction}>
            <Text style={[styles.infoCardActionText, { color: C.brinjal1 }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ChipRow({ items, primary }: { items: string[]; primary?: boolean }) {
  const C = useAppColors();
  const { categories } = useAllCategories();
  return (
    <View style={styles.chipWrap}>
      {sortOtherLast(items).map((item) => {
        const meta = getCategoryMeta(categories, item);
        return (
          <View key={item} style={[styles.chip, { backgroundColor: primary ? C.primaryLight : (meta.bg ?? C.primaryLight) }]}>
            <FontAwesome5 name={meta.icon as any} size={11} color={primary ? meta.color : meta.color} />
            <Text style={[styles.chipText, { color: primary ? C.brinjal1 : meta.color }]}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PlatformList({ platforms }: { platforms: MergedPlatform[] }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View style={styles.socialList}>
      {platforms.map((p) => {
        const info = platformInfo(p.platform);
        const canOpen = !!p.profileUrl;
        return (
          <Pressable
            key={p.key}
            style={[styles.socialRow, { borderColor: C.border }]}
            onPress={() => canOpen && Linking.openURL(p.profileUrl!).catch(() => {})}>
            <View
              style={[
                styles.socialIconWrap,
                {
                  backgroundColor: info.color,
                  ...Platform.select({ ios: { shadowColor: info.color, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } }),
                },
              ]}
            >
              <FontAwesome5 name={info.iconName as any} size={18} color="#fff" />
            </View>
            <View style={styles.socialInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.socialPlatform, { color: C.text }]}>{info.label}</Text>
                {p.verified && <FontAwesome5 name="check-circle" solid size={13} color="#16A34A" />}
              </View>
              {p.followers !== null ? (
                <Text style={[styles.socialSub, { color: C.textSecondary }]}>{formatFollowers(p.followers)} {t('creatorDetailExtra.followersSuffix')}</Text>
              ) : p.handle ? (
                <Text style={[styles.socialSub, { color: C.textSecondary }]}>{p.handle}</Text>
              ) : null}
            </View>
            {canOpen && <FontAwesome5 name="external-link-alt" solid size={16} color={C.brinjal1} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CreatorProfileView({
  mode, vm, loading, error, isPrivate, onRetry, focusReviews, viaTeam,
}: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { updateUser } = useAuth();
  const { categories: allCategories } = useAllCategories();

  const isOwner = mode === 'owner';
  const isBusiness = mode === 'business';
  const isVisitor = !isOwner;

  const backFallback = isBusiness ? '/(business)/explore-creators' : '/(creator)/explore-creators';
  const chatPath = isBusiness ? '/(business)/chat/[id]' : '/(creator)/chat/[id]';

  // ── Owner: avatar / cover upload (local optimistic override) ──
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [coverOverride, setCoverOverride]   = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading]   = useState(false);

  async function handleAvatarPress() {
    setAvatarUploading(true);
    try {
      const result = await pickAndUpload('creator-avatar');
      if (result) { setAvatarOverride(result.url); updateUser({ avatar: result.url }); }
    } catch (err) {
      logger.error('[creator-profile] avatar upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleCoverPress() {
    setCoverUploading(true);
    try {
      const result = await pickAndUpload('creator-cover');
      if (result) setCoverOverride(result.url);
    } catch (err) {
      logger.error('[creator-profile] cover upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setCoverUploading(false);
    }
  }

  // ── Visitor: conversation + message-request + report ──
  const [convId, setConvId]         = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<ConvStatus | null>(null);
  const [showMsgModal, setShowMsgModal]       = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const creatorId = vm?.id ?? null;
  useEffect(() => {
    if (isOwner || !creatorId || isPrivate) return;
    let cancelled = false;
    const check = isBusiness ? chatService.checkConversation : chatService.checkCreatorConversation;
    check(creatorId)
      .then((conv) => { if (!cancelled && conv) { setConvId(conv.id); setConvStatus(conv.status); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOwner, isBusiness, creatorId, isPrivate]);

  // ── Business: service-request flow ──
  const [requestingService, setRequestingService] = useState<ApiPublicService | null>(null);
  const [serviceReqMessage, setServiceReqMessage] = useState('');
  const [serviceReqBudget, setServiceReqBudget]   = useState('');
  const [sendingServiceReq, setSendingServiceReq] = useState(false);
  const [serviceReqError, setServiceReqError]     = useState('');
  const [sentServiceReqIds, setSentServiceReqIds] = useState<Set<string>>(new Set());

  // ── Business/peer: portfolio media preview ──
  const [previewItem, setPreviewItem] = useState<ApiPortfolioItem | null>(null);

  // ── Reviews: summary under the name, full list in a modal ──
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [handledReviewsDeepLink, setHandledReviewsDeepLink] = useState(false);
  if (focusReviews && !handledReviewsDeepLink && vm?.reviews?.length) {
    setHandledReviewsDeepLink(true);
    setReviewsOpen(true);
  }

  const edges: Edge[] = isOwner ? ['top'] : ['top', 'bottom'];
  const coverUri = coverOverride ?? vm?.coverImageUrl ?? null;
  const backTopBar = <BackButton variant="overlay" fallback={backFallback} />;

  // ── Loading / error / private (visitor only) ──
  if (isVisitor && loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
        <HeroCover coverUri={coverUri} topBar={backTopBar} />
        <View style={styles.center}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (isVisitor && error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
        <HeroCover coverUri={coverUri} topBar={backTopBar} />
        <View style={styles.center}>
          <FontAwesome5 name="user-slash" size={40} color={C.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={[styles.errTitle, { color: C.text }]}>{t('creatorDetailExtra.notFound')}</Text>
          <Text style={[styles.errHint, { color: C.textSecondary }]}>{t('creatorDetailExtra.notFoundSub')}</Text>
          <Pressable onPress={() => (onRetry ? onRetry() : router.back())} style={[styles.retryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[styles.retryText, { color: C.brinjal1 }]}>{onRetry ? t('common.tryAgain') : t('creatorDetailExtra.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!vm) {
    return <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges} />;
  }

  const avatarUri = avatarOverride ?? vm.avatarUrl;
  const avatarBg = (() => {
    for (const c of vm.categories) {
      const match = allCategories.find((cat) => cat.name === c);
      if (match) return match.iconBg;
    }
    return '#E8EAF6';
  })();

  if (isVisitor && isPrivate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
        <HeroCover coverUri={coverUri} topBar={backTopBar} />
        <View style={styles.center}>
          <FontAwesome5 name="lock" solid size={40} color={C.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={[styles.errTitle, { color: C.text }]}>{t('creatorDetailExtra.isPrivateTitle')}</Text>
          <Text style={[styles.errHint, { color: C.textSecondary }]}>{t('creatorDetailExtra.isPrivateSub')}</Text>
          <Pressable onPress={() => router.back()} style={[styles.retryBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('creatorDetailExtra.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Provider-type badge (Individual / Team / Agency) hidden from the profile — kept for later.
  const showProviderBadge = false && isVisitor && !(viaTeam && vm.providerType === 'INDIVIDUAL');
  const showMsgBar = isVisitor && (convStatus === 'ACCEPTED' || convStatus === 'PENDING');

  function openChat(id = convId, status = convStatus) {
    if (!id || !vm) return;
    router.push({
      pathname: chatPath as never,
      params: {
        id, name: vm.fullName ?? vm.username ?? 'Creator', avatar: vm.avatarUrl ?? '',
        status: status ?? 'ACCEPTED', participantId: vm.id,
        ...(isBusiness ? {} : { participantRole: 'CREATOR' }),
      },
    } as never);
  }

  async function handleSendRequest() {
    if (!vm?.userId) return;
    setSendingMsg(true);
    try {
      const send = isBusiness ? chatService.sendMessageRequest : chatService.sendCreatorMessageRequest;
      const conv = await send(vm.userId, requestMsg.trim() || undefined);
      setConvId(conv.id);
      setConvStatus(conv.status as ConvStatus);
      setShowMsgModal(false);
      setRequestMsg('');
      if (conv.status === 'ACCEPTED') openChat(conv.id, conv.status as ConvStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('businessDetail.sendMessageError'));
    } finally {
      setSendingMsg(false);
    }
  }

  function openServiceRequest(service: ApiPublicService) {
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
        serviceReqBudget.trim() ? Number(serviceReqBudget) : undefined,
      );
      setSentServiceReqIds((prev) => new Set(prev).add(requestingService.id));
      setRequestingService(null);
    } catch (e) {
      setServiceReqError(e instanceof Error ? e.message : t('creatorDetailExtra.serviceRequestFailed'));
    } finally {
      setSendingServiceReq(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
      <MaxWidthContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        <HeroCover
          coverUri={coverUri}
          topBar={
            isOwner ? (
              <IconButton
                icon="camera"
                variant="overlay"
                onPress={handleCoverPress}
                loading={coverUploading}
                accessibilityLabel="Change cover photo"
              />
            ) : (
              <>
                <BackButton variant="overlay" fallback={backFallback} />
                <View style={{ flex: 1 }} />
                {isBusiness ? (
                  <Pressable
                    style={styles.topIconBtnLight}
                    hitSlop={10}
                    onPress={() => setShowReportModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('reportModal.title')}>
                    <FontAwesome5 name="flag" size={16} color="#9CA3AF" />
                  </Pressable>
                ) : (
                  <View style={{ width: 38, height: 38 }} />
                )}
              </>
            )
          }
        />

        {/* ── Avatar card ── */}
        <View style={[styles.profileCard, { backgroundColor: C.surface }]}>
          <View style={styles.avatarArea}>
            {isOwner ? (
              <Pressable onPress={handleAvatarPress} disabled={avatarUploading} style={styles.avatarPressable}>
                <CreatorAvatar name={vm.fullName} avatarUrl={avatarUri} bg={C.primaryLight} />
                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                      shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                    },
                  ]}
                >
                  {avatarUploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <FontAwesome5 name="camera" solid size={13} color="#fff" />}
                </View>
              </Pressable>
            ) : (
              <CreatorAvatar name={vm.fullName} avatarUrl={avatarUri} bg={avatarBg} />
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>{vm.fullName}</Text>
            {vm.verified && <VerifiedBadge size={16} />}
            {showProviderBadge && <ProviderTypeBadge type={vm.providerType} teamSize={vm.teamSize} />}
          </View>
          {vm.username ? (
            <Text style={[styles.username, { color: C.textSecondary }]}>@{vm.username}</Text>
          ) : null}
          <ProfileRatingRow
            averageRating={vm.reviewSummary?.averageRating ?? null}
            reviewCount={vm.reviewSummary?.reviewCount ?? vm.reviews.length}
            onPress={() => setReviewsOpen(true)}
          />
          {vm.location ? (
            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={13} color={C.brinjal1} />
              <Text style={[styles.location, { color: C.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{vm.location}</Text>
            </View>
          ) : null}

          {isOwner && (
            <>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => router.push('/(creator)/edit-profile' as never)}>
                  <FontAwesome5 name="edit" size={15} color={C.brinjal1} />
                  <Text style={[styles.editBtnText, { color: C.brinjal1 }]}>{t('profile.editProfile')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => router.push('/(creator)/analytics' as never)}>
                  <FontAwesome5 name="chart-bar" size={15} color={C.brinjal1} />
                  <Text style={[styles.editBtnText, { color: C.brinjal1 }]}>{t('analytics.headerTitle')}</Text>
                </Pressable>
              </View>

              <View style={[styles.statsStrip, { borderTopColor: C.border }]}>
                <StatItem
                  value={vm.ownerStats!.completedEvents}
                  label={t('profile.completedEvents')}
                  onPress={() => router.push({ pathname: '/(creator)/proposals', params: { tab: 'accepted' } } as never)}
                />
                <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
                <StatItem
                  value={vm.ownerStats!.savedBrands}
                  label={t('profile.savedBrands')}
                  onPress={() => router.push('/(creator)/favorite-businesses' as never)}
                />
                <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
                <StatItem
                  value={vm.ownerStats!.savedByBusinesses}
                  label={t('profile.savedByBusinesses')}
                  onPress={() => router.push('/(creator)/saved-by-businesses' as never)}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.body}>
          {/* About Me */}
          {vm.bio ? (
            <InfoCard
              title={t('profile.aboutMe')}
              icon="user"
              action={isOwner ? { label: t('common.edit'), onPress: () => router.push('/(creator)/edit-profile' as never) } : undefined}>
              <SeeMoreText style={[styles.aboutText, { color: C.text }]} threshold={150}>{vm.bio}</SeeMoreText>
            </InfoCard>
          ) : isOwner ? (
            <InfoCard title={t('profile.aboutMe')} icon="user">
              <SectionEmptyState
                icon="user"
                title={t('profile.noBioYet')}
                hint={t('profile.bioHint')}
                cta={t('profile.addBio')}
                onPress={() => router.push('/(creator)/edit-profile' as never)}
              />
            </InfoCard>
          ) : null}

          {/* Categories */}
          {vm.categories.length > 0 ? (
            <InfoCard
              title={t('profile.contentCategories')}
              icon="th-large"
              action={isOwner ? { label: t('common.edit'), onPress: () => router.push('/(creator)/edit-categories' as never) } : undefined}>
              <ChipRow items={vm.categories} primary />
            </InfoCard>
          ) : isOwner ? (
            <InfoCard title={t('profile.contentCategories')} icon="th-large">
              <SectionEmptyState
                icon="th-large"
                title={t('profile.noCategoriesYet')}
                hint={t('profile.categoriesHint')}
                cta={t('profile.addContentCategories')}
                onPress={() => router.push('/(creator)/edit-categories' as never)}
              />
            </InfoCard>
          ) : null}

          {/* Services (business only) */}
          {isBusiness && vm.services.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionServices')} icon="concierge-bell">
              <View style={{ gap: 10 }}>
                {vm.services.map((svc) => {
                  const requested = sentServiceReqIds.has(svc.id);
                  return (
                    <View key={svc.id} style={[styles.svcCard, { borderColor: C.border, backgroundColor: C.background }]}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.svcCatChip, { backgroundColor: `${svc.category.color}1A` }]}>
                            <FontAwesome5 name={svc.category.icon as any} solid size={10} color={svc.category.color} />
                          </View>
                          <Text style={[styles.svcName, { color: C.text }]} numberOfLines={1}>{svc.name}</Text>
                        </View>
                        <Text style={[styles.svcPrice, { color: C.textSecondary }]}>
                          {svc.startingPrice != null ? `Rs. ${svc.startingPrice.toLocaleString()}` : t('creatorDetailExtra.servicePriceNegotiable')}
                          {' · '}{t(`servicesScreen.pricing${PRICING_LABEL_KEY[svc.pricingModel]}`)}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.svcReqBtn, requested ? { backgroundColor: C.background, borderWidth: 1, borderColor: C.border } : { backgroundColor: C.brinjal1 }]}
                        disabled={requested}
                        onPress={() => openServiceRequest(svc)}>
                        <Text style={[styles.svcReqBtnTxt, { color: requested ? C.textSecondary : '#fff' }]}>
                          {requested ? t('creatorDetailExtra.serviceRequested') : t('creatorDetailExtra.serviceRequestBtn')}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </InfoCard>
          )}

          {/* Industries (visitor only) */}
          {isVisitor && vm.industries.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionIndustries')} icon="briefcase">
              <ChipRow items={vm.industries} primary />
            </InfoCard>
          )}

          {/* Team members (business only) */}
          {isBusiness && vm.teamMembers.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionTeamMembers')} icon="users">
              <View style={styles.memberList}>
                {vm.teamMembers.map((m) => {
                  const memberInitials = (m.fullName ?? '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.memberRow, { borderColor: C.border }]}
                      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: m.id, viaTeam: '1' } } as never)}
                      accessibilityRole="button">
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={styles.memberAvatar} />
                      ) : (
                        <View style={[styles.memberAvatar, { backgroundColor: C.primaryLight }]}>
                          <Text style={styles.memberAvatarInitial}>{memberInitials}</Text>
                        </View>
                      )}
                      <View style={styles.memberText}>
                        <View style={styles.memberNameRow}>
                          <Text style={[styles.memberName, { color: C.text }]} numberOfLines={1}>{m.fullName ?? '—'}</Text>
                          {m.isVerified && <VerifiedBadge size={13} />}
                        </View>
                        {m.username ? (
                          <Text style={[styles.memberUsername, { color: C.textSecondary }]} numberOfLines={1}>@{m.username}</Text>
                        ) : null}
                      </View>
                      <FontAwesome5 name="chevron-right" size={12} color={C.textSecondary} />
                    </Pressable>
                  );
                })}
              </View>
            </InfoCard>
          )}

          {/* Service mode (visitor only) */}
          {isVisitor && vm.serviceMode ? (
            <InfoCard title={t('serviceMode.label')} icon="map-marked-alt">
              <View style={styles.inlineRow}>
                <FontAwesome5
                  name={vm.serviceMode === 'ONLINE' ? 'laptop' : vm.serviceMode === 'MY_LOCATION' ? 'store' : vm.serviceMode === 'HYBRID' ? 'random' : 'car-side'}
                  solid size={14} color={C.brinjal1}
                />
                <Text style={[styles.inlineText, { color: C.text }]}>{t(`serviceMode.${vm.serviceMode}`)}</Text>
              </View>
            </InfoCard>
          ) : null}

          {/* Website */}
          {vm.website ? (
            <InfoCard
              title={t('creatorDetailExtra.sectionWebsite')}
              icon="globe"
              action={isOwner ? { label: t('common.edit'), onPress: () => router.push('/(creator)/edit-profile' as never) } : undefined}>
              <Pressable
                style={styles.inlineRow}
                onPress={() => Linking.openURL(vm.website!).catch(() => {})}
                accessibilityRole="link">
                <FontAwesome5 name="globe" solid size={14} color={C.brinjal1} />
                <Text style={[styles.inlineText, { color: C.brinjal1 }]} numberOfLines={1}>{vm.website.replace(/^https?:\/\//, '')}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {/* Social platforms (visitor only) */}
          {isVisitor && vm.platforms.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionPlatforms')} icon="share-alt">
              <PlatformList platforms={vm.platforms} />
            </InfoCard>
          )}

          {/* Preferred platforms (visitor only) */}
          {isVisitor && vm.prefPlatforms.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionPreferredPlatforms')} icon="heart">
              <View style={styles.chipWrap}>
                {vm.prefPlatforms.map((p) => {
                  const info = platformInfo(p);
                  return (
                    <View key={p} style={[styles.platChip, { backgroundColor: C.background, borderColor: C.border }]}>
                      <FontAwesome5 name={info.iconName as any} size={14} color={info.color} />
                      <Text style={[styles.chipText, { color: C.text }]}>{info.label}</Text>
                    </View>
                  );
                })}
              </View>
            </InfoCard>
          )}

          {/* Portfolio */}
          {isOwner ? (
            <InfoCard
              title={t('portfolioScreen.title')}
              icon="images"
              action={{
                label: vm.portfolioItems.length > 0 ? t('profile.manage') : t('portfolioScreen.addShort'),
                onPress: () => router.push((vm.portfolioItems.length > 0 ? '/(creator)/portfolio' : '/(creator)/portfolio-form') as never),
              }}>
              {vm.portfolioItems.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioScroll}>
                  {vm.portfolioItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[styles.portfolioTile, { backgroundColor: C.background, borderColor: C.border }]}
                      onPress={() => router.push('/(creator)/portfolio' as never)}>
                      {item.mediaUrl ? (
                        <Image source={{ uri: item.mediaUrl }} style={styles.portfolioImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.portfolioImage, styles.portfolioFallback, { backgroundColor: C.primaryLight }]}>
                          <FontAwesome5 name="external-link-alt" solid size={18} color={C.brinjal1} />
                        </View>
                      )}
                      {item.mediaType === 'VIDEO' && (
                        <View style={styles.portfolioPlayBadge}>
                          <FontAwesome5 name="play" solid size={9} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                  <Pressable
                    style={[styles.portfolioTile, styles.portfolioAddTile, { borderColor: C.brinjal1 + '55' }]}
                    onPress={() => router.push('/(creator)/portfolio-form' as never)}>
                    <FontAwesome5 name="plus" solid size={18} color={C.brinjal1} />
                  </Pressable>
                </ScrollView>
              ) : (
                <SectionEmptyState
                  icon="images"
                  title={t('portfolioScreen.emptyTitle')}
                  hint={t('portfolioScreen.emptySub')}
                  cta={t('portfolioScreen.addItem')}
                  onPress={() => router.push('/(creator)/portfolio-form' as never)}
                />
              )}
            </InfoCard>
          ) : null}

          {/* Portfolio work gallery (business only) */}
          {isBusiness && vm.portfolioItems.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionPortfolio')} icon="images">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workRow}>
                {vm.portfolioItems.map((item) => {
                  const hasMedia = !!item.mediaUrl;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.workTile, { backgroundColor: C.background, borderColor: C.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={item.description || item.title || t('portfolioScreen.untitled')}
                      onPress={() => {
                        if (hasMedia) setPreviewItem(item);
                        else if (item.externalUrl) Linking.openURL(item.externalUrl).catch(() => {});
                      }}>
                      {hasMedia ? (
                        <Image source={{ uri: item.mediaUrl! }} style={styles.workThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.workThumb, styles.workThumbFallback, { backgroundColor: C.primaryLight }]}>
                          <FontAwesome5 name="external-link-alt" solid size={20} color={C.brinjal1} />
                        </View>
                      )}
                      {item.mediaType === 'VIDEO' && hasMedia && (
                        <View style={styles.workPlayBadge}>
                          <FontAwesome5 name="play" solid size={10} color="#fff" />
                        </View>
                      )}
                      <View style={styles.workMeta}>
                        <Text style={[styles.workTitle, { color: C.text }]} numberOfLines={1}>
                          {item.description || item.title || t('portfolioScreen.untitled')}
                        </Text>
                        {!!item.category && (
                          <Text style={[styles.workCategory, { color: C.textSecondary }]} numberOfLines={1}>{item.category}</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </InfoCard>
          )}

          {/* Portfolio links (visitor only — legacy label+url list) */}
          {isVisitor && vm.portfolioLinks.length > 0 && (
            <InfoCard title={t('creatorDetailExtra.sectionPortfolioLinks')} icon="link">
              <View style={styles.socialList}>
                {vm.portfolioLinks.map((link) => (
                  <Pressable
                    key={link.id}
                    style={[styles.socialRow, { borderColor: C.border }]}
                    onPress={() => Linking.openURL(link.url).catch(() => {})}>
                    <View
                      style={[
                        styles.socialIconWrap,
                        {
                          backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
                          shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                        },
                      ]}
                    >
                      <FontAwesome5 name="link" solid size={16} color={C.brinjal1} />
                    </View>
                    <Text style={[styles.portfolioLabel, { color: C.text }]} numberOfLines={1}>{link.label}</Text>
                    <FontAwesome5 name="external-link-alt" solid size={15} color={C.brinjal1} />
                  </Pressable>
                ))}
              </View>
            </InfoCard>
          )}

          {/* Performance (visitor only) — kept last */}
          {isVisitor && vm.visitorStats && (
            <InfoCard title={t('creatorDetailExtra.sectionStats')} icon="chart-bar">
              <View style={styles.statsGrid}>
                <View style={[styles.statTile, { backgroundColor: C.background }]}>
                  <FontAwesome5 name="check-circle" solid size={16} color={C.brinjal1} />
                  <Text style={[styles.statValue, { color: C.text }]}>{vm.visitorStats.profileCompletion}%</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.profileCompletion')}</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: C.background }]}>
                  <FontAwesome5 name="star" size={16} color={C.brinjal1} />
                  <Text style={[styles.statValue, { color: C.text }]}>{vm.visitorStats.averageRating.toFixed(1)}</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.averageRating')}</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: C.background }]}>
                  <FontAwesome5 name="clock" size={16} color={C.brinjal1} />
                  <Text style={[styles.statValue, { color: C.text }]}>{vm.visitorStats.responseTimeAvgMins} min</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.responseTime')}</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: C.background }]}>
                  <FontAwesome5 name="chart-line" solid size={16} color={C.brinjal1} />
                  <Text style={[styles.statValue, { color: C.text }]}>{vm.visitorStats.completionRate}%</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.completionRate')}</Text>
                </View>
              </View>
            </InfoCard>
          )}
        </View>
      </ScrollView>

      {showMsgBar && (
        <View style={[styles.msgBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: Math.max(SPACING.md, insets.bottom) }]}>
          {convStatus === 'ACCEPTED' ? (
            <Pressable
              style={[
                styles.msgBtn,
                {
                  backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                  shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                },
              ]}
              onPress={() => openChat()}>
              <FontAwesome5 name="comment-dots" size={16} color="#fff" solid />
              <Text style={styles.msgBtnText}>{t('creatorDetailExtra.openChat')}</Text>
            </Pressable>
          ) : (
            <View style={[styles.msgBtn, { backgroundColor: C.border }]}>
              <Text style={[styles.msgBtnText, { color: '#fff' }]}>{t('creatorDetailExtra.requestSent')}</Text>
            </View>
          )}
        </View>
      )}
      </MaxWidthContainer>

      {isVisitor && (
        <>
          <BottomSheet
            visible={showMsgModal}
            onClose={() => setShowMsgModal(false)}
            title={t('creatorDetailExtra.messageRequestTitle')}
            subtitle={t('creatorDetailExtra.messageRequestSubtitle', { name: vm.fullName })}
            footer={
              <Pressable
                style={[
                  styles.modalSendBtn,
                  { backgroundColor: sendingMsg ? C.border : C.brinjal1 },
                  !sendingMsg && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
                ]}
                onPress={handleSendRequest}
                disabled={sendingMsg}>
                <Text style={styles.modalSendText}>{sendingMsg ? t('creatorDetailExtra.sendingLabel') : t('creatorDetailExtra.sendRequestBtn')}</Text>
              </Pressable>
            }>
            <TextInputWithLabel
              label={t('creatorDetailExtra.messageRequestPlaceholder')}
              value={requestMsg}
              onChangeText={setRequestMsg}
              multiline
              maxLength={500}
            />
          </BottomSheet>

          {isBusiness && (
            <>
              <BottomSheet
                visible={!!requestingService}
                onClose={() => setRequestingService(null)}
                title={t('creatorDetailExtra.serviceRequestTitle')}
                subtitle={requestingService?.name}
                footer={
                  <Pressable
                    style={[
                      styles.modalSendBtn,
                      { backgroundColor: (sendingServiceReq || serviceReqMessage.trim().length < 10) ? C.border : C.brinjal1 },
                    ]}
                    onPress={handleSendServiceRequest}
                    disabled={sendingServiceReq || serviceReqMessage.trim().length < 10}>
                    <Text style={styles.modalSendText}>{sendingServiceReq ? t('creatorDetailExtra.sendingLabel') : t('creatorDetailExtra.sendRequestBtn')}</Text>
                  </Pressable>
                }>
                <TextInputWithLabel
                  label={t('creatorDetailExtra.serviceRequestPlaceholder')}
                  value={serviceReqMessage}
                  onChangeText={setServiceReqMessage}
                  multiline
                  maxLength={1000}
                />
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

              <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                targetType="USER"
                targetId={vm.userId ?? vm.id}
              />

              <ImagePreviewModal
                visible={!!previewItem && previewItem.mediaType !== 'VIDEO'}
                url={previewItem?.mediaUrl ?? null}
                title={previewItem?.description || previewItem?.title || t('portfolioScreen.untitled')}
                onClose={() => setPreviewItem(null)}
              />
              <VideoPlayerModal
                visible={!!previewItem && previewItem.mediaType === 'VIDEO'}
                url={previewItem?.mediaUrl ?? null}
                title={previewItem?.description || previewItem?.title || t('portfolioScreen.untitled')}
                onClose={() => setPreviewItem(null)}
              />
            </>
          )}
        </>
      )}

      <ReviewsModal
        visible={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        reviews={vm.reviews}
        averageRating={vm.reviewSummary?.averageRating ?? null}
        reviewCount={vm.reviewSummary?.reviewCount ?? vm.reviews.length}
      />
    </SafeAreaView>
  );
}

function StatItem({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const C = useAppColors();
  const inner = (
    <>
      <Text style={[styles.heroStatValue, { color: C.text }]}>{value}</Text>
      <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{label}</Text>
    </>
  );
  return onPress ? (
    <Pressable style={styles.heroStat} onPress={onPress}>{inner}</Pressable>
  ) : (
    <View style={styles.heroStat}>{inner}</View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 32 },

  errTitle:  { fontSize: 18, fontFamily: F.bold },
  errHint:   { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  retryBtn:  { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText: { fontSize: 14, fontFamily: F.bold },

  // Hero cover
  cover:     { height: 180, overflow: 'hidden' },
  coverScrim:{ backgroundColor: 'rgba(0,0,0,0.28)' },
  bubble:    { position: 'absolute', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  bubble1:   { width: 160, height: 160, top: -50, right: -30 },
  bubble2:   { width: 100, height: 100, bottom: -20, left: 30 },
  bubble3:   { width: 60,  height: 60,  top: 20,   left: -20  },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md },
  topIconBtnLight: { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOW.card },

  // Avatar card
  profileCard:    { marginHorizontal: SCREEN_GUTTER, marginTop: -60, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: 6, ...SHADOW.floating },
  avatarArea:     { marginTop: -50, marginBottom: 6, alignItems: 'center', alignSelf: 'center' },
  avatarPressable:{ position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatar:         { width: 96, height: 96, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
                    borderWidth: 4, borderColor: '#fff', overflow: 'hidden' },
  avatarInitial:  { fontSize: 34, fontFamily: F.bold, textAlign: 'center', lineHeight: 96, width: '100%', color: '#5B21B6' },
  cameraBadge:    { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: RADIUS.full,
                    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  nameRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  name:       { fontSize: 22, fontFamily: F.bold, textAlign: 'center' },
  username:   { fontSize: 14, fontFamily: F.regular, marginTop: 2 },
  locationRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, maxWidth: '100%' },
  location:   { fontSize: 13, fontFamily: F.regular, flexShrink: 1 },

  actionRow:  { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40,
                borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 8 },
  editBtnText:{ fontSize: 13, fontFamily: F.bold },

  statsStrip:     { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  heroStat:       { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  heroStatValue:  { fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  heroStatLabel:  { fontSize: 10, textTransform: 'uppercase', marginTop: 1, fontFamily: F.semibold, textAlign: 'center' },
  heroStatDivider:{ width: 1, height: 28, flexShrink: 0 },

  body: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, gap: 12 },

  // Info card
  infoCard:       { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 12, ...SHADOW.card },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIconBox:    { width: 32, height: 32, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  infoCardTitle:  { fontSize: 14, fontFamily: F.bold },
  infoCardAction: { marginLeft: 'auto' },
  infoCardActionText: { fontSize: 13, fontFamily: F.bold },
  aboutText:      { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  inlineRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  inlineText: { fontSize: 14, fontFamily: F.medium, flex: 1 },

  // Chips
  chipWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full },
  chipText:  { fontSize: 13, fontFamily: F.semibold },
  platChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5 },

  // Performance tiles
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile:  { width: '47%', borderRadius: RADIUS.md, padding: 12, gap: 4, alignItems: 'flex-start' },
  statValue: { fontSize: 16, fontFamily: F.bold },
  statLabel: { fontSize: 11, fontFamily: F.medium },

  // Services
  svcCard:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  svcCatChip:   { width: 22, height: 22, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  svcName:      { fontSize: 14, fontFamily: F.semibold, flexShrink: 1 },
  svcPrice:     { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  svcReqBtn:    { borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 9 },
  svcReqBtnTxt: { fontSize: 13, fontFamily: F.bold },

  // Team members
  memberList:         { gap: 10 },
  memberRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  memberAvatar:       { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  memberAvatarInitial:{ fontSize: 15, fontFamily: F.bold, textAlign: 'center', lineHeight: 40, width: '100%', color: '#5B21B6' },
  memberText:         { flex: 1, gap: 2 },
  memberNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName:         { fontSize: 14, fontFamily: F.semibold },
  memberUsername:     { fontSize: 12, fontFamily: F.regular },

  // Social platforms / portfolio links
  socialList:     { gap: 10 },
  socialRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  socialIconWrap: { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  socialInfo:     { flex: 1 },
  socialPlatform: { fontSize: 14, fontFamily: F.bold },
  socialSub:      { fontSize: 12, marginTop: 1, fontFamily: F.regular },
  portfolioLabel: { flex: 1, fontSize: 14, fontFamily: F.semibold },

  // Owner portfolio strip
  portfolioScroll:   { gap: 10, paddingRight: 4 },
  portfolioTile:     { width: 76, height: 76, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  portfolioImage:    { width: '100%', height: '100%' },
  portfolioFallback: { justifyContent: 'center', alignItems: 'center' },
  portfolioPlayBadge:{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: RADIUS.full,
                       backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center' },
  portfolioAddTile:  { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed' },

  // Business portfolio gallery
  workRow:          { gap: 12, paddingRight: 4 },
  workTile:         { width: 148, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  workThumb:        { width: '100%', height: 148 },
  workThumbFallback:{ justifyContent: 'center', alignItems: 'center' },
  workPlayBadge:    { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12,
                      backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center' },
  workMeta:         { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  workTitle:        { fontSize: 13, fontFamily: F.semibold },
  workCategory:     { fontSize: 11, fontFamily: F.regular },

  // Sticky message bar
  msgBar:     { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderTopWidth: 1 },
  msgBtn:     { borderRadius: RADIUS.full, height: 52, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  msgBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },

  // Modals
  modalSendBtn:  { borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  modalSendText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
