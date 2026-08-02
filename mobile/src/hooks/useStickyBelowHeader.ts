import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

// Hand-rolled "pin this row below a fixed header once scrolling reaches it, release
// it back into normal flow once scrolling back up brings its original position back
// into view" — deliberately NOT React Native's built-in `stickyHeaderIndices`, which
// reliably crashes Android in this app's RN/Fabric setup (100% reproducible on cold
// launch — see the removal note in creator (tabs)/index.tsx). That mechanism crashes
// because it detaches the sticky item's native view and reattaches it into a separate
// overlay container outside normal React reconciliation. This hook avoids that
// entirely: it only reports whether the tracked row's scroll offset has been passed,
// leaving it to the caller to swap between rendering the real content in-flow vs. as
// an absolutely-positioned overlay — always exactly one mounted instance, no
// imperative native view reparenting.
//
// Deliberately does NOT use `ref.measureLayout` to find the row's offset — that
// imperative API isn't reliably supported on this RN/Fabric setup (throws "ref.
// measureLayout must be called with a ref to a native component" even for a plain
// `View` ref). Instead the caller reports the offset itself via `setOffsetY`, computed
// however is natural for its own layout:
//  - A `ScrollView` where the row is a direct child: the row's own `onLayout` already
//    reports `.layout.y` relative to the full scroll content — call
//    `setOffsetY(e.nativeEvent.layout.y)` from the row's `onLayout`.
//  - A `FlatList` row (whose `onLayout.y` is only relative to an internal cell
//    wrapper, not the full content, since `ListHeaderComponent` sits outside that
//    wrapper): wrap `ListHeaderComponent` in a single outer View and call
//    `setOffsetY(e.nativeEvent.layout.height)` from *that* View's `onLayout` — since
//    the row is the very first item in `data`, its content offset is exactly that
//    header's rendered height. (Matches this app's own existing `categoriesYRef`
//    pattern of trusting plain `onLayout` for content-position tracking.)
// Either way, also call `onRowLayout` from the row's own `onLayout` to keep
// `placeholderHeight` (its `.layout.height`, not `.layout.y`) current.
export function useStickyBelowHeader() {
  const offsetYRef       = useRef<number | null>(null);
  const scrollYRef        = useRef(0);
  const stuckRef            = useRef(false);
  const [stuck, setStuck]     = useState(false);
  // State, not a ref: this app runs the React Compiler, which assumes render
  // purity — reading a mutable ref.current directly in JSX breaks that
  // assumption, since the ref can mutate outside the render cycle.
  const [placeholderHeight, setPlaceholderHeight] = useState(0);

  const recompute = useCallback(() => {
    if (offsetYRef.current == null) return;
    const next = scrollYRef.current >= offsetYRef.current;
    if (next !== stuckRef.current) {
      stuckRef.current = next;
      setStuck(next);
    }
  }, []);

  const setOffsetY = useCallback((y: number) => {
    offsetYRef.current = y;
    recompute();
  }, [recompute]);

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setPlaceholderHeight(e.nativeEvent.layout.height);
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    recompute();
  }, [recompute]);

  return { stuck, setOffsetY, onRowLayout, onScroll, placeholderHeight };
}
