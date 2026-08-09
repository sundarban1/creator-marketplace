import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const CLOSE_DISTANCE_THRESHOLD = 90;
const CLOSE_VELOCITY_THRESHOLD = 0.8;

// Lets a sheet/drawer be dismissed by dragging its scrollable content
// downward once that content is already scrolled to the top — the same
// "keep pulling past the top to dismiss" gesture iOS/Android sheets use
// natively. `onMoveShouldSetPanResponderCapture` (capture, not bubble) is
// what makes this win the touch away from the ScrollView's own scroll
// responder before it claims the gesture — the RN responder system runs
// capture callbacks top-down first, on both platforms, so this doesn't need
// Android-specific handling. Gated on scrollYRef so a normal downward drag
// mid-list (scrolling back up toward older content) never gets hijacked —
// only a pull that starts with the list already at rest at y=0 does.
export function useCloseOnScrollDown(onClose: () => void) {
  const dragY = useRef(new Animated.Value(0)).current;
  const scrollYRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_evt, g) =>
        scrollYRef.current <= 0 && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_evt, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_evt, g) => {
        if (g.dy > CLOSE_DISTANCE_THRESHOLD || g.vy > CLOSE_VELOCITY_THRESHOLD) {
          // Snap back to 0 immediately rather than animating off-screen —
          // `onClose` flips `visible` to false, and the Modal/panel's own
          // existing close animation (native slide / Animated timing to
          // SCREEN_H) takes over from there, same as tapping the handle.
          dragY.setValue(0);
          onClose();
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  ).current;

  function onScroll(e: { nativeEvent: { contentOffset: { y: number } } }) {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }

  return { dragY, panHandlers: panResponder.panHandlers, onScroll };
}
