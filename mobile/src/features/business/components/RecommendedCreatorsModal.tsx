import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';
import { BottomSheet } from '@/components/BottomSheet';
import { F, RADIUS } from '@/utilities/constants';

type Props = {
  visible: boolean;
  campaignId: string | null;
  category: string;
  lat?: number | null;
  lng?: number | null;
  budgetMin?: number;
  budgetMax?: number;
  onDone: () => void;
};

export function RecommendedCreatorsModal({ visible, campaignId, category, lat, lng, budgetMin, budgetMax, onDone }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { platforms } = usePlatforms();

  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<ApiCreatorListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSelected(new Set());
    setSent(false);
    creatorService.getRecommendedCreators({ category, lat: lat ?? undefined, lng: lng ?? undefined, budgetMin, budgetMax, limit: 10 })
      .then(setCreators)
      .catch(() => setCreators([]))
      .finally(() => setLoading(false));
  }, [visible, category, lat, lng, budgetMin, budgetMax]);

  const allSelected = creators.length > 0 && selected.size === creators.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(creators.map((c) => c.id)));
  }

  async function handleInvite() {
    if (!campaignId || selected.size === 0 || sending) return;
    setSending(true);
    try {
      await creatorService.inviteCreators(campaignId, Array.from(selected));
      setSent(true);
      setTimeout(onDone, 1400);
    } catch {
      setSending(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onDone}
      title={t('createEvent.recommendedTitle')}
      subtitle={t('createEvent.recommendedSub')}
      maxHeightPct={0.8}
      scrollable={false}
      footer={!sent && !loading && creators.length > 0 ? (
        <View style={s.footerRow}>
          <Pressable style={s.skipLink} onPress={onDone} disabled={sending}>
            <Text style={[s.skipLinkText, { color: C.textSecondary }]}>{t('createEvent.skipForNow')}</Text>
          </Pressable>
          <Pressable
            style={[s.inviteBtn, { backgroundColor: selected.size > 0 ? C.brinjal1 : C.border }]}
            onPress={handleInvite}
            disabled={selected.size === 0 || sending}>
            <Text style={s.inviteBtnText}>
              {sending ? t('createEvent.sending') : t('createEvent.inviteSelected', { n: selected.size })}
            </Text>
          </Pressable>
        </View>
      ) : undefined}>
        {sent ? (
          <View style={s.center}>
            <FontAwesome5 name="paper-plane" size={36} color="#3B82F6" solid />
            <Text style={[s.sentText, { color: C.text }]}>{t('createEvent.invitesSent')}</Text>
          </View>
        ) : loading ? (
          <View style={s.center}>
            <ActivityIndicator size="small" color={C.brinjal1} />
          </View>
        ) : creators.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="people-outline" size={36} color={C.textSecondary} />
            <Text style={[s.emptyText, { color: C.textSecondary }]}>{t('createEvent.noRecommendedCreators')}</Text>
            <Pressable style={[s.skipBtn, { backgroundColor: C.brinjal1 }]} onPress={onDone}>
              <Text style={s.skipBtnText}>{t('createEvent.doneBtn')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable style={s.selectAllRow} onPress={toggleAll}>
              <View style={[s.checkbox, { borderColor: allSelected ? C.brinjal1 : C.border, backgroundColor: allSelected ? C.brinjal1 : 'transparent' }]}>
                {allSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[s.selectAllText, { color: C.text }]}>
                {allSelected ? t('createEvent.deselectAll') : t('createEvent.selectAll')}
              </Text>
              {selected.size > 0 && (
                <Text style={[s.selectedCount, { color: C.brinjal1 }]}>{t('createEvent.nSelected', { n: selected.size })}</Text>
              )}
            </Pressable>

            <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
              {creators.map((creator) => {
                const sel = selected.has(creator.id);
                const abbr = (creator.fullName ?? 'C').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                const sortedAccounts = [...creator.socialAccounts].sort((a, b) => b.followers - a.followers);
                return (
                  <Pressable
                    key={creator.id}
                    style={[s.card, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? `${C.brinjal1}0A` : '#fff' }]}
                    onPress={() => toggle(creator.id)}>

                    <View style={s.cardTop}>
                      {creator.avatarUrl ? (
                        <Image source={{ uri: creator.avatarUrl }} style={s.avatarImg} contentFit="cover" />
                      ) : (
                        <View style={[s.avatar, { backgroundColor: C.brinjal1 }]}>
                          <Text style={s.avatarText}>{abbr}</Text>
                        </View>
                      )}

                      <View style={s.info}>
                        <View style={s.nameRow}>
                          <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{creator.fullName ?? 'Creator'}</Text>
                          {(creator.fullyVerified || creator.isVerified) && (
                            <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                          )}
                          <View style={s.completedRow}>
                            <FontAwesome5 name="trophy" size={10} color="#D97706" solid />
                            <Text style={[s.completedText, { color: C.textSecondary }]}>
                              {creator.completedEvents ?? 0} {t('createEvent.eventsCompleted')}
                            </Text>
                          </View>
                        </View>

                        {sortedAccounts.length > 0 && (
                          <View style={s.socialRow}>
                            {sortedAccounts.map((acc) => {
                              const meta = getPlatformMeta(platforms, acc.platform);
                              return (
                                <View key={acc.platform} style={[s.socialBadge, { backgroundColor: meta.bg }]}>
                                  <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>

                      <View style={[s.checkbox, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.brinjal1 : 'transparent' }]}>
                        {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  sentText: { fontSize: 16, fontFamily: F.bold },
  emptyText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, fontFamily: F.regular },
  skipBtn: { marginTop: 4, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  skipBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  selectAllText: { fontSize: 13, fontFamily: F.bold, flex: 1 },
  selectedCount: { fontSize: 12, fontFamily: F.bold },

  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1.5, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarImg: { width: 48, height: 48, borderRadius: 24, flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  info: { flex: 1, gap: 8, paddingTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontFamily: F.bold, flexShrink: 1 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  completedText: { fontSize: 12, fontFamily: F.medium },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },

  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  socialBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 5 },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipLink: { paddingVertical: 10, paddingHorizontal: 4 },
  skipLinkText: { fontSize: 13, fontFamily: F.semibold },
  inviteBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  inviteBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
