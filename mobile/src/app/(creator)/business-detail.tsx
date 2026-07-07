import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { EmptyState } from '@/components/EmptyState';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { businessService, type BusinessDetailResult, type BusinessActiveCampaign } from '@/services/business';
import { campaignService } from '@/services/campaign';
import { chatService } from '@/services/chat';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useToast } from '@/components/Toast';
import { F } from '@/utilities/constants';

const PLATFORM_ICON: Record<string, { iconName: string; color: string }> = {
  Instagram: { iconName: 'instagram', color: '#E1306C' },
  TikTok:    { iconName: 'tiktok',    color: '#010101' },
  YouTube:   { iconName: 'youtube',   color: '#FF0000' },
  Facebook:  { iconName: 'facebook',  color: '#1877F2' },
  Twitter:   { iconName: 'twitter',   color: '#1DA1F2' },
  LinkedIn:  { iconName: 'linkedin',  color: '#0A66C2' },
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
  const platformIcon = PLATFORM_ICON[campaign.platform] ?? { iconName: 'mobile-alt', color: '#888' };
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
        <FontAwesome5 name={platformIcon.iconName as any} size={32} color={platformIcon.color} />
        {campaign.isFeatured && (
          <View style={styles.featuredDot}>
            <Text style={styles.featuredDotText}>⭐</Text>
          </View>
        )}
      </View>

      <View style={styles.campaignBody}>
        <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={2}>{campaign.title}</Text>
        <Text style={[styles.campaignMeta, { color: C.textSecondary }]}>
          {campaign.platform} · {campaign.category} · {campaign.contentType}
        </Text>
        <View style={styles.campaignFooter}>
          <Text style={[styles.campaignBudget, { color: C.brinjal1 }]}>
            Rs {campaign.budgetMin.toLocaleString()}–{campaign.budgetMax.toLocaleString()}
          </Text>
          <View style={[styles.deadlinePill, { backgroundColor: deadline.urgent ? '#FEF2F2' : C.primaryLight, borderColor: deadline.urgent ? '#FECACA' : 'transparent', borderWidth: 1 }]}>
            <Text style={[styles.deadlineText, { color: deadline.urgent ? '#DC2626' : C.brinjal1 }]}>{deadline.text}</Text>
          </View>
        </View>
        {campaign.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={11} color={C.textSecondary} />
            <Text style={[styles.campaignLocation, { color: C.textSecondary }]}>{campaign.location}</Text>
          </View>
        )}

        {/* Apply / Applied status */}
        {isApplied ? (
          <View style={styles.appliedPill}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
            <Text style={styles.appliedPillText}>{t('businessDetail.applied')}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.applyNowBtn, { backgroundColor: C.brinjal1 }]}
            onPress={(e) => { e.stopPropagation(); goToDetail(); }}>
            <Text style={styles.applyNowBtnText}>{t('businessDetail.applyNow')}</Text>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </Pressable>
        )}
      </View>

      <View style={styles.campaignRight}>
        <Ionicons name="chevron-forward" size={18} color={C.border} />
        <Text style={[styles.appliedCount, { color: C.textSecondary }]}>{campaign._count.applications}</Text>
        <Text style={[styles.appliedLabel, { color: C.textSecondary }]}>{t('businessDetail.appliedCount')}</Text>
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
  const [error, setError]       = useState('');

  // Message request state
  const [convId, setConvId]         = useState<string | null>(null);
  const [convStatus, setConvStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED' | null>(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [requestMsg, setRequestMsg]     = useState('');
  const [sendingMsg, setSendingMsg]     = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      businessService.getBusinessById(id),
      campaignService.getMyApplications().catch(() => []),
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
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSendMessageRequest() {
    if (!business || business.isPrivate) return;
    setSendingMsg(true);
    try {
      const conv = await chatService.sendMessageRequest(business.userId, requestMsg.trim() || undefined, undefined, 'CREATOR');
      setConvId(conv.id);
      setConvStatus(conv.status);
      setShowMsgModal(false);
      setRequestMsg('');
      if (conv.status === 'ACCEPTED') {
        router.push({
          pathname: '/(creator)/messages/[id]' as never,
          params: { id: conv.id, name: business.businessName, status: conv.status },
        } as never);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send message. Please try again.');
    } finally {
      setSendingMsg(false);
    }
  }

  function openChat() {
    if (!convId || !business || business.isPrivate) return;
    router.push({
      pathname: '/(creator)/messages/[id]' as never,
      params: { id: convId, name: business.businessName, status: convStatus ?? 'ACCEPTED' },
    } as never);
  }

  const NavBar = ({ title }: { title?: string }) => (
    <View style={[styles.navBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
      <BackButton fallback="/(creator)/explore-businesses" />
      {title ? <Text style={[styles.navTitle, { color: C.text }]} numberOfLines={1}>{title}</Text> : <View style={{ flex: 1 }} />}
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <NavBar />
        <View style={styles.center}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <NavBar />
        <EmptyState emoji="⚠️" title={t('businessDetail.loadError')} subtitle={error || t('common.notFound')} action={{ label: t('businessDetail.goBack'), onPress: () => router.back() }} />
      </SafeAreaView>
    );
  }

  if (business.isPrivate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[styles.navBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <BackButton fallback="/(creator)/explore-businesses" />
          <Text style={[styles.navTitle, { color: C.text }]} numberOfLines={1}>{business.businessName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.hero, { backgroundColor: C.primaryLight }]}>
          <View style={[styles.heroInner, { justifyContent: 'center' }]}>
            <BusinessAvatar name={business.businessName} logoUrl={business.logoUrl} size={88} />
            <Text style={[styles.heroName, { color: C.text, marginTop: 10 }]} numberOfLines={2}>{business.businessName}</Text>
          </View>
        </View>
        <EmptyState
          icon="lock-closed-outline"
          title={t('businessDetail.privateTitle')}
          subtitle={t('businessDetail.privateSubtitle')}
        />
      </SafeAreaView>
    );
  }

  const joinedYear = new Date(business.createdAt).getFullYear();

  const isFavorited = id ? favoriteIds.has(id) : false;

  async function handleToggleFavorite() {
    if (!id) return;
    try {
      await toggle(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update. Please try again.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      {/* Floating nav bar */}
      <View style={[styles.navBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton fallback="/(creator)/explore-businesses" />
        <Text style={[styles.navTitle, { color: C.text }]} numberOfLines={1}>{business.businessName}</Text>
        <Pressable style={styles.navActionBtn} onPress={handleToggleFavorite} hitSlop={10}>
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorited ? '#EF4444' : C.textSecondary}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero ── */}
        <View style={[styles.hero, { backgroundColor: C.primaryLight }]}>
          <View style={styles.heroInner}>
            <BusinessAvatar name={business.businessName} logoUrl={business.logoUrl} size={88} />
            <View style={styles.heroMeta}>
              <View style={styles.heroNameRow}>
                <Text style={[styles.heroName, { color: C.text }]} numberOfLines={2}>{business.businessName}</Text>
              </View>
              {business.isVerified && (
                <View style={[styles.verifiedRow, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#388E3C" />
                  <Text style={[styles.verifiedText, { color: '#388E3C' }]}>{t('businessDetail.verifiedBusiness')}</Text>
                </View>
              )}
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: C.brinjal1 }]}>{business._count.campaigns}</Text>
                  <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{t('businessDetail.statActive')}</Text>
                </View>
                <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { color: C.brinjal1 }]}>{joinedYear}</Text>
                  <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{t('businessDetail.statJoined')}</Text>
                </View>
                {business.categories.length > 0 && (
                  <>
                    <View style={[styles.heroStatDivider, { backgroundColor: C.border }]} />
                    <View style={styles.heroStat}>
                      <Text style={[styles.heroStatValue, { color: C.brinjal1 }]}>{business.categories.length}</Text>
                      <Text style={[styles.heroStatLabel, { color: C.textSecondary }]}>{t('businessDetail.statSectors')}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Description */}
          {business.description ? (
            <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIconBox, { backgroundColor: C.primaryLight }]}>
                  <Ionicons name="document-text-outline" size={16} color={C.brinjal1} />
                </View>
                <Text style={[styles.infoCardTitle, { color: C.text }]}>{t('businessDetail.sectionAbout')}</Text>
              </View>
              <Text style={[styles.aboutText, { color: C.text }]}>{business.description}</Text>
            </View>
          ) : null}

          {/* Website — hidden when business has hideContactDetails on */}
          {business.website && !business.hideContactDetails ? (
            <Pressable
              style={[styles.websiteCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => Linking.openURL(business.website!)}>
              <View style={[styles.websiteIconBox, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="globe" size={20} color={C.brinjal1} />
              </View>
              <View style={styles.websiteText}>
                <Text style={[styles.websiteLabel, { color: C.textSecondary }]}>{t('businessDetail.sectionWebsite')}</Text>
                <Text style={[styles.websiteUrl, { color: C.brinjal1 }]} numberOfLines={1}>
                  {business.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={C.textSecondary} />
            </Pressable>
          ) : null}

          {/* Phone — hidden when business has hideContactDetails on */}
          {business.phone && !business.hideContactDetails ? (
            <Pressable
              style={[styles.websiteCard, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => Linking.openURL(`tel:${business.phone}`)}>
              <View style={[styles.websiteIconBox, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="call" size={18} color={C.brinjal1} />
              </View>
              <View style={styles.websiteText}>
                <Text style={[styles.websiteLabel, { color: C.textSecondary }]}>{t('businessDetail.sectionPhone')}</Text>
                <Text style={[styles.websiteUrl, { color: C.brinjal1 }]} numberOfLines={1}>{business.phone}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={C.textSecondary} />
            </Pressable>
          ) : null}

          {/* Sectors / Categories */}
          {business.categories.length > 0 && (
            <View style={[styles.infoCard, { backgroundColor: C.surface }]}>
              <View style={styles.infoCardHeader}>
                <View style={[styles.infoIconBox, { backgroundColor: C.primaryLight }]}>
                  <Ionicons name="pricetag" size={15} color={C.brinjal1} />
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
                <Ionicons name="mail-unread-outline" size={36} color={C.textSecondary} style={{ marginBottom: 8 }} />
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
          <Pressable style={[styles.msgBtn, { backgroundColor: C.brinjal1 }]} onPress={openChat}>
            <FontAwesome5 name="comment-dots" size={16} color="#fff" solid />
            <Text style={styles.msgBtnText}>{t('businessDetail.openChat')}</Text>
          </Pressable>
        ) : convStatus === 'PENDING' ? (
          <View style={[styles.msgBtn, { backgroundColor: C.border }]}>
            <Text style={[styles.msgBtnText, { color: '#fff' }]}>{t('businessDetail.requestSent')}</Text>
          </View>
        ) : (
          <Pressable style={[styles.msgBtn, { backgroundColor: C.brinjal1 }]} onPress={() => setShowMsgModal(true)}>
            <Text style={styles.msgBtnText}>{t('businessDetail.sendMessage')}</Text>
          </Pressable>
        )}
      </View>

      {/* Request message modal */}
      <Modal visible={showMsgModal} transparent animationType="slide" onRequestClose={() => setShowMsgModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalScrim} onPress={() => setShowMsgModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('businessDetail.messageRequestTitle')}</Text>
              <Pressable style={[styles.modalCloseBtn, { backgroundColor: C.background }]} onPress={() => setShowMsgModal(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={C.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              {t('businessDetail.messageRequestSubtitle', { name: business.businessName })}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={requestMsg}
              onChangeText={setRequestMsg}
              placeholder={t('businessDetail.messageRequestPlaceholder')}
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={500}
            />
            <Text style={[styles.modalCounter, { color: C.textSecondary }]}>{requestMsg.length}/500</Text>
            <Pressable
              style={[styles.modalSendBtn, { backgroundColor: sendingMsg ? C.border : C.brinjal1 }]}
              onPress={handleSendMessageRequest}
              disabled={sendingMsg}>
              <Text style={styles.modalSendText}>{sendingMsg ? t('businessDetail.sendingLabel') : t('businessDetail.sendRequestBtn')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1 },
  center:                { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar:                { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  navTitle:              { flex: 1, fontSize: 15, fontWeight: '700', textAlign: 'center', marginHorizontal: 4, fontFamily: F.bold },
  navActionBtn:          { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  hero:                  { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32 },
  heroInner:             { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  heroMeta:              { flex: 1, paddingTop: 4 },
  heroNameRow:           { marginBottom: 6 },
  heroName:              { fontSize: 22, fontWeight: '700', lineHeight: 28, fontFamily: F.bold },
  verifiedRow:           { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12, alignSelf: 'flex-start' },
  verifiedText:          { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  heroStats:             { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroStat:              { alignItems: 'center' },
  heroStatValue:         { fontSize: 18, fontWeight: '700', fontFamily: F.bold },
  heroStatLabel:         { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 1, fontFamily: F.semibold },
  heroStatDivider:       { width: 1, height: 28 },

  body:                  { padding: 16, gap: 12 },
  infoCard:              { borderRadius: 16, padding: 16, gap: 12 },
  infoCardHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIconBox:           { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  infoCardTitle:         { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  aboutText:             { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  websiteCard:           { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  websiteIconBox:        { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  websiteText:           { flex: 1 },
  websiteLabel:          { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, fontFamily: F.bold },
  websiteUrl:            { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  categoriesWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip:          { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText:      { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  sectionDivider:        { height: 1, marginVertical: 4 },
  campaignsSection:      { gap: 12 },
  campaignsSectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  campaignsSectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: F.bold },
  countBadge:            { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText:        { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  noCampaigns:           { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 4 },
  noCampaignsTitle:      { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  noCampaignsSub:        { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },

  campaignCard:          { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  campaignThumb:         { width: 72, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  campaignThumbEmoji:    { fontSize: 26 },
  featuredDot:           { position: 'absolute', top: 6, right: 4 },
  featuredDotText:       { fontSize: 10 },
  campaignBody:          { flex: 1, padding: 12, gap: 4 },
  campaignTitle:         { fontSize: 14, fontWeight: '700', lineHeight: 20, fontFamily: F.bold },
  campaignMeta:          { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  campaignFooter:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  campaignBudget:        { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  deadlinePill:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  deadlineText:          { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  locationRow:           { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  campaignLocation:      { fontSize: 11, fontFamily: F.regular },
  campaignRight:         { paddingVertical: 12, paddingRight: 12, alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 },
  appliedCount:          { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  appliedLabel:          { fontSize: 9, textTransform: 'uppercase', fontWeight: '600', fontFamily: F.semibold },

  appliedPill:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4 },
  appliedPillText:       { fontSize: 11, fontWeight: '700', color: '#059669', fontFamily: F.bold },
  applyNowBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 4 },
  applyNowBtnText:       { fontSize: 11, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  // Sticky message bar
  msgBar:                { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  msgBtn:                { borderRadius: 14, height: 52, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  msgBtnText:            { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },

  // Request modal
  modalOverlay:          { flex: 1, justifyContent: 'flex-end' },
  modalScrim:            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:            { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 14 },
  modalHandle:           { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitleRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle:            { fontSize: 18, fontWeight: '700', fontFamily: F.bold, flex: 1 },
  modalCloseBtn:         { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalSubtitle:         { fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  modalInput:            { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', fontFamily: F.regular },
  modalCounter:          { fontSize: 11, textAlign: 'right', marginTop: -6, fontFamily: F.regular },
  modalSendBtn:          { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  modalSendText:         { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});
