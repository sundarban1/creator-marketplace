import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackButton } from '@/components/BackButton';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type Props = {
  title: string;
  backFallback?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

// Single source of truth for every creator sub-page's title bar. Back chevron
// + left-aligned title (Instagram/Twitter pattern, not iOS centered-title) —
// the title always starts at the same fixed X regardless of whether a page
// has a trailing action, and never carries a subtitle.
export function PageHeader({ title, backFallback, onBack, rightSlot }: Props) {
  const C = useAppColors();

  return (
    <View style={styles.row}>
      <BackButton fallback={backFallback} onPress={onBack} />
      <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{title}</Text>
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  title: { flex: 1, fontSize: 20, fontFamily: F.bold, lineHeight: 24 },
  right: { marginLeft: 8 },
});
