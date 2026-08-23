import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BackButton } from '@/components/BackButton';
import { ShortlistButton } from '@/components/ShortlistButton';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { eventOptionLabel } from '@/features/business/utils/eventOptionLabels';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

function daysAgo(iso: string) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }
function formatDeadline(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { user } = useAuth();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const isBusiness = user?.role === 'BUSINESS';
  const { categories: allCategories } = useAllCategories();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hasApplied, setHasApplied]           = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' | null>(null);
  // Multi-role campaigns (§ CampaignRequirement) — which specific roles this
  // provider has already applied to. The backend allows one application per
  // role (unique on campaignId+creatorId+requirementId), so a provider can
  // apply to several different roles on the same campaign; hasApplied above
  // stays scoped to the simple/no-requirement application slot only.
  const [appliedRequirementIds, setAppliedRequirementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOpenEvent = campaign?.campaignType === 'OPEN_EVENT';

  useEffect(() => {
    // A falsy campaignId here (route-param hydration racing the first render)
    // must still resolve `loading` — deferred to a microtask rather than
    // called synchronously in the effect body — otherwise the screen hangs
    // on the spinner forever instead of falling back to the not-found state
    // below (`campaign` stays null, which that branch already handles).
    if (!campaignId) { Promise.resolve().then(() => setLoading(false)); return; }
    const appFetch = isBusiness
      ? Promise.resolve([])
      : campaignService.getMyApplications().then((r) => r.proposals).catch(() => []);
    Promise.all([campaignService.getById(campaignId), appFetch])
      .then(([c, apps]) => {
        setCampaign(c);
        setError('');
        if (!isBusiness) {
          const myApps = (apps as { campaignId: string; status: string; requirementId: string | null }[]).filter((a) => a.campaignId === campaignId);
          const myApp = myApps.find((a) => !a.requirementId);
          setHasApplied(!!myApp);
          setApplicationStatus(myApp ? myApp.status as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' : null);
          setAppliedRequirementIds(new Set(myApps.filter((a) => a.requirementId).map((a) => a.requirementId!)));
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [campaignId, languageVersion]);

  // Re-check applied status silently when returning from submit-proposal
  useFocusEffect(
    useCallback(() => {
      if (isBusiness || !campaignId) return;
      campaignService.getMyApplications()
        .then(({ proposals: apps }) => {
          const myApps = apps.filter((a) => a.campaignId === campaignId);
          const myApp = myApps.find((a) => !a.requirementId);
          setHasApplied(!!myApp);
          setApplicationStatus(myApp ? myApp.status as 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' : null);
          setAppliedRequirementIds(new Set(myApps.filter((a) => a.requirementId).map((a) => a.requirementId!)));
        })
        .catch(() => {});
    }, [campaignId, isBusiness])
  );

  // Silently refresh the campaign when returning from edit-campaign (a
  // separate modal-presented route, not local state on this screen) so a
  // saved change is reflected without the user having to pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      if (!isBusiness || !campaignId) return;
      campaignService.getById(campaignId).then(setCampaign).catch(() => {});
    }, [campaignId, isBusiness])
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <BackButton />
          <Text style={[s.headerTitle, { color: C.text }]}>{t('campaignDetail.headerTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.centered}><ActivityIndicator size="large" color={C.brinjal1} /></View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={s.centered}>
          <FontAwesome5 name="search" solid size={40} color={C.textSecondary} />
          <Text style={[{ fontSize: 17, fontWeight: '600' }, { color: C.textSecondary }]}>{error || t('campaignDetail.notFound')}</Text>
          <Pressable style={[s.goBackBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.back()}>
            <Text style={s.goBackBtnTxt}>{t('campaignDetail.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const catMeta = getCategoryMeta(allCategories, campaign.categoryKey ?? campaign.category);
  const heroBg  = catMeta.bg;
  const posted  = daysAgo(campaign.createdAt);
  const heroImage = campaign.featureImageUrl ?? getTemplateImage(campaign.template, campaign.categoryKey ?? campaign.category);

  // "Who You Need" reflects the roles actually captured at creation.
  // Events collect a real "who are you inviting" chip set (roleTypes,
  // stored as targetAudience) — show that ahead of the synthetic
  // "category (capacity)" line, which just repeats the Capacity row
  // already shown in Event Details below. Multi-role campaigns list each
  // role/quantity; other paid campaigns fall back to category + creator
  // count since their targetAudience is AI-derived, not business-picked.
  const whoYouNeed = campaign.requirements && campaign.requirements.length > 0
    ? campaign.requirements.map((r) => `${r.category.name} ×${r.quantity}`)
    : isOpenEvent && campaign.targetAudience && campaign.targetAudience.length > 0
      ? campaign.targetAudience
      : campaign.creatorsNeeded != null && campaign.category
        ? [`${campaign.category} (${campaign.creatorsNeeded})`]
        : (campaign.targetAudience && campaign.targetAudience.length > 0 ? campaign.targetAudience : []);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton />
        <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{campaign.title}</Text>
        {/* Save-for-later. The wrapper keeps its 40px slot even for a business
            session, where ShortlistButton renders nothing, so the centred
            title stays centred. */}
        <View style={s.headerAction}>
          <ShortlistButton campaignId={campaign.id} size="sm" style={s.headerSaveBtn} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: heroBg }]}>
          <FontAwesome5 name={catMeta.icon} size={56} color={catMeta.color} />
          {heroImage && (
            <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          {heroImage && <View style={[StyleSheet.absoluteFill, s.heroImgOverlay]} />}
          <View style={[s.heroBadge, { backgroundColor: C.badgeFeatured }]}>
            <Text style={s.heroBadgeTxt}>{campaign.category.toUpperCase()}</Text>
          </View>
          {campaign.isNew && (
            <View style={[s.heroNewBadge, { backgroundColor: C.badgeNew }]}>
              <Text style={s.heroBadgeTxt}>{t('campaignCard.new')}</Text>
            </View>
          )}
          <View style={[s.heroPosted, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
            <Text style={s.heroPostedTxt}>
              {posted === 0 ? t('campaignDetail.postedToday') : posted === 1 ? t('campaignDetail.postedYesterday') : t('campaignDetail.postedDaysAgo', { n: posted })}
            </Text>
          </View>
          {campaign.campaignType === 'OPEN_EVENT' ? (
            <View style={[s.heroTypeBadge, { backgroundColor: 'rgba(255,255,255,0.93)' }]}>
              <Text style={[s.heroTypeTxt, { color: '#059669' }]}>{t('campaignDetail.badgeFreeEvent')}</Text>
            </View>
          ) : (
            <View style={[s.heroTypeBadge, { backgroundColor: 'rgba(255,255,255,0.93)' }]}>
              {/* C.brinjal1, not a hardcoded hex — this screen is shared by
                  both roles (creator/business), and a fixed purple would
                  read wrong against a business viewer's green theme. */}
              <Text style={[s.heroTypeTxt, { color: C.brinjal1 }]}>{t('campaignDetail.badgePaidEvent')}</Text>
            </View>
          )}
        </View>

        {/* Title block */}
        <View style={[s.titleBlock, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={s.brandRow}>
            <View style={[s.brandAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={s.brandAvatarTxt}>{campaign.brand[0]}</Text>
            </View>
            <Text style={[s.brandName, { color: C.text }]}>{campaign.brand}</Text>
            <View style={[s.verifiedBadge, { backgroundColor: C.active }]}>
              <FontAwesome5 name="check" solid size={10} color="#fff" />
            </View>
          </View>
          <Text style={[s.campaignTitle, { color: C.text }]}>{campaign.title}</Text>
          {campaign.campaignType !== 'OPEN_EVENT' && (
            <View style={s.budgetRow}>
              <Text style={[s.budget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
            </View>
          )}
          <View style={{ alignItems: 'flex-end' }}>
            {isBusiness ? (
              <Pressable
                disabled={!campaign.proposals}
                style={({ pressed }) => [
                  s.proposalsBadge,
                  {
                    backgroundColor: C.primaryLight, flexDirection: 'row', alignItems: 'center', gap: 6,
                    borderWidth: 1.5, borderColor: campaign.proposals ? C.brinjal1 : C.border,
                    paddingHorizontal: 14, paddingVertical: 8,
                  },
                  !campaign.proposals && { backgroundColor: 'transparent' },
                  pressed && !!campaign.proposals && { opacity: 0.7 },
                ]}
                onPress={() => router.push({
                  pathname: '/(business)/campaign-proposals',
                  params: {
                    campaignId:    campaign.id,
                    campaignTitle: campaign.title,
                    campaignType:  campaign.campaignType ?? 'PAID_CAMPAIGN',
                  },
                })}>
                <FontAwesome5 name="file-alt" solid size={12} color={campaign.proposals ? C.brinjal1 : C.textSecondary} />
                <Text style={[s.proposalsTxt, { color: campaign.proposals ? C.brinjal1 : C.textSecondary, fontFamily: F.bold }]}>
                  {campaign.proposals
                    ? t(campaign.proposals === 1 ? 'campaignDetail.viewProposalsBtn' : 'campaignDetail.viewProposalsBtnPlural', { n: campaign.proposals })
                    : t('campaignDetail.noProposalsBtn')}
                </Text>
                {!!campaign.proposals && <FontAwesome5 name="chevron-right" solid size={10} color={C.brinjal1} />}
              </Pressable>
            ) : (
              <View style={[s.proposalsBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[s.proposalsTxt, { color: C.brinjal1 }]}>
                  {campaign.proposals === 1 ? t('campaignDetail.proposalCount', { n: campaign.proposals }) : t('campaignDetail.proposalsCount', { n: campaign.proposals })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 1. About the Event */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionAbout')}</Text>
          <Text style={[s.description, { color: C.text }]}>{campaign.description}</Text>
        </View>

        {/* 2. Category — just the category + AI-relevant categories + who
            the business is targeting. `goals` and `objective` dropped: both
            are AI-filled write-only fields the business never reviews at
            creation, so they added noise without adding real information. */}
        {(campaign.template || whoYouNeed.length > 0) && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionCategory')}</Text>
            {campaign.template && (
              <View style={s.templateRow}>
                <View style={[s.templateBadge, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.templateTxt, { color: C.brinjal1 }]}>{campaign.template}</Text>
                </View>
              </View>
            )}
            {!!campaign.aiSuggestedCategories?.length && (
              <Text style={[s.aiAlsoRelevant, { color: C.textSecondary, marginTop: campaign.template ? 8 : 0 }]}>Also relevant: {campaign.aiSuggestedCategories.join(', ')}</Text>
            )}
            {whoYouNeed.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: C.textSecondary, marginTop: 12 }]}>{t('campaignDetail.sectionTargetAudience')}</Text>
                <View style={s.goalChips}>
                  {whoYouNeed.map((who) => (
                    <View key={who} style={[s.goalChip, { backgroundColor: C.primaryLight }]}>
                      <Text style={[s.goalChipTxt, { color: C.brinjal1 }]}>{who}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* 4. Event Details */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDetails')}</Text>
          <View style={s.detailsGrid}>
            {isOpenEvent && campaign.eventDate ? (
              <DetailRow icon="calendar-day" label={t('campaignDetail.detailEventDate')} value={formatDeadline(campaign.eventDate)} C={C} />
            ) : null}
            <DetailRow icon="calendar-alt" label={isOpenEvent ? 'Registration Deadline' : t('campaignDetail.detailDeadline')} value={formatDeadline(campaign.deadline)} C={C} />
            {!isOpenEvent && (
              <>
                <DetailRow icon="wallet" label={t('campaignDetail.detailBudget')}  value={campaign.budget} C={C} />
                {campaign.creatorsNeeded != null && (
                  <DetailRow icon="users" label={t('campaignDetail.detailCreatorsNeeded')} value={String(campaign.creatorsNeeded)} C={C} />
                )}
              </>
            )}
            {campaign.locationType === 'REMOTE' ? (
              <DetailRow icon="globe" label={t('campaignDetail.detailLocation')} value={t('createEvent.locationRemote')} C={C} />
            ) : isOpenEvent && campaign.venue ? (
              <DetailRow icon="map-marker-alt" label={t('campaignDetail.detailVenue')} value={campaign.venue} C={C} />
            ) : (
              <DetailRow icon="map-marker-alt" label={t('campaignDetail.detailLocation')} value={campaign.location ?? t('campaignDetail.remoteLocation')} C={C} />
            )}
            {isOpenEvent && campaign.capacity ? (
              <DetailRow icon="users" label={t('campaignDetail.detailCapacity')} value={t('campaignDetail.capacityCreators', { n: campaign.capacity })} C={C} />
            ) : null}
            <DetailRow icon="chart-bar" label={t('campaignDetail.detailStatus')} value={campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : t('campaignDetail.statusActive')} C={C} />
          </View>
        </View>

        {/* Benefits card — free events only */}
        {isOpenEvent && campaign.benefits && campaign.benefits.length > 0 ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionWhatYouGet')}</Text>
            <View style={s.benefitsWrap}>
              {campaign.benefits.map((b, i) => (
                <View key={i} style={[s.benefitChip, { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' }]}>
                  <FontAwesome5 name="gift" solid size={12} color="#065F46" />
                  <Text style={[s.benefitChipTxt, { color: '#065F46' }]}>{eventOptionLabel(b, 'offering', t)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* How this job is completed — the one thing a provider can't infer
            from the brief. A free event is always the same answer (turn up
            and post about it), so it skips the SERVICE/DELIVERABLE split
            entirely; a paid campaign gets classified, and a multi-role one
            lists each role, since roles can differ. */}
        {isOpenEvent ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionCompletion')}</Text>
            <ShareCompletionNote platforms={campaign.platforms} C={C} t={t} />
          </View>
        ) : campaign.requirements && campaign.requirements.length > 0
          ? campaign.requirements.some((r) => r.completionType) && (
            <View style={[s.card, { backgroundColor: C.surface }]}>
              <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionCompletion')}</Text>
              <View style={{ gap: 12 }}>
                {campaign.requirements.filter((r) => r.completionType).map((r) => (
                  <CompletionNote
                    key={r.id}
                    role={r.category.name}
                    type={r.completionType as 'SERVICE' | 'DELIVERABLE'}
                    C={C}
                    t={t}
                  />
                ))}
              </View>
            </View>
          )
          : campaign.completionType ? (
            <View style={[s.card, { backgroundColor: C.surface }]}>
              <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionCompletion')}</Text>
              <CompletionNote type={campaign.completionType} C={C} t={t} />
            </View>
          ) : null}

        {/* 5. Deliverables — multi-role campaigns each collect their own
            deliverables at creation, so list every role's under its own
            name in one card instead of the single flattened campaign-level
            string (which also can't be split correctly per role). */}
        {campaign.requirements && campaign.requirements.length > 0 ? (
          campaign.requirements.some((r) => r.deliverables) && (
            <View style={[s.card, { backgroundColor: C.surface }]}>
              <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDeliverables')}</Text>
              <View style={{ gap: 14 }}>
                {campaign.requirements.filter((r) => r.deliverables).map((r) => (
                  <View key={r.id}>
                    <Text style={[s.roleTitle, { color: C.text, marginBottom: 4 }]}>{r.category.name}</Text>
                    {r.deliverables!.split(/,\s*|\s*\+\s*/).filter(Boolean).map((d, i) => (
                      <ReqItem key={i} text={d.trim()} C={C} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )
        ) : campaign.deliverables ? (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionDeliverables')}</Text>
            {campaign.deliverables.split(/,\s*|\s*\+\s*/).filter(Boolean).map((d, i) => (
              <ReqItem key={i} text={d.trim()} C={C} />
            ))}
          </View>
        ) : null}

        {/* 6. Hashtags */}
        {campaign.hashtags && campaign.hashtags.length > 0 && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionHashtags')}</Text>
            <View style={s.goalChips}>
              {campaign.hashtags.map((tag) => (
                <View key={tag} style={[s.goalChip, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.goalChipTxt, { color: C.brinjal1 }]}>#{tag.replace(/^#/, '')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sample Caption */}
        {campaign.sampleCaption && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionSampleCaption')}</Text>
            <Text style={[s.description, { color: C.text, fontStyle: 'italic' }]}>&ldquo;{campaign.sampleCaption}&rdquo;</Text>
          </View>
        )}

        {/* Approval Requirements */}
        {campaign.approvalRequirements && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>{t('campaignDetail.sectionApprovalRequirements')}</Text>
            <Text style={[s.description, { color: C.text }]}>{campaign.approvalRequirements}</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[s.ctaBar, { justifyContent: 'center' }, !isBusiness && campaign.requirements && campaign.requirements.length > 0 && s.ctaBarRoles]}>
        {isBusiness ? (
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={() => router.push({ pathname: '/edit-campaign', params: { campaignId: campaign.id } })}>
            <FontAwesome5 name="edit" size={16} color="#fff" />
            <Text style={s.applyBtnTxt}>{t('campaignDetail.editEvent')}</Text>
          </Pressable>
        ) : isOpenEvent && applicationStatus === 'accepted' ? (
          <View style={s.invitedCard}>
            <View style={s.invitedIconWrap}>
              <FontAwesome5 name="trophy" size={18} color="#16A34A" solid />
            </View>
            <View style={s.invitedTextBlock}>
              <Text style={s.invitedTitle}>{t('campaignDetail.invitedTitle')}</Text>
              <Text style={s.invitedSub}>{t('campaignDetail.invitedSub')}</Text>
            </View>
          </View>
        ) : campaign.requirements && campaign.requirements.length > 0 ? (
          // Multi-role campaign — the "Roles Needed" card lives here, in the
          // sticky footer, instead of the scrollable body, so applying to a
          // specific role is always one tap away regardless of scroll position.
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[s.sectionLabel, { color: C.textSecondary, marginBottom: 0 }]}>{t('campaignDetail.sectionRolesNeeded')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roleChipRow}>
              {campaign.requirements.map((r) => {
                const full = r.acceptedCount >= r.quantity;
                const applied = appliedRequirementIds.has(r.id);
                const budgetLabel = r.budgetType === 'FIXED' ? `Rs. ${(r.budgetFixed ?? 0).toLocaleString()}`
                  : r.budgetType === 'RANGE' ? `Rs. ${(r.budgetMin ?? 0).toLocaleString()} - ${(r.budgetMax ?? 0).toLocaleString()}`
                  : t('campaignDetail.negotiable');
                return (
                  <View key={r.id} style={[s.roleChip, { borderColor: C.border, backgroundColor: C.surface }]}>
                    <View style={[s.roleIconWrap, { backgroundColor: `${r.category.color}1A` }]}>
                      <FontAwesome5 name={r.category.icon as any} size={14} color={r.category.color} solid />
                    </View>
                    <View style={{ gap: 1 }}>
                      <Text style={[s.roleChipTitle, { color: C.text }]} numberOfLines={1}>{r.category.name}</Text>
                      <Text style={[s.roleChipSub, { color: C.textSecondary }]} numberOfLines={1}>
                        {t('campaignDetail.roleFilled', { accepted: r.acceptedCount, quantity: r.quantity })} · {budgetLabel}
                      </Text>
                    </View>
                    {applied ? (
                      <View style={s.roleAppliedBadge}>
                        <FontAwesome5 name="check-circle" solid size={14} color="#059669" />
                      </View>
                    ) : full ? (
                      <Text style={[s.roleFullTxt, { color: C.textSecondary }]}>{t('campaignDetail.roleFull')}</Text>
                    ) : (
                      <Pressable
                        style={[s.roleChipApplyBtn, { backgroundColor: C.brinjal1 }]}
                        onPress={() => router.push({
                          pathname: '/submit-proposal',
                          params: {
                            campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand,
                            budget: budgetLabel,
                            budgetMin: String(r.budgetType === 'RANGE' ? (r.budgetMin ?? 0) : (r.budgetFixed ?? 0)),
                            budgetMax: String(r.budgetType === 'RANGE' ? (r.budgetMax ?? 0) : (r.budgetFixed ?? 0)),
                            category: r.category.name, campaignType: campaign.campaignType ?? 'PAID_CAMPAIGN',
                            requirementId: r.id,
                          },
                        })}>
                        <Text style={s.roleApplyBtnTxt}>{t('campaignDetail.roleApply')}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : hasApplied ? (
          <View style={s.appliedBadge}>
            <FontAwesome5 name="check-circle" solid size={18} color="#059669" />
            <Text style={s.appliedBadgeTxt}>{t('campaignDetail.alreadyApplied')}</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={() => campaign && router.push({ pathname: '/submit-proposal', params: { campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand, budget: campaign.budget, budgetMin: String(campaign.budgetRaw), budgetMax: String(campaign.budgetMax ?? campaign.budgetRaw), category: campaign.category, campaignType: campaign.campaignType ?? 'PAID_CAMPAIGN' } })}>
            <Text style={s.applyBtnTxt}>{t('campaignDetail.submitProposal')}</Text>
          </Pressable>
        )}
      </View>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ icon, label, value, C }: { icon: string; label: string; value: string; C: any }) {
  return (
    <View style={s.detailRow}>
      <View style={[s.detailIcon, { backgroundColor: C.background }]}>
        <FontAwesome5 name={icon} size={14} color={getIconColor(icon)} />
      </View>
      <View style={s.detailContent}>
        <Text style={[s.detailLabel, { color: C.textSecondary }]}>{label}</Text>
        <Text style={[s.detailValue, { color: C.text }]}>{value}</Text>
      </View>
    </View>
  );
}

// One "how this job ends" line — an icon + plain-language sentence, not a
// bare "SERVICE"/"DELIVERABLE" label, since the whole point is telling a
// provider whether they'll be asked to upload anything. `role` is set only
// on multi-role campaigns, where each role can differ.
// A free event's completion note. There is no deliverable to upload and no
// work stage to run (acceptance is final, see CampaignService), so attending
// and posting about it IS the whole ask — stated once, the same way for every
// free event, rather than classified per role like a paid campaign.
const DEFAULT_SHARE_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'YouTube'];

function ShareCompletionNote({ platforms, C, t }: {
  platforms: string[];
  C: any;
  t: (key: string) => string;
}) {
  // The business picks the platforms it cares about at creation; fall back to
  // the big four when an older event didn't record any.
  const list = platforms && platforms.length > 0 ? platforms : DEFAULT_SHARE_PLATFORMS;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.completionRow}>
        <View style={[s.completionIcon, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
          <FontAwesome5 name="share-alt" solid size={14} color="#059669" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.completionTitle, { color: C.text }]}>{t('campaignDetail.freeCompletionTitle')}</Text>
          <Text style={[s.completionDesc, { color: C.textSecondary }]}>{t('campaignDetail.freeCompletionDesc')}</Text>
        </View>
      </View>
      <View style={s.benefitsWrap}>
        {list.map((p) => (
          <View key={p} style={[s.benefitChip, { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' }]}>
            <Text style={[s.benefitChipTxt, { color: '#065F46' }]}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CompletionNote({ role, type, C, t }: {
  role?: string;
  type: 'SERVICE' | 'DELIVERABLE';
  C: any;
  t: (key: string) => string;
}) {
  const isService = type === 'SERVICE';
  const tint = isService ? '#4F46E5' : '#059669';
  return (
    <View style={s.completionRow}>
      <View style={[s.completionIcon, { backgroundColor: `${tint}14` }]}>
        <FontAwesome5 name={isService ? 'handshake' : 'cloud-upload-alt'} solid size={14} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.completionTitle, { color: C.text }]}>
          {role ? `${role} · ` : ''}
          {isService
            ? t('createOpportunity.completionServiceTitle')
            : t('createOpportunity.completionDeliverableTitle')}
        </Text>
        <Text style={[s.completionDesc, { color: C.textSecondary }]}>
          {isService
            ? t('createOpportunity.completionServiceDesc')
            : t('createOpportunity.completionDeliverableDesc')}
        </Text>
      </View>
    </View>
  );
}

function ReqItem({ text, C }: { text: string; C: any }) {
  return (
    <View style={s.reqItem}>
      <View style={[s.reqDot, { backgroundColor: C.brinjal1 }]} />
      <Text style={[s.reqText, { color: C.text }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  goBackBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  goBackBtnTxt: { color: '#fff', fontSize: 14, fontFamily: F.bold },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  headerAction: { width: 40, alignItems: 'flex-end' },
  // Matches BackButton's 40px circle so the two header controls read as a pair.
  headerSaveBtn: { width: 40, height: 40, borderRadius: 20 },

  scroll: { paddingBottom: SPACING.xxxl },

  hero:         { height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroImgOverlay: { backgroundColor: 'rgba(0,0,0,0.28)' },
  heroBadge:    { position: 'absolute', top: 14, left: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  heroNewBadge: { position: 'absolute', top: 14, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  heroBadgeTxt: { fontSize: 10, color: '#fff', letterSpacing: 0.5, fontFamily: F.bold },
  heroPosted:    { position: 'absolute', bottom: 12, left: 16, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  heroPostedTxt: { fontSize: 11, color: '#fff', fontFamily: F.medium },
  heroTypeBadge: { position: 'absolute', bottom: 12, right: 14, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  heroTypeTxt:   { fontSize: 11, fontFamily: F.bold },

  titleBlock:    { paddingHorizontal: SCREEN_GUTTER, paddingVertical: 16, gap: 10, borderBottomWidth: 1 },
  brandRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandAvatar:   { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  brandAvatarTxt:{ fontSize: 12, color: '#fff', fontFamily: F.bold },
  brandName:     { fontSize: 14, fontFamily: F.semibold },
  verifiedBadge: { width: 16, height: 16, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  campaignTitle: { fontSize: 18, lineHeight: 27, fontFamily: F.bold },
  budgetRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budget:        { fontSize: 16, fontFamily: F.bold },
  typeBadge:     { borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1 },
  typeBadgeText: { fontSize: 12, fontFamily: F.bold },
  proposalsBadge:{ borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  proposalsTxt:  { fontSize: 12, fontFamily: F.semibold },

  // marginHorizontal matches titleBlock/ctaBar's own 20px inset (SCREEN_GUTTER)
  // below — this used to be a stray 16, so card content sat 4px narrower than
  // the title/CTA above and below it instead of lining up on the same edge.
  card:        { marginHorizontal: SCREEN_GUTTER, marginTop: 12, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 12, ...SHADOW.card },
  sectionLabel:{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: F.bold },
  templateRow: { flexDirection: 'row' },
  templateBadge:{ borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  templateTxt: { fontSize: 13, fontFamily: F.bold },
  aiAlsoRelevant: { fontSize: 11, fontFamily: F.regular, marginTop: 6 },
  goalChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip:    { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  goalChipTxt: { fontSize: 12, fontFamily: F.semibold },
  detailsGrid: { gap: 10 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon:  { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  detailContent:{ flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: F.medium },
  detailValue: { fontSize: 14, marginTop: 1, fontFamily: F.semibold },
  description: { fontSize: 15, lineHeight: 23, fontFamily: F.regular },
  completionRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  completionIcon:  { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  completionTitle: { fontSize: 14, fontFamily: F.semibold },
  completionDesc:  { fontSize: 12, lineHeight: 18, fontFamily: F.regular, marginTop: 2 },
  reqItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4 },
  reqDot:      { width: 6, height: 6, borderRadius: RADIUS.full, marginTop: 7, flexShrink: 0 },
  reqText:     { flex: 1, fontSize: 14, lineHeight: 21, fontFamily: F.regular },

  benefitsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  benefitChipTxt:{ fontSize: 13, fontFamily: F.semibold },

  ctaBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, gap: 16 },
  // Multi-role campaigns need extra vertical room for the "Roles Needed"
  // label + horizontally-scrolling role chips, unlike every other branch's
  // single-line button.
  ctaBarRoles:   { paddingVertical: 10 },
  ctaInfo:       { flex: 1 },
  ctaBudget:     { fontSize: 18, fontFamily: F.bold },
  ctaLabel:      { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  applyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.md, paddingHorizontal: 22, paddingVertical: 15, ...SHADOW.raised },
  applyBtnTxt:   { color: '#fff', fontSize: 15, fontFamily: F.bold },
  appliedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5, borderColor: '#A7F3D0' },
  appliedBadgeTxt:{ fontSize: 15, color: '#059669', fontFamily: F.bold },
  roleIconWrap:  { width: 36, height: 36, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  roleTitle:     { fontSize: 14, fontFamily: F.bold },
  roleAppliedBadge: { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' },
  roleFullTxt:   { fontSize: 12, fontFamily: F.medium },
  roleApplyBtnTxt: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  // Sticky-footer role chips — compact horizontal-scroll variant of the old
  // full-width role cards, sized to fit the CTA bar's limited height.
  roleChipRow:      { flexDirection: 'row', gap: 8 },
  roleChip:          { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, minWidth: 180 },
  roleChipTitle:     { fontSize: 13, fontFamily: F.bold },
  roleChipSub:       { fontSize: 11, fontFamily: F.regular },
  roleChipApplyBtn:  { borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 'auto' },

  invitedCard:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: '#6EE7B7' },
  invitedIconWrap:  { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  invitedTextBlock: { flex: 1, gap: 2 },
  invitedTitle:     { fontSize: 15, color: '#065F46', fontFamily: F.bold },
  invitedSub:       { fontSize: 12, color: '#047857', fontFamily: F.regular, lineHeight: 18 },
});
