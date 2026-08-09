import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { CONTROL_HEIGHT, RADIUS, SHADOW } from '@/utilities/constants';

type IconButtonSize = 'small' | 'medium' | 'large';

const ICON_SIZE: Record<IconButtonSize, number> = { small: 15, medium: 17, large: 19 };

// Matches BackButton's `variant="overlay"` dimension exactly (also
// hardcoded there, not tokenized) — see the `variant` prop doc below.
const OVERLAY_DIMENSION = 38;

type Props = {
  icon: keyof typeof FontAwesome5.glyphMap;
  solid?: boolean;
  onPress: () => void;
  // Required, not optional — an icon-only control has no text for a screen
  // reader to fall back on, so this can't be an afterthought the way it can
  // be on a labeled Button.
  accessibilityLabel: string;
  size?: IconButtonSize;
  // 'filled' = circular themed-surface chip (toolbar/header actions sitting
  // on a plain background). 'ghost' = no background/border at all, just the
  // icon (for icons already sitting on their own card/row background, where
  // a filled circle would double up). 'overlay' = translucent white circle
  // for an icon sitting directly on a hero image/gradient — fixed at 38px
  // (ignores `size`) to match BackButton's own `variant="overlay"`, since
  // the two are always paired in the same header row and must stay the same
  // size for it to look centered.
  variant?: 'filled' | 'ghost' | 'overlay';
  color?: string;
  disabled?: boolean;
  loading?: boolean;
};

// Generic icon-only touchable — the canonical replacement for the many
// one-off `<Pressable><FontAwesome5 .../></Pressable>` spots across the app
// that had no minimum touch target and no accessibility label. Not meant to
// replace BackButton (which owns back-navigation semantics specifically),
// but everything else icon-only should reuse this instead of hand-rolling
// the same Pressable+icon shape again per screen.
export function IconButton({
  icon,
  solid = true,
  onPress,
  accessibilityLabel,
  size = 'medium',
  variant = 'filled',
  color,
  disabled = false,
  loading = false,
}: Props) {
  const C = useAppColors();
  const isDisabled = disabled || loading;
  const dimension = variant === 'overlay' ? OVERLAY_DIMENSION : CONTROL_HEIGHT[size];
  const iconColor = color ?? (variant === 'overlay' ? '#fff' : variant === 'filled' ? C.text : C.textSecondary);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // hitSlop pads out to the same touch target even for a visually
      // smaller icon — the circle itself is already sized off CONTROL_HEIGHT,
      // this only matters if a caller shrinks `size` below that in the future.
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        variant === 'filled' && [styles.filled, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card],
        variant === 'overlay' && styles.overlay,
        { opacity: isDisabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <FontAwesome5 name={icon} solid={solid} size={ICON_SIZE[size]} color={iconColor} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base:    { justifyContent: 'center', alignItems: 'center' },
  filled:  { borderWidth: 1.5, borderRadius: RADIUS.full },
  overlay: { backgroundColor: 'rgba(255,255,255,0.18)' },
});
