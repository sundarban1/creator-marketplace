import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ReviewsList } from '@/components/ReviewsList';
import { ReportModal } from '@/components/ReportModal';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { businessService, type BusinessDetailResult, type BusinessActiveCampaign } from '@/services/business';
import { campaignService } from '@/services/campaign';
import { chatService } from '@/services/chat';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { useToast } from '@/components/Toast';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { logger } from '@/utilities/logger';

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

function BusinessAvatar({ name, logoUrl, size = 88 }: { name: string; logoUrl: string | null; size?: number }) {
  const C = useAppColors();
  const letter = (name?.[0] ?? '?').toUpperCase();
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#fff' }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: C.brinjal1 }}>{letter}</Text>
    </View>
  );
}

function CampaignCard({ campaign, isApplied }: { campaign: BusinessActiveCampaign; isApplied: boolean }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories } = useAllCategories();
  const catMeta = getCategoryMeta(categories, campaign.category);
  const catBg = CATEGORY_BG[campaign.category] ?? '#F2F0DC';
  const deadline = daysLeft(campaign.deadline);

  function goToDetail() {
    router.push({ pathname: '/campaign-detail', params: { campaignId: campaign.id } } as never);
  }

  return (
    <Pressable
      style={[styles.campaignCard, { backgroundColor: C.surface }]}
      onPress={goToDetail}>

      {/* Category thumbnail */}
      <View style={[styles.campaignThumb, { backgroundColor: catBg }]}>
        <FontAwesome5 name={catMeta.icon as any} size={32} color={catMeta.color} />
        {campaign.isFeatured && (
          <View style={styles.featuredDot}>
            <FontAwesome5 name="star" size={9} color="#fff" solid />
          </View>
        )}
      </View>

      <View style={styles.campaignBody}>
        <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
        <Text style={[styles.campaignMeta, { color: C.textSecondary }]}>
          {campaign.category} · {campaign.contentType}
        </Text>
        <View style={styles.campaignFooter}>
          <Text style={[styles.campaignBudget, { color: C.brinjal1 }]}>
            Rs {campaign.budgetMin.toLocaleString()}–{campaign.budgetMax.toLocaleString()}
          </Text>
          <View style={[styles.deadlinePill, { backgroundColor: deadline.urgent ? '#FEF2F2' : C.primaryLight, borderColor: deadline.urgent ? '#FECACA' : 'transparent', borderWidth: 1 }]}>
            <Text style={[styles.deadlineText, { color: deadline.urgent ? '#DC2626' : C.brinjal1 }]}>{deadline.text}</Text>
          </View>
        </View>
        {(campaign.locationType === 'REMOTE' || campaign.location) && (
          <View style={styles.locationRow}>
            <FontAwesome5 name={campaign.locationType === 'REMOTE' ? 'globe' : 'map-marker-alt'} solid size={11} color={C.textSecondary} />
            <Text style={[styles.campaignLocation, { color: C.textSecondary }]}>
              {campaign.locationType === 'REMOTE' ? t('createEvent.locationRemote') : campaign.location}
            </Text>
          </View>
        )}

        {/* Apply / Applied status */}
        {isApplied ? (
          <View style={styles.appliedPill}>
            <FontAwesome5 name="check-circle" solid size={13} color="#059669" />
            <Text style={styles.appliedPillText}>{t('businessDetail.applied')}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.applyNowBtn, { backgroundColor: C.brinjal1 }]}
            hitSlop={8}
            onPress={(e) => { e.stopPropagation(); goToDetail(); }}>
            <Text style={styles.applyNowBtnText}>{t('businessDetail.applyNow')}</Text>
            <FontAwesome5 name="arrow-right" solid size={12} color="#fff" />
          </Pressable>
        )}
      </View>

      <View style={styles.campaignRight}>
        <FontAwesome5 name="chevron-right" solid size={18} color={C.border} />
      </View>
    </Pressable>
  );
}

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();
  const { favoriteIds, toggle } = useFavoriteBusinesses();
  const [business, setBusiness] = useState<BusinessDetailResult | null>(null);
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(true);
  const [hasError, setHasError] = useState(false);

  // Message request state
  const [convId, setConvId]         = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED' | null>(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [requestMsg, setRequestMsg]     = useState('');
  const [sendingMsg, setSendingMsg]     = useState(false);

  function loadBusiness() {
    if (!id) return;
    setLoading(true);
    setHasError(false);
    Promise.all([
      businessService.getBusinessById(id),
      campaignService.getMyApplications().then((r) => r.proposals).catch(() => []),
    ])
      .then(([biz, applications]) => {
        setBusiness(biz);
        setAppliedCampaignIds(new Set(applications.map((a) => a.campaignId)));
        if (!biz.isPrivate) {
          chatService.checkConversation(biz.id).then((conv) => {
            if (conv) { setConvId(conv.id); setConvStatus(conv.status); }
          }).catch(() => {});
        }
      })
      // Raw error text (AxiosError message, "Network request failed", etc.) never
      // reaches the user — logger.error ships it to Sentry, the screen shows a
      // sanitized, translated sentence instead.
      .catch((e) => { logger.error('[business-detail] load failed', e); setHasError(true); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBusiness();
  }, [id]);

  async function handleSendMessageRequest() {
    if (!business || business.isPrivate) return;
    setSendingMsg(true);
    try {
      const conv = await chatService.sendMessageRequest(business.userId, requestMsg.trim() || undefined);
      setConvId(conv.id);
      setConvStatus(conv.status);
      setShowMsgModal(false);
      setRequestMsg('');
      // Outer-stack chat route (sibling of this screen), not the Messages
      // tab's nested one — this screen itself is reached from outside the
      // tabs stack (e.g. tapping an avatar inside a chat conversation), so
      // pushing back into the tabs-nested route here would leave a broken
      // back stack (same reasoning as activity-timeline.tsx's openChat).
      if (conv.status === 'ACCEPTED') {
        router.push({
          pathname: '/(creator)/chat/[id]' as never,
          params: { id: conv.id, name: business.businessName, avatar: business.logoUrl ?? '', status: conv.status, participantId: business.id, participantRole: 'BUSINESS' },
        } as never);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('businessDetail.sendMessageError'));
    } finally {
      setSendingMsg(false);
    }
  }

  function openChat() {
    if (!convId || !business || business.isPrivate) return;
    router.push({
      pathname: '/(creator)/chat/[id]' as never,
      params: { id: convId, name: business.businessName, avatar: business.logoUrl ?? '', status: convStatus ?? 'ACCEPTED', participantId: business.id, participantRole: 'BUSINESS' },
    } as never);
  }

  const NavBar = ({ title }: { title?: string }) => (
    <PageHeader title={title ?? ''} backFallback="/(creator)/explore-businesses" />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <NavBar />
        <View style={styles.center}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <NavBar />
        <ErrorState title={t('businessDetail.loadError')} message={t('businessDetail.loadErrorBody')} actionLabel={t('common.tryAgain')} onAction={loadBusiness} />
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <NavBar />
        <EmptyState faIcon="exclamation-triangle" title={t('businessDetail.loadError')} subtitle={t('common.notFound')} action={{ label: t('businessDetail.goBack'), onPress: () => router.back() }} />
      </SafeAreaView>
    );
  }

  if (business.isPrivate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={styles.cover}>
          <LinearGradient
            colors={['#7C3AED', '#EC4899', '#F97316']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}>
            <View style={[styles.bubble, styles.bubble1]} />
            <View style={[styles.bubble, styles.bubble2]} />
            <View style={[styles.bubble, styles.bubble3]} />
          </LinearGradient>
          <View style={styles.topBar}>
            <BackButton variant="overlay" fallback="/(creator)/explore-businesses" />
            <View style={styles.topTitleRow} />
            <View style={styles.topIconSpacer} />
          </View>
        </View>
        <MaxWidthContainer>
        <View style={[styles.profileCard, { backgroundColor: C.surface }]}>
          <View style={styles.avatarArea}>
            <BusinessAvatar name={business.businessName} logoUrl={business.logoUrl} size={96} />
          </View>
          <Text style={[styles.heroName, { color: C.text, textAlign: 'center' }]} numberOfLines={2}>{business.businessName}</Text>
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

  const isFavorited = id ? favoriteIds.has(id) : false;

  async function handleToggleFavorite() {
    if (!id) return;
    try {
      await toggle(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('businessDetail.updateError'));
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero Cover ── */}
        <View style={styles.cover}>
          <LinearGradient
            colors={['#7C3AED', '#EC4899', '#F97316']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}>
            <View style={[styles.bubble, styles.bubble1]} />
            <View style={[styles.bubble, styles.bubble2]} />
            <View style={[styles.bubble, styles.bubble3]} />
          </LinearGradient>
          <View style={styles.topBar}>
            <BackButton variant="overlay" fallback="/(creator)/explore-businesses" />
            <View style={styles.topTitleRow} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={styles.topIconBtn}
                hitSlop={10}
                onPress={() => setShowReportModal(true)}
                accessibilityRole="button"
                accessibilityLabel={t('reportModal.title')}>
                <FontAwesome5 name="flag" size={16} color="#9CA3AF" />
              </Pressable>
              <Pressable
                style={styles.topIconBtn}
                hitSlop={10}
                onPress={handleToggleFavorite}
                accessibilityRole="button"
                accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                accessibilityState={{ selected: isFavorited }}>
                <FontAwesome5
                  name="heart"
                  solid={isFavorited}
                  size={18}
                  color={isFavorited ? '#EF4444' : '#9CA3AF'}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Avatar card (overlaps cover) ── */}
        <View style={[styles.profileCard, { backgroundColor: C.surface }]}>
          <View style={styles.avatarArea}>
            <BusinessAvatar name={business.businessName} logoUrl={business.logoUrl} size={96} />
          </View>
          <View style={styles.heroNameRow}>
            <Text style={[styles.heroName, { color: C.text, textAlign: 'center' }]} numberOfLines={2}>{business.businessName}</Text>
            {(business.fullyVerified || business.isVerified) && <VerifiedBadge size={16} />}
          </View>

          <View style={[styles.statsStrip, { borderTopColor: C.border }]}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: C.text }]}>{business._count.campaigns}</Text>
              <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{t('businessDetail.statActive')}</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: C.text }]}>{business.savedCreatorsCount}</Text>
              <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{t('businessDetail.statSavedCreators')}</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: C.text }]}>{business.favoritedByCount}</Text>
              <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{t('businessDetail.statFavoritedBy')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Description */}
          {business.description ? (
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
                  <FontAwesome5 name="file-alt" solid size={16} color={C.brinjal1} />
                </View>
                <Text style={[styles.infoCardTitle, { color: C.text }]}>{t('businessDetail.sectionAbout')}</Text>
              </View>
              <Text style={[styles.aboutText, { color: C.text }]}>{business.description}</Text>
            </View>
          ) : null}

          {/* Performance stats */}
          {business.stats && (
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
                  <FontAwesome5 name="chart-bar" size={15} color={C.brinjal1} />
                </View>
                <Text style={[styles.infoCardTitle, { color: C.text }]}>{t('businessDetail.sectionPerformance')}</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>
                    {business.stats.averageRatingGiven.toFixed(1)}
                  </Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.avgRatingGiven')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: C.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: C.text }]}>
                    {business.stats.responseTimeAvgMins} min
                  </Text>
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('analytics.responseTime')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Reviews (§36) — from providers who worked with this business */}
          {!!business.reviews?.length && (
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
                  <FontAwesome5 name="star" solid size={15} color={C.brinjal1} />
                </View>
                <Text style={[styles.infoCardTitle, { color: C.text }]}>{t('businessDetail.sectionReviews')}</Text>
              </View>
              <ReviewsList reviews={business.reviews} />
            </View>
          )}

          {/* Website — hidden when business has hideContactDetails on */}
          {business.website && !business.hideContactDetails ? (
            <Pressable
              style={[styles.websiteCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => Linking.openURL(business.website!)}>
              <View
                style={[
                  styles.websiteIconBox,
                  {
                    backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
                    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                  },
                ]}
              >
                <FontAwesome5 name="globe" solid size={20} color={C.brinjal1} />
              </View>
              <View style={styles.websiteText}>
                <Text style={[styles.websiteLabel, { color: C.textSecondary }]}>{t('businessDetail.sectionWebsite')}</Text>
                <Text style={[styles.websiteUrl, { color: C.brinjal1 }]} numberOfLines={1}>
                  {business.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
              <FontAwesome5 name="external-link-alt" solid size={18} color={C.textSecondary} />
            </Pressable>
          ) : null}

          {/* Phone — hidden when business has hideContactDetails on */}
          {business.phone && !business.hideContactDetails ? (
            <Pressable
              style={[styles.websiteCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => Linking.openURL(`tel:${business.phone}`)}>
              <View
                style={[
                  styles.websiteIconBox,
                  {
                    backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
                    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                  },
                ]}
              >
                <FontAwesome5 name="phone" solid size={18} color={C.brinjal1} />
              </View>
              <View style={styles.websiteText}>
                <Text style={[styles.websiteLabel, { color: C.textSecondary }]}>{t('businessDetail.sectionPhone')}</Text>
                <Text style={[styles.websiteUrl, { color: C.brinjal1 }]} numberOfLines={1}>{business.phone}</Text>
              </View>
              <FontAwesome5 name="external-link-alt" solid size={18} color={C.textSecondary} />
            </Pressable>
          ) : null}

          {/* Sectors / Categories */}
          {business.categories.length > 0 && (
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
                  <FontAwesome5 name="tag" solid size={15} color={C.brinjal1} />
                </View>
                <Text style={[styles.infoCardTitle, { color: C.text }]}>{t('businessDetail.sectionIndustries')}</Text>
              </View>
              <View style={styles.categoriesWrap}>
                {business.categories.map((cat) => (
                  <View key={cat} style={[styles.categoryChip, { backgroundColor: CATEGORY_BG[cat] ?? C.primaryLight }]}>
                    <Text style={[styles.categoryChipText, { color: C.text }]}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

          {/* Active Campaigns */}
          <View style={styles.campaignsSection}>
            <View style={styles.campaignsSectionHeader}>
              <Text style={[styles.campaignsSectionTitle, { color: C.text }]}>{t('businessDetail.activeEvents')}</Text>
              <View style={[styles.countBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: C.brinjal1 }]}>{business.campaigns.length}</Text>
              </View>
            </View>

            {business.campaigns.length === 0 ? (
              <View style={[styles.noCampaigns, { backgroundColor: C.surface, borderColor: C.border }]}>
                <FontAwesome5 name="envelope-open" solid size={36} color={C.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={[styles.noCampaignsTitle, { color: C.text }]}>{t('businessDetail.noActiveEvents')}</Text>
                <Text style={[styles.noCampaignsSub, { color: C.textSecondary }]}>{t('businessDetail.noActiveEventsSub')}</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {business.campaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    isApplied={appliedCampaignIds.has(c.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky message bar */}
      <View style={[styles.msgBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        {convStatus === 'ACCEPTED' ? (
          <Pressable style={[
              styles.msgBtn,
              {
                backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
              },
            ]} onPress={openChat}>
            <FontAwesome5 name="comment-dots" size={16} color="#fff" solid />
            <Text style={styles.msgBtnText}>{t('businessDetail.openChat')}</Text>
          </Pressable>
        ) : convStatus === 'PENDING' ? (
          <View style={[styles.msgBtn, { backgroundColor: C.border }]}>
            <Text style={[styles.msgBtnText, { color: '#fff' }]}>{t('businessDetail.requestSent')}</Text>
          </View>
        ) : (
          <Pressable style={[
              styles.msgBtn,
              {
                backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
              },
            ]} onPress={() => setShowMsgModal(true)}>
            <Text style={styles.msgBtnText}>{t('businessDetail.sendMessage')}</Text>
          </Pressable>
        )}
      </View>
      </MaxWidthContainer>

      {/* Request message modal */}
      <BottomSheet
        visible={showMsgModal}
        onClose={() => setShowMsgModal(false)}
        title={t('businessDetail.messageRequestTitle')}
        subtitle={t('businessDetail.messageRequestSubtitle', { name: business.businessName })}
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
        targetId={business.userId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1 },
  center:                { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero cover
  cover:                 { height: 180, overflow: 'hidden' },
  bubble:                { position: 'absolute', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  bubble1:               { width: 160, height: 160, top: -50, right: -30 },
  bubble2:               { width: 100, height: 100, bottom: -20, left: 30 },
  bubble3:               { width: 60,  height: 60,  top: 20,   left: -20  },
  topBar:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md },
  topTitleRow:           { flex: 1, marginHorizontal: 8 },
  topIconBtn:            { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', ...SHADOW.card },
  topIconSpacer:         { width: 38, height: 38 },

  // Avatar card (floats over cover)
  profileCard:           { marginHorizontal: SCREEN_GUTTER, marginTop: -60, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: 6, ...SHADOW.floating },
  avatarArea:            { marginTop: -50, marginBottom: 6, alignItems: 'center', alignSelf: 'center' },

  heroNameRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  heroName:              { fontSize: 22, lineHeight: 33, fontFamily: F.bold, flexShrink: 1 },
  statsStrip:            { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  heroStat:              { flex: 1, minWidth: 0, alignItems: 'center' },
  heroStatValue:         { fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  heroStatLabel:         { fontSize: 10, textTransform: 'uppercase', marginTop: 1, fontFamily: F.semibold, textAlign: 'center' },
  heroStatDivider:       { width: 1, height: 28, flexShrink: 0 },

  body:                  { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, gap: 12 },
  infoCard:              { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 12 },
  infoCardHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIconBox:           { width: 32, height: 32, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  infoCardTitle:         { fontSize: 14, fontFamily: F.bold },
  aboutText:             { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  statsRow:              { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem:              { flex: 1, gap: 2 },
  statValue:             { fontSize: 16, fontFamily: F.bold },
  statLabel:             { fontSize: 11, fontFamily: F.medium },
  statDivider:           { width: 1, height: 30 },

  websiteCard:           { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 12, borderWidth: 1 },
  websiteIconBox:        { width: 44, height: 44, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  websiteText:           { flex: 1 },
  websiteLabel:          { fontSize: 10, textTransform: 'uppercase', marginBottom: 2, fontFamily: F.bold },
  websiteUrl:            { fontSize: 13, fontFamily: F.semibold },

  categoriesWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:          { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText:      { fontSize: 12, fontFamily: F.bold },

  sectionDivider:        { height: 1, marginVertical: 4 },
  campaignsSection:      { gap: 12 },
  campaignsSectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  campaignsSectionTitle: { fontSize: 17, fontFamily: F.bold },
  countBadge:            { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText:        { fontSize: 13, fontFamily: F.bold },

  noCampaigns:           { borderRadius: RADIUS.lg, borderWidth: 1, padding: 32, alignItems: 'center', gap: 4 },
  noCampaignsTitle:      { fontSize: 16, fontFamily: F.bold },
  noCampaignsSub:        { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },

  campaignCard:          { flexDirection: 'row', borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.card },
  campaignThumb:         { width: 72, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  featuredDot:           { position: 'absolute', top: 6, right: 4, backgroundColor: '#F59E0B', borderRadius: RADIUS.full, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  campaignBody:          { flex: 1, padding: 10, gap: 3 },
  campaignTitle:         { fontSize: 14, lineHeight: 21, fontFamily: F.bold },
  campaignMeta:          { fontSize: 11, marginTop: 0, fontFamily: F.regular },
  campaignFooter:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  campaignBudget:        { fontSize: 13, fontFamily: F.bold },
  deadlinePill:          { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  deadlineText:          { fontSize: 11, fontFamily: F.bold },
  locationRow:           { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  campaignLocation:      { fontSize: 11, fontFamily: F.regular },
  campaignRight:         { paddingVertical: 10, paddingRight: 12, alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 },

  appliedPill:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2 },
  appliedPillText:       { fontSize: 11, color: '#059669', fontFamily: F.bold },
  applyNowBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 2 },
  applyNowBtnText:       { fontSize: 11, color: '#fff', fontFamily: F.bold },

  // Sticky message bar
  msgBar:                { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderTopWidth: 1 },
  msgBtn:                { borderRadius: RADIUS.full, height: 52, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  msgBtnText:            { color: '#fff', fontSize: 16, fontFamily: F.bold },

  // Request modal
  modalCounter:          { fontSize: 11, textAlign: 'right', marginTop: -6, fontFamily: F.regular },
  modalSendBtn:          { borderRadius: RADIUS.full, height: 52, justifyContent: 'center', alignItems: 'center' },
  modalSendText:         { color: '#fff', fontSize: 16, fontFamily: F.bold },
});
