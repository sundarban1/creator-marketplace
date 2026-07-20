import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BackButton } from '@/components/BackButton';

type Props = {
  title: string;
  backFallback?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

// Single source of truth for every creator sub-page's title bar — just the
// back chevron (and an optional right-side action), same position on every
// screen. No visible title text; `title` is kept only as the a11y label.
export function PageHeader({ title, backFallback, onBack, rightSlot }: Props) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={title}>
      <BackButton fallback={backFallback} onPress={onBack} />
      <View style={styles.spacer} />
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  spacer:  { flex: 1 },
  right:   { marginLeft: 8 },
});
