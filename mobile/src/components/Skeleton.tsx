import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { RADIUS } from '@/utilities/constants';

// Single shared shimmer loop (opacity pulse, not a moving gradient sweep —
// keeps it subtle per the app's animation guideline and matches the rest of
// the codebase, which leans on core Animated rather than Reanimated).
function usePulse() {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return pulse;
}

export function Skeleton({
  width, height, radius = RADIUS.sm, style,
}: {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}) {
  const C = useAppColors();
  const pulse = usePulse();

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: C.border, opacity: pulse }, style]}
    />
  );
}
