import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary' }: ButtonProps) {
  const C = useAppColors();
  const isDisabled = disabled || loading;

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: C.brinjal1 },
        variant === 'secondary' && [styles.secondary, { backgroundColor: C.surface, borderColor: C.brinjal1 }],
        variant === 'ghost' && styles.ghost,
        (isDisabled || pressed) && styles.dimmed,
      ]}
      onPress={onPress}
      disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : C.brinjal1} size="small" />
      ) : (
        <Text style={[styles.label, variant !== 'primary' && { color: C.brinjal1 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  secondary: { borderWidth: 1.5 },
  ghost: { backgroundColor: 'transparent' },
  dimmed: { opacity: 0.6 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: F.semibold },
});
