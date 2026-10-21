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
    if (index === prevIndex.current) {
      // Same tab — make sure a prior interrupted transition didn't leave the
      // panel mid-fade / hidden.
      progress.setValue(1);
      offsetX.setValue(0);
      return;
    }
    const dir = index > prevIndex.current ? 1 : -1;
    prevIndex.current = index;

    offsetX.setValue(dir * 14);
    progress.setValue(0);

    // Start the fade one frame late. The incoming panel usually mounts (and
    // kicks off its own data fetch) on this very tick; a native-driven timing
    // started in the same frame as the `setValue(0)` above can lose the race
    // between the two bridge messages on a busy JS thread, and the panel then
    // stays pinned at opacity 0 — an intermittent "blank tab". Deferring the
    // start lets the reset flush to the native driver first.
    let anim: Animated.CompositeAnimation | undefined;
    const raf = requestAnimationFrame(() => {
      anim = Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      // Always snap to the resting (visible) state when the run ends, finished
      // or not. A native-driven run only updates the native view; if the
      // incoming panel re-renders this Animated.View mid-run (it does, as it
      // mounts and reports its filter count), the commit can re-apply the
      // stale JS-side opacity of 0 and the tab stays blank until the user
      // switches away and back. setValue syncs JS + native to 1.
      anim.start(() => {
        progress.setValue(1);
        offsetX.setValue(0);
      });
    });

    // Safety net: if the run is lost entirely (no callback ever fires — seen
    // in release builds on a busy JS thread), force the panel visible anyway.
    const fallback = setTimeout(() => {
      progress.setValue(1);
      offsetX.setValue(0);
    }, 600);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      anim?.stop();
      // Whatever point the transition reached, a torn-down transition must
      // leave its panel fully visible — never stuck faded out.
      progress.setValue(1);
      offsetX.setValue(0);
    };
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
