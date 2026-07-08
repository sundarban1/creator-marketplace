import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { TabSlider } from '@/components/TabSlider';
import { useToast } from '@/components/Toast';
import { campaignService } from '@/services/campaign';
import { creatorService, type SavedCreatorItem } from '@/services/creator';
import { CATEGORY_META, DEFAULT_META, cardBg } from '@/features/creator/data/filterOptions';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

type Application = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedRate: string;
  createdAt: string;
  creator: { fullName: string; avatarUrl: string | null; location: string | null };
};

type IoniconName = keyof typeof Ionicons.glyphMap;

const FILTERS = ['All', 'Active', 'Draft', 'Closed'] as const;

const EMPTY_CFG: Record<typeof FILTERS[number], {
  icon: IoniconName; iconColor: string; iconBg: string; showCreate: boolean;
}> = {
  All:    { icon: 'megaphone-outline',    iconColor: '#7c3aed', iconBg: '#f5f3ff', showCreate: true  },
  Active: { icon: 'flash-outline',        iconColor: '#16A34A', iconBg: '#ECFDF5', showCreate: true  },
  Draft:  { icon: 'create-outline',       iconColor: '#D97706', iconBg: '#FEF3C7', showCreate: true  },
  Closed: { icon: 'lock-closed-outline',  iconColor: '#6B7280', iconBg: '#F3F4F6', showCreate: false },
};

const STATUS_CFG = {
  active: { bg: '#EEF9F3', color: '#16A34A' },
  draft:  { bg: '#F4F4F4', color: '#6B7280' },
  closed: { bg: '#FEF3C7', color: '#D97706' },
} as const;

const PROPOSAL_STATUS_CFG = {
  pending:  { bg: '#FFF7ED', color: '#D97706', label: 'Pending'  },
  accepted: { bg: '#EEF9F3', color: '#16A34A', label: 'Accepted' },
  rejected: { bg: '#F3F4F6', color: '#6B7280', label: 'Rejected' },
} as const;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CampaignsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]>('All');
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Invite flow
  const [inviteCampaign, setInviteCampaign]       = useState<Campaign | null>(null);
  const [savedCreators, setSavedCreators]           = useState<SavedCreatorItem[]>([]);
  const [savedLoading, setSavedLoading]             = useState(false);
  const [selectedCreators, setSelectedCreators]     = useState<Set<string>>(new Set());
  const [inviteSending, setInviteSending]           = useState(false);
  const [inviteSuccess, setInviteSuccess]           = useState(false);

  async function loadCampaigns(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { campaigns: data } = await campaignService.listMy({ limit: 50 });
      setCampaigns(data);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  const onRefresh = useCallback(() => loadCampaigns(true), []);

  async function openInvite(c: Campaign) {
    setInviteCampaign(c);
    setSelectedCreators(new Set());
    setInviteSuccess(false);
    setSavedLoading(true);
    try {
      const data = await creatorService.getSavedCreators();
      setSavedCreators(data);
    } catch {
      setSavedCreators([]);
    } finally {
      setSavedLoading(false);
    }
  }

  function toggleCreator(creatorId: string) {
    setSelectedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
  }

  async function handleSendInvites() {
    if (!inviteCampaign || selectedCreators.size === 0 || inviteSending) return;
    setInviteSending(true);
    try {
      await creatorService.inviteCreators(inviteCampaign.id, Array.from(selectedCreators));
      setInviteSuccess(true);
      setTimeout(() => setInviteCampaign(null), 1500);
    } catch { /* ignore */ } finally {
      setInviteSending(false);
    }
  }

  async function handlePublishDraft(c: Campaign) {
    if (publishingId) return;
    setPublishingId(c.id);
    try {
      await campaignService.update(c.id, { status: 'active' });
      toast.success(t('campaigns.draftPublished'));
      await loadCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('campaigns.draftPublishFailed'));
    } finally {
      setPublishingId(null);
    }
  }

  async function openProposals(c: Campaign) {
    setSelectedCampaign(c);
    setApplications([]);
    setAppsLoading(true);
    try {
      const data = await campaignService.getApplications(c.id);
      setApplications(data);
    } catch {
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }

  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const draftCount  = campaigns.filter((c) => c.status === 'draft').length;
  const closedCount = campaigns.filter((c) => c.status === 'closed').length;

  const CAMP_TABS = [
    { key: 'All',    label: t('campaigns.all'),    icon: 'layers-outline'      as const, color: '#4F46E5', count: campaigns.length },
    { key: 'Active', label: t('campaigns.active'), icon: 'flash-outline'       as const, color: '#16A34A', count: activeCount       },
    { key: 'Draft',  label: t('campaigns.draft'),  icon: 'create-outline'      as const, color: '#D97706', count: draftCount        },
    { key: 'Closed', label: t('campaigns.closed'), icon: 'lock-closed-outline' as const, color: '#6B7280', count: closedCount       },
  ];

  const shown = campaigns.filter((c) =>
    activeFilter === 'All' || c.status === activeFilter.toLowerCase()
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.pageTitle, { color: '#fff' }]}>{t('campaigns.title')}</Text>
            <Text style={[styles.pageSub, { color: 'rgba(255,255,255,0.75)' }]}>{t('campaigns.subtitle')}</Text>
          </View>
          <Pressable
            style={[styles.newBtn, { backgroundColor: 'rgba(255,255,255,0.22)' }]}
            onPress={() => router.push('/create-campaign')}>
            <Text style={[styles.newBtnText, { color: '#fff' }]}>{t('business.newBtn')}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { backgroundColor: C.surface }]}>
        <TabSlider
          tabs={CAMP_TABS}
          active={activeFilter}
          onChange={(k) => setActiveFilter(k as typeof activeFilter)}
        />
      </View>

      {/* Campaign list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, shown.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}>
          {shown.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                {/* Decorative dots */}
                <View style={[styles.emptyDot1, { backgroundColor: EMPTY_CFG[activeFilter].iconBg }]} />
                <View style={[styles.emptyDot2, { backgroundColor: EMPTY_CFG[activeFilter].iconBg }]} />

                {/* Icon */}
                <View style={[styles.emptyIconCircle, { backgroundColor: EMPTY_CFG[activeFilter].iconBg }]}>
                  <Ionicons
                    name={EMPTY_CFG[activeFilter].icon}
                    size={36}
                    color={EMPTY_CFG[activeFilter].iconColor}
                  />
                </View>

                {/* Text */}
                <Text style={[styles.emptyTitle, { color: C.text }]}>
                  {activeFilter === 'All' ? t('campaigns.emptyNoEvents') : activeFilter === 'Active' ? t('campaigns.emptyNoActive') : activeFilter === 'Draft' ? t('campaigns.emptyNoDrafts') : t('campaigns.emptyNoClosed')}
                </Text>
                <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                  {activeFilter === 'All' ? t('campaigns.emptyNoEventsSub') : activeFilter === 'Active' ? t('campaigns.emptyNoActiveSub') : activeFilter === 'Draft' ? t('campaigns.emptyNoDraftsSub') : t('campaigns.emptyNoClosedSub')}
                </Text>

                {/* Create button */}
                {EMPTY_CFG[activeFilter].showCreate && (
                  <Pressable
                    style={[styles.emptyCreateBtn, { backgroundColor: EMPTY_CFG[activeFilter].iconColor }]}
                    onPress={() => router.push('/create-campaign')}>
                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                    <Text style={styles.emptyCreateBtnText}>{t('campaigns.createNewEvent')}</Text>
                  </Pressable>
                )}

                {/* Or switch tab hint for non-All filters */}
                {activeFilter !== 'All' && (
                  <Pressable onPress={() => setActiveFilter('All')} style={styles.emptySwitchRow}>
                    <Text style={[styles.emptySwitchText, { color: C.textSecondary }]}>{t('campaigns.viewAllEvents')}  </Text>
                    <Text style={[styles.emptySwitchLink, { color: C.brinjal1 }]}>{t('campaigns.seeAll')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            shown.map((c) => {
              const st = STATUS_CFG[c.status ?? 'draft'];
              const meta = CATEGORY_META[c.category] ?? DEFAULT_META;
              const bg = cardBg(c.category);
              return (
                <View key={c.id} style={[styles.card, { backgroundColor: C.surface }]}>
                  <View style={[styles.cardAccent, { backgroundColor: st.color }]} />
                  <View style={styles.cardContent}>
                    <Pressable
                      style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.88 }]}
                      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>
                      <View style={[styles.thumb, { backgroundColor: bg }]}>
                        <Text style={styles.thumbEmoji}>{meta.emoji}</Text>
                      </View>
                      <View style={styles.body}>
                        <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{c.title}</Text>
                        <View style={styles.metaRow}>
                          <Ionicons name="globe-outline" size={12} color={C.textSecondary} />
                          <Text style={[styles.meta, { color: C.textSecondary }]}>{c.platform}</Text>
                          <Text style={[styles.metaDot, { color: C.border }]}>·</Text>
                          <Ionicons name="cash-outline" size={12} color={C.textSecondary} />
                          <Text style={[styles.meta, { color: C.textSecondary }]}>{c.budget}</Text>
                        </View>
                        {(c.status === 'draft') ? (
                          <Text style={[styles.draftNote, { color: C.textSecondary }]}>{t('campaigns.tapToEdit')}</Text>
                        ) : (
                          <View style={styles.statRow}>
                            <View style={[styles.statPill, { backgroundColor: C.primaryLight }]}>
                              <Ionicons name="people-outline" size={12} color={C.brinjal1} />
                              <Text style={[styles.stat, { color: C.brinjal1 }]}>
                                {c.proposals} proposal{c.proposals !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: st.bg }]}>
                              <Text style={[styles.badgeText, { color: st.color }]}>
                                {c.status === 'active' ? t('campaigns.statusActive') : c.status === 'draft' ? t('campaigns.statusDraft') : t('campaigns.statusClosed')}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={C.border} />
                    </Pressable>

                    {/* Footer actions */}
                    {(c.proposals > 0 || c.status === 'active' || c.status === 'draft') && (
                      <>
                        <View style={[styles.footerDivider, { backgroundColor: C.border }]} />
                        <View style={styles.footerRow}>
                          {c.proposals > 0 && (
                            <Pressable
                              style={({ pressed }) => [styles.footerBtn, pressed && { opacity: 0.7 }]}
                              onPress={() => openProposals(c)}>
                              <Text style={[styles.footerBtnText, { color: C.brinjal1 }]}>{t('campaigns.viewProposals')} →</Text>
                            </Pressable>
                          )}
                          {c.status === 'active' && (
                            <Pressable
                              style={({ pressed }) => [styles.inviteBtn, { backgroundColor: C.primaryLight }, pressed && { opacity: 0.7 }]}
                              onPress={() => openInvite(c)}>
                              <Ionicons name="person-add-outline" size={13} color={C.brinjal1} />
                              <Text style={[styles.inviteBtnText, { color: C.brinjal1 }]}>{t('campaigns.invite')}</Text>
                            </Pressable>
                          )}
                          {c.status === 'draft' && (
                            <Pressable
                              style={({ pressed }) => [styles.inviteBtn, { backgroundColor: C.primaryLight, opacity: publishingId === c.id ? 0.6 : 1 }, pressed && { opacity: 0.7 }]}
                              disabled={publishingId === c.id}
                              onPress={() => handlePublishDraft(c)}>
                              {publishingId === c.id ? (
                                <ActivityIndicator size="small" color={C.brinjal1} />
                              ) : (
                                <Ionicons name="cloud-upload-outline" size={13} color={C.brinjal1} />
                              )}
                              <Text style={[styles.inviteBtnText, { color: C.brinjal1 }]}>{t('campaigns.publishDraft')}</Text>
                            </Pressable>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Invite Creators bottom sheet */}
      <Modal
        visible={!!inviteCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteCampaign(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInviteCampaign(null)} />
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('campaigns.inviteModalTitle')}</Text>
              <Text style={[styles.modalSubtitle, { color: C.textSecondary }]} numberOfLines={1}>
                {inviteCampaign?.title}
              </Text>
            </View>
            <Pressable style={[styles.modalClose, { backgroundColor: C.background }]} onPress={() => setInviteCampaign(null)}>
              <Text style={[styles.modalCloseText, { color: C.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          {inviteSuccess ? (
            <View style={styles.inviteSuccess}>
              <Text style={styles.inviteSuccessEmoji}>🎉</Text>
              <Text style={[styles.inviteSuccessText, { color: C.text }]}>{t('campaigns.invitationSent')}</Text>
              <Text style={[styles.inviteSuccessHint, { color: C.textSecondary }]}>
                {t('campaigns.invitationSentSub')}
              </Text>
            </View>
          ) : savedLoading ? (
            <View style={styles.center}><ActivityIndicator size="small" color={C.brinjal1} /></View>
          ) : savedCreators.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyIcon}>🔖</Text>
              <Text style={[styles.modalEmptyText, { color: C.textSecondary }]}>{t('campaigns.noSavedCreators')}</Text>
              <Text style={[styles.modalEmptyHint, { color: C.textSecondary }]}>
                {t('campaigns.noSavedCreatorsSub')}
              </Text>
              <Pressable
                style={[styles.goSaveBtn, { backgroundColor: C.brinjal1 }]}
                onPress={() => { setInviteCampaign(null); router.push('/(business)/saved-creators'); }}>
                <Text style={styles.goSaveBtnText}>{t('campaigns.viewSavedCreators')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {selectedCreators.size > 0 && (
                <View style={[styles.selectionBanner, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.selectionText, { color: C.brinjal1 }]}>
                    {t('campaigns.creatorsSelected', { n: selectedCreators.size })}
                  </Text>
                </View>
              )}
              <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
                {savedCreators.map(({ creator }) => {
                  const sel = selectedCreators.has(creator.id);
                  const topAcc = creator.socialAccounts?.sort((a, b) => b.followers - a.followers)[0];
                  const abbr = (creator.fullName ?? 'C').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <Pressable
                      key={creator.id}
                      style={[styles.creatorPickRow, { backgroundColor: sel ? C.primaryLight : C.background, borderColor: sel ? C.brinjal1 : C.border }]}
                      onPress={() => toggleCreator(creator.id)}>
                      <View style={[styles.pickAvatar, { backgroundColor: C.brinjal1 }]}>
                        <Text style={styles.pickAvatarText}>{abbr}</Text>
                      </View>
                      <View style={styles.pickInfo}>
                        <Text style={[styles.pickName, { color: C.text }]}>{creator.fullName ?? 'Creator'}</Text>
                        {topAcc && (
                          <Text style={[styles.pickSub, { color: C.textSecondary }]}>
                            {topAcc.platform} · {topAcc.followers >= 1000 ? `${(topAcc.followers / 1000).toFixed(1)}K` : topAcc.followers} {t('campaigns.followersSuffix')}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.checkbox, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.brinjal1 : 'transparent' }]}>
                        {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={[styles.inviteFooter, { borderTopColor: C.border }]}>
                <Pressable
                  style={[styles.sendInviteBtn, { backgroundColor: selectedCreators.size > 0 ? C.brinjal1 : C.border }]}
                  onPress={handleSendInvites}
                  disabled={selectedCreators.size === 0 || inviteSending}>
                  <Text style={styles.sendInviteBtnText}>
                    {inviteSending ? t('campaigns.sending') : selectedCreators.size > 0 ? t('campaigns.sendInvite', { n: selectedCreators.size }) : t('campaigns.selectCreatorsToInvite')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Proposals bottom sheet */}
      <Modal
        visible={!!selectedCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCampaign(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedCampaign(null)} />
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('campaigns.proposalsTitle')}</Text>
              <Text style={[styles.modalSubtitle, { color: C.textSecondary }]} numberOfLines={1}>
                {selectedCampaign?.title}
              </Text>
            </View>
            <Pressable
              style={[styles.modalClose, { backgroundColor: C.background }]}
              onPress={() => setSelectedCampaign(null)}>
              <Text style={[styles.modalCloseText, { color: C.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {appsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={C.brinjal1} />
              </View>
            ) : applications.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyIcon}>📭</Text>
                <Text style={[styles.modalEmptyText, { color: C.textSecondary }]}>{t('campaigns.noProposalsYet')}</Text>
              </View>
            ) : (
              applications.map((a) => {
                const ps = PROPOSAL_STATUS_CFG[a.status];
                const abbr = initials(a.creator.fullName);
                return (
                  <View key={a.id} style={[styles.proposalCard, { backgroundColor: C.background, borderColor: C.border }]}>
                    <View style={[styles.proposalAvatar, { backgroundColor: C.primaryLight }]}>
                      <Text style={[styles.proposalAvatarText, { color: C.brinjal1 }]}>{abbr}</Text>
                    </View>
                    <View style={styles.proposalBody}>
                      <View style={styles.proposalTopRow}>
                        <Text style={[styles.proposalName, { color: C.text }]}>{a.creator.fullName}</Text>
                        <View style={[styles.proposalBadge, { backgroundColor: ps.bg }]}>
                          <Text style={[styles.proposalBadgeText, { color: ps.color }]}>{ps.label}</Text>
                        </View>
                      </View>
                      {a.creator.location ? (
                        <Text style={[styles.proposalSub, { color: C.textSecondary }]}>📍 {a.creator.location}</Text>
                      ) : null}
                      <Text style={[styles.proposalRate, { color: C.brinjal1 }]}>{a.proposedRate}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  gradientHeader: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
  },
  headerLeft: { gap: 3 },
  pageTitle: { fontSize: 20, fontWeight: '700', fontFamily: F.bold, lineHeight: 24 },
  pageSub:   { fontSize: 13, fontFamily: F.regular },
  newBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, fontFamily: F.bold },

  filterRow: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  list: { paddingHorizontal: 20, paddingTop: 14, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  emptyCard: {
    width: '100%', borderRadius: 24, borderWidth: 1,
    alignItems: 'center', paddingHorizontal: 28, paddingVertical: 36, gap: 10,
    overflow: 'hidden',
    shadowColor: '#4F46E5', shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  emptyDot1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, top: -40, right: -30, opacity: 0.5 },
  emptyDot2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, bottom: -25, left: -20, opacity: 0.4 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', fontFamily: F.bold },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular, paddingHorizontal: 8 },
  emptyCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
  emptyCreateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: F.bold },
  emptySwitchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  emptySwitchText: { fontSize: 12, fontFamily: F.regular },
  emptySwitchLink: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  card: {
    borderRadius: 14,
    shadowColor: '#4F46E5', shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4, overflow: 'hidden',
    flexDirection: 'row',
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  thumbEmoji: { fontSize: 26 },
  body: { flex: 1, gap: 5 },
  title: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaDot: { fontSize: 12 },
  badge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  meta: { fontSize: 12, fontFamily: F.regular },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  stat: { fontSize: 12, fontFamily: F.semibold },
  draftNote: { fontSize: 11, fontStyle: 'italic', fontFamily: F.regular },

  footerDivider: { height: 1, marginHorizontal: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 9 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerBtnText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 'auto' },
  inviteBtnText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: F.bold },
  modalSubtitle: { fontSize: 13, marginTop: 2, fontFamily: F.regular },
  modalClose: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  modalList: { padding: 16, gap: 12, paddingBottom: 40 },
  modalEmpty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, gap: 10 },
  modalEmptyIcon: { fontSize: 40 },
  modalEmptyText: { fontSize: 14, fontFamily: F.regular },

  proposalCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 12, gap: 12, borderWidth: 1,
  },
  proposalAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  proposalAvatarText: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  proposalBody: { flex: 1, gap: 3 },
  proposalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proposalName: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  proposalBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  proposalBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  proposalSub: { fontSize: 12, fontFamily: F.regular },
  proposalRate: { fontSize: 13, fontWeight: '700', marginTop: 2, fontFamily: F.bold },

  // Invite modal
  inviteSuccess: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  inviteSuccessEmoji: { fontSize: 52 },
  inviteSuccessText: { fontSize: 18, fontWeight: '700', fontFamily: F.bold },
  inviteSuccessHint: { fontSize: 13, textAlign: 'center', fontFamily: F.regular },

  modalEmptyHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular },
  goSaveBtn: { marginTop: 4, maxWidth: '100%', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  goSaveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  selectionBanner: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, marginTop: 10, borderRadius: 10 },
  selectionText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  creatorPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1.5, padding: 12,
  },
  pickAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  pickAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  pickInfo: { flex: 1, gap: 2 },
  pickName: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  pickSub: { fontSize: 12, fontFamily: F.regular },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  inviteFooter: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  sendInviteBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sendInviteBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: F.bold },
});
