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

function computeOnline(state: NetInfoState): boolean {
  // isInternetReachable can be null while NetInfo is still determining it —
  // only treat it as offline once it's explicitly false, not merely unknown.
  return state.isConnected === true && state.isInternetReachable !== false;
}

NetInfo.addEventListener((state) => {
  const next = computeOnline(state);
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
