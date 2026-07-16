import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  fullWidth = true,
}: ButtonProps) {
  const C = useAppColors();
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          fullWidth && styles.fullWidth,
          { opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}>
        <LinearGradient
          colors={[C.brinjal1, '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.inner}>
              {icon && <Ionicons name={icon} size={17} color="#fff" />}
              <Text style={[styles.labelPrimary, { fontFamily: F.bold }]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'danger') {
    return (
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          styles.dangerBtn,
          fullWidth && styles.fullWidth,
          { opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}>
        {loading ? (
          <ActivityIndicator color="#EF4444" size="small" />
        ) : (
          <View style={styles.inner}>
            {icon && <Ionicons name={icon} size={17} color="#EF4444" />}
            <Text style={[styles.labelDanger, { fontFamily: F.bold }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          styles.secondaryBtn,
          fullWidth && styles.fullWidth,
          { borderColor: C.brinjal1, backgroundColor: `${C.brinjal1}10`, opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}>
        {loading ? (
          <ActivityIndicator color={C.brinjal1} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon && <Ionicons name={icon} size={17} color={C.brinjal1} />}
            <Text style={[styles.labelSecondary, { color: C.brinjal1, fontFamily: F.bold }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // ghost
  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        { opacity: isDisabled ? 0.55 : pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.inner}>
        {icon && <Ionicons name={icon} size={17} color={C.brinjal1} />}
        <Text style={[styles.labelSecondary, { color: C.brinjal1, fontFamily: F.semibold }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base:        { borderRadius: RADIUS.md, overflow: 'hidden' },
  fullWidth:   { alignSelf: 'stretch' },
  gradient:    { height: 54, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26, ...SHADOW.raised },
  inner:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryBtn:{ height: 54, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26 },
  dangerBtn:   { height: 54, borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26 },
  labelPrimary:  { fontSize: 15, color: '#fff', letterSpacing: 0.3 },
  labelSecondary:{ fontSize: 15, letterSpacing: 0.2 },
  labelDanger:   { fontSize: 15, color: '#EF4444', letterSpacing: 0.2 },
});
