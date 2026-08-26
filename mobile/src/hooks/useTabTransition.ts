import { useLayoutEffect, useRef } from 'react';
import { Animated, Easing, useAnimatedValue } from 'react-native';

// Cross-fades + slides a tab panel whenever the active segmented tab changes,
// so switching (Work / Business / People, ...) reads as a smooth move instead
// of an instant content pop. Native-driven, so it stays smooth even while the
// incoming tab is still mounting and rendering its list.
//
// `order` is the tab keys left-to-right — the slide direction follows travel
// (moving to a tab further right slides in from the right, and vice versa).
// Pass a stable `order` reference (a module-level constant, not an inline
// array) so the transition effect doesn't re-run on every render.
//
// Spread the returned value onto an `Animated.View` that wraps the panel:
//   const panelStyle = useTabTransition(tab, ORDER);
//   <Animated.View style={[{ flex: 1 }, panelStyle]}>…</Animated.View>
export function useTabTransition<T extends string>(active: T, order: readonly T[]) {
  const progress = useAnimatedValue(1);
  // Slide offset for the current transition — set to ±14 the moment the tab
  // changes, then `progress` eases it back to 0. Kept as its own value (rather
  // than a direction read during render) so nothing touches a ref mid-render.
  const offsetX = useAnimatedValue(0);
  const prevIndex = useRef(order.indexOf(active));

  useLayoutEffect(() => {
    const index = order.indexOf(active);
    if (index === prevIndex.current) return;
    const dir = index > prevIndex.current ? 1 : -1;
    prevIndex.current = index;

    offsetX.setValue(dir * 14);
    progress.setValue(0);
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [active, order, progress, offsetX]);

  return {
    opacity: progress,
    transform: [
      {
        translateX: Animated.multiply(
          offsetX,
          progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        ),
      },
    ],
  };
}
