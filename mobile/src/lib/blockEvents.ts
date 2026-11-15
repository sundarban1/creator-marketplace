import { useEffect, useRef } from 'react';

// Fired whenever the signed-in user's block list changes (here or on another
// device via the `block:changed` socket event). React Query screens refresh
// through queryClient.invalidateQueries(); screens with hand-rolled fetches
// subscribe with useRefetchOnBlockChange so a blocked account's content
// disappears without a restart.
type Listener = () => void;
const listeners = new Set<Listener>();

export const blockEvents = {
  emit() {
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

export function useRefetchOnBlockChange(refetch: () => unknown) {
  const ref = useRef(refetch);
  useEffect(() => { ref.current = refetch; });
  useEffect(() => blockEvents.subscribe(() => { void ref.current(); }), []);
}

// Remote change (another device) — BlockProvider re-pulls the id list, then
// fires blockEvents itself. Kept separate so a local block doesn't trigger a
// redundant re-fetch of the list it just updated.
const syncListeners = new Set<Listener>();
export const blockSync = {
  emit() { syncListeners.forEach((fn) => fn()); },
  subscribe(fn: Listener): () => void {
    syncListeners.add(fn);
    return () => { syncListeners.delete(fn); };
  },
};
