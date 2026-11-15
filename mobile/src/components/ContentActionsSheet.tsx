import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { ReportModal } from '@/components/ReportModal';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBlocks } from '@/context/BlockContext';
import type { ReportTargetType } from '@/services/report';
import type { BlockSource } from '@/services/safety';
import { F, MIN_TOUCH_TARGET, RADIUS } from '@/utilities/constants';

/**
 * The ⋯ actions for any piece of user-generated content: Report, and — when
 * the content has an owner the viewer can block — Block / Unblock.
 *
 * Usage: render a trigger (see <ContentActionsButton/>) that sets `visible`.
 * Blocking calls the server first; only on success is the account hidden
 * locally and `onBlocked` fired (screens usually navigate back, since the
 * content they show is now hidden for this viewer).
 */
export function ContentActionsSheet({
  visible,
  onClose,
  report,
  block,
  onBlocked,
}: {
  visible: boolean;
  onClose: () => void;
  report: { type: ReportTargetType; id: string };
  block?: { userId: string; name: string; source?: BlockSource; conversationId?: string };
  onBlocked?: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const blocks = useBlocks();
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const blockedByMe = !!block && blocks.isBlocked(block.userId);

  function openReport() {
    onClose();
    // Let the actions sheet finish closing before the report sheet opens.
    setTimeout(() => setReporting(true), 250);
  }

  function confirmBlock() {
    if (!block) return;
    onClose();
    if (blockedByMe) {
      Alert.alert(t('safety.unblockTitle', { name: block.name }), t('safety.unblockBody'), [
        { text: t('safety.cancel'), style: 'cancel' },
        {
          text: t('safety.unblock'),
          onPress: async () => {
            try {
              await blocks.unblock(block.userId);
              Alert.alert(t('safety.unblocked', { name: block.name }));
            } catch (e) {
              Alert.alert(t('safety.unblockFailed'), e instanceof Error ? e.message : undefined);
            }
          },
        },
      ]);
      return;
    }
    Alert.alert(t('safety.blockTitle'), t('safety.blockBody'), [
      { text: t('safety.cancel'), style: 'cancel' },
      {
        text: t('safety.blockConfirm'),
        style: 'destructive',
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            await blocks.block(block.userId, block.source ?? 'profile', block.conversationId);
            onBlocked?.();
          } catch (e) {
            // Never pretend a block happened if the server didn't accept it.
            Alert.alert(t('safety.blockFailed'), e instanceof Error ? e.message : undefined);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={t('safety.moreOptions')} scrollable={false}>
        <View style={s.list}>
          <Pressable
            onPress={openReport}
            style={({ pressed }) => [s.row, { backgroundColor: pressed ? C.border + '55' : 'transparent' }]}
            accessibilityRole="button">
            <View style={[s.icon, { backgroundColor: 'rgba(220,38,38,0.08)' }]}><FontAwesome5 name="flag" size={15} color="#DC2626" /></View>
            <Text style={[s.rowTxt, { color: C.text }]}>{t('safety.report')}</Text>
          </Pressable>
          {block && (
            <Pressable
              onPress={confirmBlock}
              disabled={busy}
              style={({ pressed }) => [s.row, { backgroundColor: pressed ? C.border + '55' : 'transparent' }]}
              accessibilityRole="button">
              <View style={[s.icon, { backgroundColor: blockedByMe ? C.border + '66' : 'rgba(220,38,38,0.08)' }]}>
                <FontAwesome5 name={blockedByMe ? 'unlock' : 'ban'} size={15} color={blockedByMe ? C.text : '#DC2626'} />
              </View>
              <Text style={[s.rowTxt, { color: blockedByMe ? C.text : '#DC2626' }]}>{blockedByMe ? t('safety.unblock') : t('safety.block')}</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>
      <ReportModal visible={reporting} onClose={() => setReporting(false)} targetType={report.type} targetId={report.id} />
    </>
  );
}

/** The ⋯ trigger, sized to the 44pt touch target. `variant="overlay"` sits on cover images. */
export function ContentActionsButton({ onPress, variant = 'plain', color }: { onPress: () => void; variant?: 'plain' | 'overlay'; color?: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[s.trigger, variant === 'overlay' && s.triggerOverlay]}
      accessibilityRole="button"
      accessibilityLabel={t('safety.moreOptions')}>
      <FontAwesome5 name="ellipsis-h" size={16} color={color ?? (variant === 'overlay' ? '#fff' : C.text)} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  list: { gap: 4, paddingBottom: 8 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, borderRadius: RADIUS.md },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTxt: { fontSize: 15, fontFamily: F.semibold },
  trigger: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: MIN_TOUCH_TARGET / 2 },
  triggerOverlay: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)' },
});
