import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { CONTROL_HEIGHT, F, MIN_TOUCH_TARGET, RADIUS, SHADOW } from '@/utilities/constants';

type ButtonSize = 'small' | 'medium' | 'large';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  // Defaults to 'large' — the height every existing full-width CTA in the
  // app already used, so omitting this prop is a no-op for current callers.
  size?: ButtonSize;
  icon?: keyof typeof FontAwesome5.glyphMap;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'large',
  icon,
  fullWidth = true,
}: ButtonProps) {
  const C = useAppColors();
  const isDisabled = disabled || loading;
  const heightStyle = { height: CONTROL_HEIGHT[size] };

  // Common a11y props for every variant — label/role so screen readers
  // announce this as a button with its text, and `busy`/`disabled` state so
  // VoiceOver/TalkBack reflect the loading and disabled states correctly
  // instead of just going silent.
  const a11yProps = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityState: { disabled: isDisabled, busy: loading },
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        {...a11yProps}
        style={({ pressed }) => [
          styles.base,
          styles.primaryBtn,
          heightStyle,
          fullWidth && styles.fullWidth,
          { backgroundColor: C.brinjal1, opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}>
        {/* Loading spinner overlays the label rather than replacing it —
            the label row stays rendered (just hidden) so the button keeps
            its natural width instead of shrinking to fit a lone spinner. */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        )}
        <View style={[styles.inner, loading && styles.hiddenContent]}>
          {icon && <FontAwesome5 name={icon} size={17} color="#fff" />}
          <Text style={[styles.labelPrimary, { fontFamily: F.bold }]}>{label}</Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'danger') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        {...a11yProps}
        style={({ pressed }) => [
          styles.base,
          styles.dangerBtn,
          heightStyle,
          fullWidth && styles.fullWidth,
          { opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#EF4444" size="small" />
          </View>
        )}
        <View style={[styles.inner, loading && styles.hiddenContent]}>
          {icon && <FontAwesome5 name={icon} size={17} color="#EF4444" />}
          <Text style={[styles.labelDanger, { fontFamily: F.bold }]}>{label}</Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        {...a11yProps}
        style={({ pressed }) => [
          styles.base,
          styles.secondaryBtn,
          heightStyle,
          fullWidth && styles.fullWidth,
          { borderColor: C.brinjal1, backgroundColor: `${C.brinjal1}10`, opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1 },
        ]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={C.brinjal1} size="small" />
          </View>
        )}
        <View style={[styles.inner, loading && styles.hiddenContent]}>
          {icon && <FontAwesome5 name={icon} size={17} color={C.brinjal1} />}
          <Text style={[styles.labelSecondary, { color: C.brinjal1, fontFamily: F.bold }]}>{label}</Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'link') {
    // Text-only, no padding/border/background — for inline actions sitting
    // next to or inside a sentence (e.g. "Didn't get a code? Resend").
    // `minHeight` (not `height`) so it never forces extra vertical space
    // when inline with body text, but still meets the touch-target minimum.
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        {...a11yProps}
        style={({ pressed }) => [
          styles.linkBtn,
          { opacity: isDisabled ? 0.55 : pressed ? 0.6 : 1 },
        ]}>
        {loading ? (
          <ActivityIndicator color={C.brinjal1} size="small" />
        ) : (
          <View style={styles.inner}>
            {icon && <FontAwesome5 name={icon} size={14} color={C.brinjal1} />}
            <Text style={[styles.labelLink, { color: C.brinjal1, fontFamily: F.semibold }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    );
  }

  // ghost — previously had no minimum height at all (could fall under the
  // 44/48pt minimum touch target depending on label font metrics) and never
  // rendered a loading spinner despite accepting the `loading` prop.
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      {...a11yProps}
      style={({ pressed }) => [
        styles.base,
        styles.ghostBtn,
        { minHeight: CONTROL_HEIGHT[size] },
        fullWidth && styles.fullWidth,
        { opacity: isDisabled ? 0.55 : pressed ? 0.7 : 1 },
      ]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={C.brinjal1} size="small" />
        </View>
      )}
      <View style={[styles.inner, loading && styles.hiddenContent]}>
        {icon && <FontAwesome5 name={icon} size={17} color={C.brinjal1} />}
        <Text style={[styles.labelSecondary, { color: C.brinjal1, fontFamily: F.semibold }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base:        { borderRadius: RADIUS.full, overflow: 'hidden' },
  fullWidth:   { alignSelf: 'stretch' },
  // Height comes from `heightStyle` (driven by the `size` prop) in the style
  // array at the call site, not here — these just hold everything else.
  primaryBtn:  { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26, ...SHADOW.raised },
  inner:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // `hiddenContent` keeps the label row's layout box intact (opacity, not
  // display:none) so the button doesn't resize when the spinner takes over.
  hiddenContent: { opacity: 0 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn:{ borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26 },
  dangerBtn:   { borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 26 },
  ghostBtn:    { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  linkBtn:     { minHeight: MIN_TOUCH_TARGET, alignSelf: 'flex-start', justifyContent: 'center', paddingVertical: 6 },
  labelPrimary:  { fontSize: 15, color: '#fff', letterSpacing: 0.3 },
  labelSecondary:{ fontSize: 15, letterSpacing: 0.2 },
  labelDanger:   { fontSize: 15, color: '#EF4444', letterSpacing: 0.2 },
  labelLink:     { fontSize: 14, letterSpacing: 0.2, textDecorationLine: 'underline' },
});
