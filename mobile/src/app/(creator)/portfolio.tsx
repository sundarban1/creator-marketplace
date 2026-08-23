import { useCallback, useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AppModal } from '@/components/AppModal';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { portfolioService, type ApiPortfolioItem } from '@/services/portfolio';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SCREEN_GUTTER, SHADOW } from '@/utilities/constants';

const COLUMN_GAP = 12;

export default function PortfolioScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [items, setItems]     = useState<ApiPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiPortfolioItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await portfolioService.listMine());
    } catch (err) {
      setError(
        err instanceof OfflineError
          ? t('portfolioScreen.errorMessage')
          : (err instanceof Error ? err.message : t('portfolioScreen.errorMessage'))
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await portfolioService.remove(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // Keep the modal open (loading cleared) so the user sees it failed and can retry.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader
        title={t('portfolioScreen.title')}
        rightSlot={
          <Pressable
            hitSlop={10}
            onPress={() => router.push('/(creator)/portfolio-form')}
            accessibilityRole="button"
            accessibilityLabel={t('portfolioScreen.addItem')}>
            <FontAwesome5 name="plus" solid size={18} color={C.brinjal1} />
          </Pressable>
        }
      />
      <MaxWidthContainer>
        {loading ? (
          <View style={[styles.grid, styles.loadingGrid]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.tile, styles.loadingTile, { backgroundColor: C.surface }]} />
            ))}
          </View>
        ) : error ? (
          <ErrorState
            title={t('portfolioScreen.errorTitle')}
            message={error}
            actionLabel={t('invitations.retry')}
            onAction={load}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            numColumns={2}
            columnWrapperStyle={{ gap: COLUMN_GAP }}
            renderItem={({ item }) => (
              <PortfolioTile
                item={item}
                onEdit={() => router.push({ pathname: '/(creator)/portfolio-form', params: { id: item.id } })}
                onDelete={() => setDeleteTarget(item)}
              />
            )}
            contentContainerStyle={[styles.grid, items.length === 0 && styles.gridEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="images"
                title={t('portfolioScreen.emptyTitle')}
                subtitle={t('portfolioScreen.emptySub')}
                action={{ label: t('portfolioScreen.addItem'), onPress: () => router.push('/(creator)/portfolio-form') }}
              />
            }
          />
        )}
      </MaxWidthContainer>

      <AppModal
        visible={!!deleteTarget}
        type="danger"
        title={t('portfolioScreen.deleteTitle')}
        body={deleteTarget ? t('portfolioScreen.deleteBody', { title: deleteTarget.title ?? t('portfolioScreen.untitled') }) : ''}
        confirmLabel={t('servicesScreen.delete')}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

function PortfolioTile({ item, onEdit, onDelete }: {
  item: ApiPortfolioItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <Pressable style={[styles.tile, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]} onPress={onEdit}>
      {item.mediaUrl ? (
        <Image source={{ uri: item.mediaUrl }} style={styles.tileImage} resizeMode="cover" />
      ) : (
        <Pressable
          style={[styles.tileImage, styles.linkFallback, { backgroundColor: C.primaryLight }]}
          onPress={() => item.externalUrl && Linking.openURL(item.externalUrl)}>
          <FontAwesome5 name="external-link-alt" solid size={22} color={C.brinjal1} />
        </Pressable>
      )}
      {item.mediaType === 'VIDEO' && (
        <View style={styles.playBadge}>
          <FontAwesome5 name="play" solid size={11} color="#fff" />
        </View>
      )}
      <View style={styles.tileFooter}>
        <Text style={[styles.tileTitle, { color: C.text }]} numberOfLines={1}>{item.title ?? t('portfolioScreen.untitled')}</Text>
        <Pressable hitSlop={8} onPress={onDelete}>
          <FontAwesome5 name="trash-alt" solid size={13} color="#EF4444" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 48, gap: COLUMN_GAP },
  gridEmpty: { flexGrow: 1 },
  loadingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  loadingTile: { width: '48%', aspectRatio: 1, borderWidth: 0 },

  tile: { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  tileImage: { width: '100%', aspectRatio: 1 },
  linkFallback: { justifyContent: 'center', alignItems: 'center' },
  playBadge: {
    position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center',
  },
  tileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  tileTitle: { flex: 1, fontSize: 12, fontFamily: F.semibold },
});
