// Business "Manage competition" — mobile counterpart of
// web/src/app/competitions/BusinessCompetitionManagePage.tsx. Opened from the
// competition cards on business Home and My Work. A sliding tab menu switches
// between Overview · Participants & review · Final results · Activity.
import { useState } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { TabSlider } from '@/components/TabSlider';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTabTransition } from '@/hooks/useTabTransition';
import { withAlpha } from '@/utilities/color';
import { TabColors } from '@/utilities/tabColors';
import { F, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';
import { competitionManageService, type ManageDetail } from '@/services/competition';
import { Badge, TypeBadge } from '@/features/creator/competition/parts';
import { competitionStatusBadge, formatNpt } from '@/features/creator/competition/format';
import { Notice } from '@/features/business/competition/manage/shared';
import { OverviewPanel } from '@/features/business/competition/manage/OverviewPanel';
import { ReviewPanel } from '@/features/business/competition/manage/ReviewPanel';
import { ResultsPanel } from '@/features/business/competition/manage/ResultsPanel';
import { ActivityPanel } from '@/features/business/competition/manage/ActivityPanel';

type Tab = 'overview' | 'review' | 'results' | 'activity';
const TAB_ORDER = ['overview', 'review', 'results', 'activity'] as const;

export default function ManageCompetitionScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [stageId, setStageId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const panelStyle = useTabTransition(tab, TAB_ORDER);

  const q = useQuery({ queryKey: ['competition', 'manage', id], queryFn: () => competitionManageService.get(id), enabled: !!id });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['competition', 'manage', id] });
    // The business lists (Home / My Work) show status + participant counts.
    void queryClient.invalidateQueries({ queryKey: ['competitions', 'mine'] });
  }
  async function onPull() {
    setRefreshing(true);
    try { await queryClient.refetchQueries({ queryKey: ['competition', 'manage', id] }); } finally { setRefreshing(false); }
  }

  const c = q.data;
  const defaultStage = c ? (c.stages.find((s) => ['UNDER_REVIEW', 'SELECTION_PENDING', 'OPEN'].includes(s.status)) ?? c.stages[0]) : null;
  const activeStageId = c && stageId && c.stages.some((s) => s.id === stageId) ? stageId : defaultStage?.id ?? null;

  const tabs = [
    { key: 'overview', label: t('comp.tabOverview'),     icon: 'th-large'     as const, color: TabColors.neutral.color },
    { key: 'review',   label: t('comp.tabReview'),       icon: 'user-check'   as const, color: TabColors.brand.color,    count: c?.stats.awaitingReview || undefined },
    { key: 'results',  label: t('comp.tabFinalResults'), icon: 'award'        as const, color: TabColors.warning.color },
    { key: 'activity', label: t('comp.tabActivity'),     icon: 'history'      as const, color: TabColors.info.color },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('comp.manage')} backFallback="/(business)/(tabs)/campaigns" />
      <MaxWidthContainer>
        {q.isPending ? (
          <View style={{ padding: SCREEN_GUTTER, gap: 14 }}>
            <Skeleton width="100%" height={110} radius={RADIUS.lg} />
            <Skeleton width="100%" height={44} radius={RADIUS.full} />
            <Skeleton width="100%" height={260} radius={RADIUS.lg} />
          </View>
        ) : q.isError || !c ? (
          <EmptyState faIcon="trophy" title={t('comp.notFoundTitle')} subtitle={t('comp.notFoundBody')} action={{ label: t('common.retry'), onPress: () => void q.refetch() }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onPull()} tintColor={C.brinjal1} />}>
            <Header c={c} />
            <ReviewBanner c={c} />
            {c.suspended && <Notice tone="danger" text={`${t('comp.suspendedBanner')}${c.suspensionReason ? ` ${c.suspensionReason}` : ''}`} />}

            {/* Sliding section menu */}
            <TabSlider tabs={tabs} active={tab} onChange={(k) => setTab(k as Tab)} />

            <Animated.View style={panelStyle}>
              {tab === 'overview' && (
                <OverviewPanel c={c} onChanged={refresh} onGoTab={(next, sid) => { if (sid) setStageId(sid); setTab(next); }} />
              )}
              {tab === 'review' && activeStageId && (
                <ReviewPanel c={c} stageId={activeStageId} onSelectStage={setStageId} onChanged={refresh} />
              )}
              {tab === 'results' && (
                <ResultsPanel key={c.awards.map((x) => `${x.prizeId}:${x.participantId}:${x.isPublished}`).join()} c={c} onChanged={refresh} />
              )}
              {tab === 'activity' && <ActivityPanel competitionId={c.id} />}
            </Animated.View>
          </ScrollView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function Header({ c }: { c: ManageDetail }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const badge = competitionStatusBadge(c.status, t);
  const cover = c.coverImageUrl;
  return (
    <View style={[styles.header, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.cover, { backgroundColor: withAlpha('#EA580C', 0.1) }]}>
        <FontAwesome5 name="trophy" solid size={22} color="#EA580C" />
        {cover && <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.badges}>
          <TypeBadge />
          <Badge label={badge.label} tone={badge.tone} dot />
        </View>
        <Text style={[styles.title, { color: C.text }]} numberOfLines={3}>{c.title}</Text>
        <Pressable onPress={() => router.push({ pathname: '/competition-detail', params: { id: c.id } })} hitSlop={6} accessibilityRole="link" style={styles.publicLink}>
          <FontAwesome5 name="eye" size={11} color={C.brinjal1} />
          <Text style={[styles.publicLinkText, { color: C.brinjal1 }]}>{t('comp.viewAsCreator')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Where the competition stands with Kolab review (web: ReviewBanner). */
function ReviewBanner({ c }: { c: ManageDetail }) {
  const { t } = useLanguage();
  const r = c.review;
  const quoteLabel = t('comp.feedbackFromKolab');
  return (
    <>
      {c.status === 'PENDING_REVIEW' && <Notice tone="info" title={t('comp.reviewPendingTitle')} text={t('comp.reviewPendingBody', { when: formatNpt(r.submittedAt) })} />}
      {c.status === 'CHANGES_REQUESTED' && <Notice tone="warning" title={t('comp.reviewChangesTitle')} text={t('comp.reviewChangesBody')} quote={r.feedback} quoteLabel={quoteLabel} />}
      {c.status === 'REJECTED' && <Notice tone="danger" title={t('comp.reviewRejectedTitle')} text={r.resubmissionAllowed ? t('comp.reviewRejectedBody') : t('comp.reviewRejectedFinal')} quote={r.feedback} quoteLabel={quoteLabel} />}
      {r.pendingChanges ? (
        <Notice tone="info" title={t('comp.editPendingTitle')} text={t('comp.editPendingBody', { fields: Object.keys(r.pendingChanges).map((f) => t(`comp.field_${f}`)).join(', ') })} />
      ) : r.pendingChangesFeedback && !['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(c.status) ? (
        <Notice tone="warning" title={t('comp.editRejectedTitle')} text={t('comp.editRejectedBody')} quote={r.pendingChangesFeedback} quoteLabel={quoteLabel} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  scroll:     { padding: SCREEN_GUTTER, paddingBottom: 48, gap: 14 },
  header:     { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  cover:      { width: 72, height: 72, borderRadius: RADIUS.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  badges:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title:      { fontSize: 17, fontFamily: F.bold, lineHeight: lineHeightFor(17) },
  publicLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  publicLinkText: { fontSize: 12, fontFamily: F.semibold },
});
