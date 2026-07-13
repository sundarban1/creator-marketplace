import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Instagram-style swipe-left-to-delete for a chat list row. `Swipeable` is
// built on react-native-gesture-handler, which needs a GestureHandlerRootView
// somewhere up the tree (set once in the root layout) to receive touches
// correctly on Android — without it the pan gesture never starts there.
export function SwipeableChatRow({
  children,
  onDelete,
  deleteLabel,
}: {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel: string;
}) {
  const ref = useRef<Swipeable>(null);

  function renderRightActions(_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) {
    const scale = dragX.interpolate({ inputRange: [-84, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
    return (
      <Pressable
        style={s.action}
        onPress={() => {
          ref.current?.close();
          onDelete();
        }}>
        <Animated.View style={[s.actionInner, { transform: [{ scale }] }]}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={s.actionTxt}>{deleteLabel}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}>
      {children}
    </Swipeable>
  );
}

const s = StyleSheet.create({
  action:      { width: 84, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  actionInner: { alignItems: 'center', gap: 4 },
  actionTxt:   { color: '#fff', fontSize: 11, fontWeight: '600' },
});
