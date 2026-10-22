// Activity tab — mobile port of web/src/app/competitions/ActivityPanel.tsx,
// as a timeline with "Load more" instead of page buttons.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { F, RADIUS, SPACING } from '@/utilities/constants';
import { competitionManageService as api } from '@/services/competition';
import { activityLabel, formatNpt } from '@/features/creator/competition/format';
import { Notice, shared } from './shared';

const ORANGE = '#EA580C';

export function ActivityPanel({ competitionId }: { competitionId: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const q = useInfiniteQuery({
    queryKey: ['competition', 'manage', competitionId, 'activity'],
    queryFn: ({ pageParam }) => api.activity(competitionId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
  });

  if (q.isPending) return <Skeleton width="100%" height={240} radius={RADIUS.lg} />;
  if (q.isError) return <Notice tone="danger" text={t('common.somethingWentWrong')} />;
  const items = q.data.pages.flatMap((p) => p.items);
  if (!items.length) {
    return (
      <View style={[styles.empty, { borderColor: C.border, backgroundColor: C.surface }]}>
        <FontAwesome5 name="history" size={26} color={C.textSecondary} />
        <Text style={[shared.strong, { color: C.text }]}>{t('comp.noActivity')}</Text>
        <Text style={[shared.small, { color: C.textSecondary, textAlign: 'center' }]}>{t('comp.noActivityBody')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {items.map((r, i) => {
        const who = r.actorType === 'SYSTEM' ? t('comp.automatic') : r.actorType === 'ADMIN' ? t('comp.kolabTeam') : t('comp.you');
        const reason = typeof r.metadata?.reason === 'string' ? r.metadata.reason : '';
        const last = i === items.length - 1;
        return (
          <View key={r.id} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: ORANGE }]} />
              {!last && <View style={[styles.line, { backgroundColor: C.border }]} />}
            </View>
            <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : 16 }}>
              <Text style={[shared.small, { color: C.text, fontFamily: F.medium }]}>{activityLabel(r.action, r.metadata, t)}</Text>
              <Text style={[shared.meta, { color: C.textSecondary }]}>
                {formatNpt(r.createdAt)} · {who}{reason ? ` · ${t('comp.reasonLabel')}: ${reason}` : ''}
              </Text>
            </View>
          </View>
        );
      })}
      {q.hasNextPage && (
        q.isFetchingNextPage
          ? <ActivityIndicator color={C.brinjal1} style={{ marginTop: 8 }} />
          : <Button size="small" variant="secondary" label={t('comp.loadMore')} onPress={() => void q.fetchNextPage()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:  { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg },
  item:  { flexDirection: 'row', gap: 12 },
  rail:  { width: 10, alignItems: 'center' },
  dot:   { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line:  { width: 2, flex: 1, marginTop: 4 },
  empty: { alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.lg, padding: SPACING.xl },
});
