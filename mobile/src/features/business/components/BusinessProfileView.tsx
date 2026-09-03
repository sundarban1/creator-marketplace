import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ProfileRatingRow } from '@/components/ProfileRatingRow';
import { ReviewsModal } from '@/components/ReviewsModal';
import { SeeMoreText } from '@/components/SeeMoreText';
import { ReportModal } from '@/components/ReportModal';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useToast } from '@/components/Toast';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { chatService } from '@/services/chat';
import type { BusinessActiveCampaign } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useAllCategories, getCategoryMeta, sortOtherLast } from '@/hooks/useCategories';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { eventOptionLabels } from '@/features/business/utils/eventOptionLabels';
import { pickAndUpload } from '@/utilities/uploadImage';
import { formatPhoneDisplay } from '@/utilities/phone';
import { logger } from '@/utilities/logger';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import type { BusinessProfileVM } from '@/features/business/utils/businessProfileVm';

type ConvStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';

type Props = {
  mode: 'owner' | 'visitor';
  vm: BusinessProfileVM | null;
  // Visitor load states — owner always feeds a vm (or null while the first
  // fetch is in flight, which just renders nothing rather than a spinner, same
  // as the screen did before).
  loading?: boolean;
  error?: boolean;
  isPrivate?: boolean;
  onRetry?: () => void;
  // Owner: scroll the Reviews section into view (review_received deep-link).
  focusReviews?: boolean;
  // Visitor: campaign ids the current creator has already applied to.
  appliedCampaignIds?: Set<string>;
};

const CATEGORY_BG: Record<string, string> = {
  Fashion: '#F2DCF0', Beauty: '#DCF2E6', Tech: '#DCE6F2', Food: '#F2E6DC',
  Travel: '#F2F2DC', Fitness: '#DCF2EE', Gaming: '#E6DCF2', Education: '#FDEFD0',
};

function daysLeft(iso: string): { text: string; urgent: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  if (d <= 0) return { text: 'Deadline passed', urgent: true };
  if (d <= 3) return { text: `${d} day${d === 1 ? '' : 's'} left`, urgent: true };
  if (d <= 7) return { text: `${d} days left`, urgent: false };
  return { text: new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false };
}

function HeroCover({ coverUri, topBar }: { coverUri: string | null; topBar?: React.ReactNode }) {
  return (
    <View style={styles.cover}>
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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

function BusinessAvatar({ name, logoUrl, size = 96 }: { name: string; logoUrl: string | null; size?: number }) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: '#fff' }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' }}>
      <Text style={{ fontSize: size * 0.38, fontFamily: F.bold, color: C.brinjal1 }}>{letter}</Text>
    </View>
  );
}

// Booking-site style row — mirrors features/creator/components/CampaignListItem.
function CampaignCard({ campaign, isApplied }: { campaign: BusinessActiveCampaign; isApplied: boolean }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories } = useAllCategories();
  const catMeta = getCategoryMeta(categories, campaign.category);
  const catBg = CATEGORY_BG[campaign.category] ?? '#F2F0DC';
  const cardImage = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.category);
  const deadline = daysLeft(campaign.deadline);
  const isOpenEvent = campaign.campaignType === 'OPEN_EVENT';
  const offering =
    isOpenEvent && campaign.benefits?.length
      ? eventOptionLabels(campaign.benefits, 'offering', t).join(', ')
      : '';
  const amountLabel =
    offering ||
    (isOpenEvent
      ? t('businessDetail.freeEventPerks')
      : `Rs ${campaign.budgetMin.toLocaleString()}–${campaign.budgetMax.toLocaleString()}`);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } } as never);
  }

  return (
    <View style={[styles.campaignCardWrap, { backgroundColor: C.surface }]}>
      <Pressable
        style={({ pressed }) => [styles.campaignCard, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}
        onPress={goToDetail}>
        <View style={[styles.campaignThumb, { backgroundColor: catBg }]}>
          <FontAwesome5 name={catMeta.icon as any} size={28} color={catMeta.color} style={styles.campaignThumbIcon} />
          {cardImage && (
            <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          {campaign.isFeatured && (
            <View style={[styles.featuredRibbon, { backgroundColor: '#F59E0B' }]}>
              <FontAwesome5 name="star" size={8} color="#fff" solid />
            </View>
          )}
        </View>

        <View style={styles.campaignBody}>
          <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={1}>{campaign.title}</Text>

          <View style={styles.campaignAmountRow}>
            <View style={styles.campaignBudgetWrap}>
              {isOpenEvent && (
                <View style={[styles.campaignTagBadge, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.campaignTagBadgeText, { color: '#059669' }]}>{t('campaignCard.free')}</Text>
                </View>
              )}
              <Text
                style={[styles.campaignBudget, { color: isOpenEvent ? C.textSecondary : C.text }]}
                numberOfLines={1}>
                {amountLabel}
              </Text>
            </View>
            <View style={styles.campaignDaysLeftWrap}>
              <FontAwesome5 name="clock" size={10} color={deadline.urgent ? '#DC2626' : C.textSecondary} />
              <Text style={[styles.campaignDetailText, { color: deadline.urgent ? '#DC2626' : C.textSecondary }]} numberOfLines={1}>{deadline.text}</Text>
            </View>
          </View>

          <View style={styles.campaignMetaRow}>
            <Text style={[styles.campaignMetaLine, { color: C.textSecondary }]} numberOfLines={1}>
              {campaign.category} · {campaign.contentType}
            </Text>
            {isApplied ? (
              <View style={[styles.campaignTagBadge, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.campaignTagBadgeText, { color: '#059669' }]}>{t('businessDetail.applied')}</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.campaignTagBadge, { backgroundColor: C.primaryLight }]}
                hitSlop={8}
                onPress={(e) => { e.stopPropagation(); goToDetail(); }}>
                <Text style={[styles.campaignTagBadgeText, { color: C.brinjal1 }]}>{t('businessDetail.applyNow')}</Text>
              </Pressable>
            )}
          </View>

          {campaign.location && (
            <View style={[styles.campaignDetailsRow, { borderTopColor: C.border }]}>
              <View style={styles.campaignDetailItem}>
                <FontAwesome5 name="map-marker-alt" solid size={10} color={C.textSecondary} />
                <Text style={[styles.campaignDetailText, { color: C.textSecondary }]} numberOfLines={1}>
                  {campaign.location}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.campaignChevronWrap}>
          <FontAwesome5 name="chevron-right" solid size={14} color={C.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

// Icon-headed section card — the public-detail visual system, now shared by both
// the owner and visitor views.
function InfoCard({
  title, icon, action, children, onLayout,
}: {
  title: string;
  icon: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  onLayout?: (y: number) => void;
}) {
  const C = useAppColors();
  return (
    <View
      style={[styles.infoCard, { backgroundColor: C.surface }]}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}>
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

export function BusinessProfileView({
  mode, vm, loading, error, isPrivate, onRetry, focusReviews, appliedCampaignIds,
}: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { updateUser } = useAuth();
  const { favoriteIds, toggle: toggleFavorite } = useFavoriteBusinesses();

  const isOwner = mode === 'owner';

  // ── Owner: cover / logo upload (local optimistic override) ──
  const [logoOverride, setLogoOverride]   = useState<string | null>(null);
  const [coverOverride, setCoverOverride] = useState<string | null>(null);
  const [logoUploading, setLogoUploading]   = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  async function handleLogoPress() {
    setLogoUploading(true);
    try {
      const result = await pickAndUpload('business-logo');
      if (result) { setLogoOverride(result.url); updateUser({ avatar: result.url }); }
    } catch (err) {
      logger.error('[business-profile] logo upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleCoverPress() {
    setCoverUploading(true);
    try {
      const result = await pickAndUpload('business-cover');
      if (result) setCoverOverride(result.url);
    } catch (err) {
      logger.error('[business-profile] cover upload failed', err);
      toast.error(err instanceof Error && err.message ? err.message : t('profile.uploadFailed'));
    } finally {
      setCoverUploading(false);
    }
  }

  // ── Visitor: conversation + report + message-request ──
  const [convId, setConvId]         = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<ConvStatus | null>(null);
  const [showMsgModal, setShowMsgModal]       = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const businessId = vm?.id ?? null;
  useEffect(() => {
    if (isOwner || !businessId || isPrivate) return;
    let cancelled = false;
    chatService.checkConversation(businessId)
      .then((conv) => { if (!cancelled && conv) { setConvId(conv.id); setConvStatus(conv.status); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOwner, businessId, isPrivate]);

  // ── Reviews: summary under the name, full list in a modal ──
  // A review_received deep-link (?focus=reviews) pops the modal open once the
  // profile (and its reviews) have landed.
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [handledReviewsDeepLink, setHandledReviewsDeepLink] = useState(false);
  // Open once, when the deep-link asks and the reviews have arrived — adjust
  // state during render (React docs pattern) rather than from an effect.
  if (focusReviews && !handledReviewsDeepLink && vm?.reviews?.length) {
    setHandledReviewsDeepLink(true);
    setReviewsOpen(true);
  }

  const edges: Edge[] = isOwner ? ['top'] : ['top', 'bottom'];
  const coverUri = coverOverride ?? vm?.coverImageUrl ?? null;
  const backTopBar = <BackButton variant="overlay" fallback="/(creator)/explore-businesses" />;

  // ── Loading / error / private (visitor only) ──
  if (!isOwner && loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
        <HeroCover coverUri={coverUri} topBar={backTopBar} />
        <View style={styles.center}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (!isOwner && error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
        <HeroCover coverUri={coverUri} topBar={backTopBar} />
        <ErrorState
          title={t('businessDetail.loadError')}
          message={t('businessDetail.loadErrorBody')}
          actionLabel={t('common.tryAgain')}
          onAction={onRetry}
        />
      </SafeAreaView>
    );
  }

  if (!vm) {
    // Owner first paint before the profile lands — render nothing (matches the
    // screen's previous behaviour) rather than a spinner.
    return <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges} />;
  }

  const logoUri = logoOverride ?? vm.logoUrl;

  if (!isOwner && isPrivate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
        <HeroCover coverUri={coverUri} topBar={backTopBar} />
        <MaxWidthContainer>
          <View style={[styles.profileCard, { backgroundColor: C.surface }]}>
            <View style={styles.avatarArea}>
              <BusinessAvatar name={vm.name} logoUrl={logoUri} />
            </View>
            <Text style={[styles.heroName, { color: C.text, textAlign: 'center' }]} numberOfLines={2}>{vm.name}</Text>
          </View>
          <EmptyState
            icon="lock"
            title={t('businessDetail.privateTitle')}
            subtitle={t('businessDetail.privateSubtitle')}
          />
        </MaxWidthContainer>
      </SafeAreaView>
    );
  }

  const isFavorited = favoriteIds.has(vm.id);

  async function handleToggleFavorite() {
    try {
      await toggleFavorite(vm!.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('businessDetail.updateError'));
    }
  }

  async function handleSendMessageRequest() {
    if (!vm?.userId) return;
    setSendingMsg(true);
    try {
      const conv = await chatService.sendMessageRequest(vm.userId, requestMsg.trim() || undefined);
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

  function openChat(id = convId, status = convStatus) {
    if (!id || !vm) return;
    router.push({
      pathname: '/(creator)/chat/[id]' as never,
      params: {
        id, name: vm.name, avatar: vm.logoUrl ?? '',
        status: status ?? 'ACCEPTED', participantId: vm.id, participantRole: 'BUSINESS',
      },
    } as never);
  }

  const catList = sortOtherLast(vm.categories);
  const showMsgBar = !isOwner && (convStatus === 'ACCEPTED' || convStatus === 'PENDING');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={edges}>
      <MaxWidthContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}>

        <HeroCover
          coverUri={coverUri}
          topBar={
            isOwner ? (
              <Pressable
                style={styles.topIconBtn}
                hitSlop={4}
                onPress={handleCoverPress}
                disabled={coverUploading}
                accessibilityRole="button"
                accessibilityLabel="Change cover photo">
                {coverUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome5 name="camera" solid size={18} color="#fff" />}
              </Pressable>
            ) : (
              <>
                <BackButton variant="overlay" fallback="/(creator)/explore-businesses" />
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={styles.topIconBtnLight}
                    hitSlop={10}
                    onPress={() => setShowReportModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('reportModal.title')}>
                    <FontAwesome5 name="flag" size={16} color="#9CA3AF" />
                  </Pressable>
                  <Pressable
                    style={styles.topIconBtnLight}
                    hitSlop={10}
                    onPress={handleToggleFavorite}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    accessibilityState={{ selected: isFavorited }}>
                    <FontAwesome5 name="heart" solid={isFavorited} size={18} color={isFavorited ? '#EF4444' : '#9CA3AF'} />
                  </Pressable>
                </View>
              </>
            )
          }
        />

        {/* ── Avatar card ── */}
        <View style={[styles.profileCard, { backgroundColor: C.surface }]}>
          <View style={styles.avatarArea}>
            {isOwner ? (
              <Pressable onPress={handleLogoPress} disabled={logoUploading} style={styles.avatarPressable}>
                <BusinessAvatar name={vm.name} logoUrl={logoUri} />
                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                      shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                    },
                  ]}
                >
                  {logoUploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <FontAwesome5 name="camera" solid size={13} color="#fff" />}
                </View>
              </Pressable>
            ) : (
              <BusinessAvatar name={vm.name} logoUrl={logoUri} />
            )}
          </View>

          <View style={styles.heroNameRow}>
            <Text style={[styles.heroName, { color: C.text, textAlign: 'center' }]} numberOfLines={2}>{vm.name}</Text>
            {vm.verified && <VerifiedBadge size={16} />}
          </View>
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
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.editBtn, { borderColor: C.brinjal1 }]}
                onPress={() => router.push('/(business)/edit-profile' as never)}>
                <FontAwesome5 name="edit" size={15} color={C.brinjal1} />
                <Text style={[styles.editBtnText, { color: C.brinjal1 }]}>{t('profile.editBusinessBtn')}</Text>
              </Pressable>
              <Pressable
                style={[styles.editBtn, { borderColor: C.brinjal1 }]}
                onPress={() => router.push('/(business)/analytics' as never)}>
                <FontAwesome5 name="chart-bar" size={15} color={C.brinjal1} />
                <Text style={[styles.editBtnText, { color: C.brinjal1 }]}>{t('analytics.headerTitle')}</Text>
              </Pressable>
            </View>
          )}

          {/* Stats strip */}
          <View style={[styles.statsStrip, { borderTopColor: C.border }]}>
            <StatItem
              value={vm.stats.activeCampaigns}
              label={t('businessDetail.statActive')}
              onPress={isOwner ? () => router.push('/(business)/campaigns' as never) : undefined}
            />
            <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
            <StatItem
              value={vm.stats.savedCreators}
              label={t('businessDetail.statSavedCreators')}
              onPress={isOwner ? () => router.push('/(business)/saved-creators' as never) : undefined}
            />
            <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
            <StatItem value={vm.stats.favoritedBy} label={t('businessDetail.statFavoritedBy')} />
          </View>
        </View>

        <View style={styles.body}>
          {/* About */}
          {vm.description ? (
            <InfoCard
              title={t('businessDetail.sectionAbout')}
              icon="file-alt"
              action={isOwner ? { label: t('common.edit'), onPress: () => router.push('/(business)/edit-profile' as never) } : undefined}>
              <SeeMoreText style={[styles.aboutText, { color: C.text }]} threshold={150}>
                {vm.description}
              </SeeMoreText>
            </InfoCard>
          ) : isOwner ? (
            <InfoCard title={t('businessDetail.sectionAbout')} icon="file-alt">
              <Pressable
                style={[styles.emptyField, { borderColor: C.border }]}
                onPress={() => router.push('/(business)/edit-profile' as never)}>
                <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addDescription')}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {/* Performance (visitor only) */}
          {!isOwner && vm.performance && (
            <InfoCard title={t('businessDetail.sectionPerformance')} icon="chart-bar">
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>{vm.performance.averageRatingGiven.toFixed(1)}</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.avgRatingGiven')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: C.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>{vm.performance.responseTimeAvgMins} min</Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.responseTime')}</Text>
                </View>
              </View>
            </InfoCard>
          )}

          {/* Contact (owner: email + phone) / hidden for a visitor when the
              business turned contact details off */}
          {isOwner ? (
            <InfoCard title={t('profile.contact')} icon="address-card">
              <View style={styles.cardList}>
                {vm.email ? (
                  <View style={[styles.contactRow, { backgroundColor: C.background, borderColor: C.border }]}>
                    <ContactBubble icon="envelope" />
                    <Text style={[styles.contactText, { color: C.text }]}>{vm.email}</Text>
                  </View>
                ) : null}
                {vm.phone ? (
                  <View style={[styles.contactRow, { backgroundColor: C.background, borderColor: C.border }]}>
                    <ContactBubble icon="phone" />
                    <Text style={[styles.contactText, { color: C.text }]}>{formatPhoneDisplay(vm.phone)}</Text>
                  </View>
                ) : null}
              </View>
            </InfoCard>
          ) : null}

          {/* Website */}
          {vm.website && (isOwner || vm.showContact) ? (
            <InfoCard
              title={t('businessDetail.sectionWebsite')}
              icon="globe"
              action={isOwner ? { label: t('common.edit'), onPress: () => router.push('/(business)/edit-profile' as never) } : undefined}>
              <Pressable
                style={[styles.contactRow, { backgroundColor: C.background, borderColor: C.border }]}
                onPress={() => Linking.openURL(vm.website!).catch(() => {})}>
                <ContactBubble icon="globe" />
                <Text style={[styles.contactText, { color: C.brinjal1, flex: 1 }]} numberOfLines={1}>
                  {vm.website.replace(/^https?:\/\//, '')}
                </Text>
                <FontAwesome5 name="external-link-alt" solid size={16} color={C.textSecondary} />
              </Pressable>
            </InfoCard>
          ) : isOwner ? (
            <InfoCard title={t('businessDetail.sectionWebsite')} icon="globe">
              <Pressable
                style={[styles.emptyField, { borderColor: C.border }]}
                onPress={() => router.push('/(business)/edit-profile' as never)}>
                <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addWebsite')}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {/* Phone (visitor only — owner phone lives in the Contact card) */}
          {!isOwner && vm.phone && vm.showContact ? (
            <InfoCard title={t('businessDetail.sectionPhone')} icon="phone">
              <Pressable
                style={[styles.contactRow, { backgroundColor: C.background, borderColor: C.border }]}
                onPress={() => Linking.openURL(`tel:${vm.phone}`).catch(() => {})}>
                <ContactBubble icon="phone" />
                <Text style={[styles.contactText, { color: C.brinjal1, flex: 1 }]} numberOfLines={1}>{vm.phone}</Text>
                <FontAwesome5 name="external-link-alt" solid size={16} color={C.textSecondary} />
              </Pressable>
            </InfoCard>
          ) : null}

          {/* Industries */}
          {catList.length > 0 ? (
            <InfoCard
              title={t('businessDetail.sectionIndustries')}
              icon="tag"
              action={isOwner ? { label: t('common.edit'), onPress: () => router.push('/(business)/edit-categories' as never) } : undefined}>
              <View style={styles.categoriesWrap}>
                {catList.map((cat) => (
                  <View key={cat} style={[styles.categoryChip, { backgroundColor: CATEGORY_BG[cat] ?? C.primaryLight }]}>
                    <Text style={[styles.categoryChipText, { color: C.text }]}>{cat}</Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          ) : isOwner ? (
            <InfoCard title={t('businessDetail.sectionIndustries')} icon="tag">
              <Pressable
                style={[styles.emptyField, { borderColor: C.border }]}
                onPress={() => router.push('/(business)/edit-categories' as never)}>
                <Text style={[styles.emptyFieldText, { color: C.textSecondary }]}>{t('profile.addCategories')}</Text>
              </Pressable>
            </InfoCard>
          ) : null}

          {/* Reviews — the average + count sit under the name (see
              <ProfileRatingRow> above); tapping "N reviews" opens
              <ReviewsModal> with the full, lazily-loaded list. */}

          {/* Active events (visitor only) */}
          {!isOwner && (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />
              <View style={styles.campaignsSection}>
                <View style={styles.campaignsSectionHeader}>
                  <Text style={[styles.campaignsSectionTitle, { color: C.text }]}>{t('businessDetail.activeEvents')}</Text>
                  <View style={[styles.countBadge, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.countBadgeText, { color: C.brinjal1 }]}>{vm.campaigns.length}</Text>
                  </View>
                </View>
                {vm.campaigns.length === 0 ? (
                  <View style={[styles.noCampaigns, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <FontAwesome5 name="envelope-open" solid size={36} color={C.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={[styles.noCampaignsTitle, { color: C.text }]}>{t('businessDetail.noActiveEvents')}</Text>
                    <Text style={[styles.noCampaignsSub, { color: C.textSecondary }]}>{t('businessDetail.noActiveEventsSub')}</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {vm.campaigns.map((c) => (
                      <CampaignCard key={c.id} campaign={c} isApplied={appliedCampaignIds?.has(c.id) ?? false} />
                    ))}
                  </View>
                )}
              </View>
            </>
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
              <Text style={styles.msgBtnText}>{t('businessDetail.openChat')}</Text>
            </Pressable>
          ) : (
            <View style={[styles.msgBtn, { backgroundColor: C.border }]}>
              <Text style={[styles.msgBtnText, { color: '#fff' }]}>{t('businessDetail.requestSent')}</Text>
            </View>
          )}
        </View>
      )}
      </MaxWidthContainer>

      {!isOwner && (
        <>
          <BottomSheet
            visible={showMsgModal}
            onClose={() => setShowMsgModal(false)}
            title={t('businessDetail.messageRequestTitle')}
            subtitle={t('businessDetail.messageRequestSubtitle', { name: vm.name })}
            footer={
              <Pressable
                style={[
                  styles.modalSendBtn,
                  {
                    backgroundColor: sendingMsg ? C.border : C.brinjal1, shadowColor: C.brinjal1,
                    shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                  },
                ]}
                onPress={handleSendMessageRequest}
                disabled={sendingMsg}>
                <Text style={styles.modalSendText}>{sendingMsg ? t('businessDetail.sendingLabel') : t('businessDetail.sendRequestBtn')}</Text>
              </Pressable>
            }>
            <TextInputWithLabel
              label="Message"
              value={requestMsg}
              onChangeText={setRequestMsg}
              placeholder={t('businessDetail.messageRequestPlaceholder')}
              multiline
              maxLength={500}
            />
            <Text style={[styles.modalCounter, { color: C.textSecondary }]}>{requestMsg.length}/500</Text>
          </BottomSheet>

          <ReportModal
            visible={showReportModal}
            onClose={() => setShowReportModal(false)}
            targetType="BUSINESS"
            targetId={vm.userId ?? vm.id}
          />
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

function ContactBubble({ icon }: { icon: string }) {
  const C = useAppColors();
  return (
    <View
      style={[
        styles.platformBubble,
        {
          backgroundColor: C.brinjal1 + '18', shadowColor: C.brinjal1,
          shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
        },
      ]}
    >
      <FontAwesome5 name={icon as any} solid size={16} color={C.brinjal1} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero cover
  cover:          { height: 180, overflow: 'hidden' },
  bubble:         { position: 'absolute', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  bubble1:        { width: 160, height: 160, top: -50, right: -30 },
  bubble2:        { width: 100, height: 100, bottom: -20, left: 30 },
  bubble3:        { width: 60,  height: 60,  top: 20,   left: -20  },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md },
  topIconBtn:     { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  topIconBtnLight:{ width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOW.card },

  // Avatar card
  profileCard:    { marginHorizontal: SCREEN_GUTTER, marginTop: -60, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: 6, ...SHADOW.floating },
  avatarArea:     { marginTop: -50, marginBottom: 6, alignItems: 'center', alignSelf: 'center' },
  avatarPressable:{ position: 'relative', alignItems: 'center', justifyContent: 'center' },
  cameraBadge:    { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: RADIUS.full,
                    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  heroNameRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  heroName:       { fontSize: 22, lineHeight: 33, fontFamily: F.bold, flexShrink: 1 },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, maxWidth: '100%' },
  location:       { fontSize: 13, fontFamily: F.regular, flexShrink: 1 },

  actionRow:      { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40,
                    borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText:    { fontSize: 13, fontFamily: F.bold },

  statsStrip:     { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  heroStat:       { flex: 1, minWidth: 0, alignItems: 'center' },
  heroStatValue:  { fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  heroStatLabel:  { fontSize: 10, textTransform: 'uppercase', marginTop: 1, fontFamily: F.semibold, textAlign: 'center' },
  heroStatDivider:{ width: 1, height: 28, flexShrink: 0 },

  body:           { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, gap: 12 },

  // Info card
  infoCard:       { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 12, ...SHADOW.card },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIconBox:    { width: 32, height: 32, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  infoCardTitle:  { fontSize: 14, fontFamily: F.bold },
  infoCardAction: { marginLeft: 'auto' },
  infoCardActionText: { fontSize: 13, fontFamily: F.bold },
  aboutText:      { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  // Performance
  statsRow:       { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem:       { flex: 1, gap: 2 },
  statValue:      { fontSize: 16, fontFamily: F.bold },
  statLabel:      { fontSize: 11, fontFamily: F.medium },
  statDivider:    { width: 1, height: 30 },

  // Contact / website rows
  cardList:       { gap: 10 },
  contactRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, padding: 12, borderWidth: 1 },
  platformBubble: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  contactText:    { fontSize: 14, fontFamily: F.medium },

  // Empty field prompt
  emptyField:     { borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  emptyFieldText: { fontSize: 13, fontFamily: F.medium },

  // Industry chips
  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText:{ fontSize: 12, fontFamily: F.bold },

  // Active events
  sectionDivider:        { height: 1, marginVertical: 4 },
  campaignsSection:      { gap: 12 },
  campaignsSectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  campaignsSectionTitle: { fontSize: 17, fontFamily: F.bold },
  countBadge:            { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText:        { fontSize: 13, fontFamily: F.bold },
  noCampaigns:           { borderRadius: RADIUS.lg, borderWidth: 1, padding: 32, alignItems: 'center', gap: 4 },
  noCampaignsTitle:      { fontSize: 16, fontFamily: F.bold },
  noCampaignsSub:        { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },

  campaignCardWrap:      { borderRadius: RADIUS.lg, ...SHADOW.raised },
  campaignCard:          { flexDirection: 'row', borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  campaignThumb:         { width: 96, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' },
  campaignThumbIcon:     { opacity: 0.35 },
  featuredRibbon:        { position: 'absolute', top: 8, left: 8, borderRadius: RADIUS.sm, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  campaignBody:          { flex: 1, padding: 12, gap: 6, minWidth: 0 },
  campaignTitle:         { fontSize: 14.5, lineHeight: 22, letterSpacing: -0.2, fontFamily: F.bold },
  campaignBudget:        { fontSize: 14, fontFamily: F.bold, flexShrink: 1, minWidth: 0 },
  campaignBudgetWrap:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  campaignAmountRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  campaignDaysLeftWrap:  { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  campaignMetaRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  campaignMetaLine:      { fontSize: 11.5, fontFamily: F.regular, flexShrink: 1 },
  campaignDetailsRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, paddingTop: 6, marginTop: 2 },
  campaignDetailItem:    { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  campaignDetailText:    { fontSize: 11, fontFamily: F.regular, flexShrink: 1 },
  campaignChevronWrap:   { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  campaignTagBadge:      { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  campaignTagBadgeText:  { fontSize: 11, fontFamily: F.bold },

  // Sticky message bar
  msgBar:         { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderTopWidth: 1 },
  msgBtn:         { borderRadius: RADIUS.full, height: 52, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  msgBtnText:     { color: '#fff', fontSize: 16, fontFamily: F.bold },

  // Request modal
  modalCounter:   { fontSize: 11, textAlign: 'right', marginTop: -6, fontFamily: F.regular },
  modalSendBtn:   { borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  modalSendText:  { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
