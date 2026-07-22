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

// Single source of truth for every creator sub-page's title bar — back
// chevron, centered title, optional right-side action, same position on
// every screen. The right slot keeps the same min-width as the back button
// so the title stays visually centered when there's no action there.
export function PageHeader({ title, backFallback, onBack, rightSlot }: Props) {
  const C = useAppColors();
  return (
    <View style={[styles.row, { backgroundColor: C.surface, borderBottomColor: C.border }]} accessibilityRole="header" accessibilityLabel={title}>
      <BackButton fallback={backFallback} onPress={onBack} />
      <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: F.bold },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
