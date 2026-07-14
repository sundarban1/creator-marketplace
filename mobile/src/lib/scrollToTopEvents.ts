// Fired by each tab bar's custom onPress handler (see (creator)/(tabs)/_layout.tsx and
// (business)/(tabs)/_layout.tsx) whenever a bottom-nav tab is tapped — Expo Router's
// Tabs keep every tab's screen mounted and its scroll position intact when switching
// away and back, so without this a tab you scrolled down on stays scrolled down the
// next time you land on it. Each tab screen subscribes and scrolls its own list back
// to the top when it recognizes its own route name.
type Listener = (routeName: string) => void;
const listeners = new Set<Listener>();

export const scrollToTopEvents = {
  emit(routeName: string) {
    listeners.forEach((fn) => fn(routeName));
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
