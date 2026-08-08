// Lets each tab layout's custom tab bar (see (creator)/(tabs)/_layout.tsx and
// (business)/(tabs)/_layout.tsx) know a chat conversation ([id].tsx) screen
// is on screen, so it can hide itself. This used to be done with
// usePathname(), but that's backed by Expo Router's global navigation store,
// which only updates inside a useEffect that fires *after* the chat screen
// has already mounted and committed — so for one extra frame the tab bar
// stayed visible, squeezing the chat screen's flex:1 content area and
// pushing its composer up, before abruptly vanishing and letting the
// composer jump down into its final position. Each chat screen instead
// reports itself here from a useLayoutEffect (flushes synchronously before
// the frame paints, unlike a passive useEffect), eliminating that jump.
// A counter rather than a plain boolean survives React StrictMode's
// mount→unmount→mount double-invoke in dev, and would also survive more than
// one chat screen instance being mounted at once (react-native-screens can
// keep a previous stack entry mounted).
let openCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export const chatScreenOpenEvents = {
  open() {
    openCount += 1;
    notify();
  },
  close() {
    openCount = Math.max(0, openCount - 1);
    notify();
  },
  isOpen(): boolean {
    return openCount > 0;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
