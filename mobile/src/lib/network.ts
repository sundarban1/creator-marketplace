import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

// Single module-level NetInfo listener shared by everything that needs
// connectivity state — the offline banner (UI), api.ts (fail-fast gating so a
// request never waits out the 30s timeout when we already know there's no
// connection), and screens that want to auto-refetch on reconnect. Avoids
// every consumer registering its own NetInfo listener.

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();

// Optimistic default so the very first render (before NetInfo's first event
// fires) doesn't show a false "offline" banner or block the initial fetch.
let online = true;
let everWentOffline = false;
let wasConnected = true;

// Defaults (reachabilityLongTimeout: 60s, reachabilityShortTimeout: 5s) make
// the reachability probe re-check too slowly after the link comes back —
// this is what made the "back online" banner feel delayed. Shorten the
// probe's own timeouts so a stale isInternetReachable value gets corrected
// quickly instead of lingering for up to a minute.
NetInfo.configure({
  reachabilityRequestTimeout: 3000,
  reachabilityShortTimeout: 2000,
  reachabilityLongTimeout: 15000,
});

function computeOnline(state: NetInfoState, prevConnected: boolean): boolean {
  if (state.isConnected !== true) return false;
  // Just reconnected: isInternetReachable can still hold the stale `false`
  // from while we were offline, since the reachability probe hasn't re-run
  // yet. Trust the link coming back up immediately — if it's wrong (e.g. a
  // captive portal), the next probe corrects it within the timeouts above.
  if (!prevConnected) return true;
  return state.isInternetReachable !== false;
}

NetInfo.addEventListener((state) => {
  const next = computeOnline(state, wasConnected);
  wasConnected = state.isConnected === true;
  if (next === online) return;
  if (!next) everWentOffline = true;
  online = next;
  listeners.forEach((fn) => fn(online));
});

export const network = {
  isOnline(): boolean {
    return online;
  },
  // True once the app has observed a real online→offline transition — lets
  // callers distinguish "just reconnected" from "was online the whole time"
  // without needing to track their own previous-state.
  hasEverGoneOffline(): boolean {
    return everWentOffline;
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
