import { useEffect, useRef } from 'react';

/**
 * Tiny pub/sub for server-pushed "this data changed" signals. LiveUpdatesBridge
 * turns socket events into topics; pages subscribe with useLiveRefresh() and
 * refetch in the background. The web app has no query cache to invalidate, so
 * this is the equivalent of mobile's queryClient.invalidateQueries().
 */
export type LiveTopic =
  | 'campaigns'      // event feeds (Discover, recommended)
  | `campaign:${string}` // one event's detail page
  | 'applications'
  | 'wallet'
  | 'profile'
  | 'referrals'
  | 'conversations'
  | 'categories'
  | 'platforms'
  | 'platformFlags'; // admin settings (e.g. payment fee/tax %)

type Listener = (topic: LiveTopic) => void;
const listeners = new Set<Listener>();

export function publishLive(...topics: LiveTopic[]): void {
  for (const topic of topics) for (const l of listeners) l(topic);
}

/** Calls `onChange` whenever any of `topics` is published. */
export function useLiveRefresh(topics: LiveTopic[], onChange: () => void): void {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const key = topics.join('|');
  useEffect(() => {
    const wanted = new Set(key.split('|'));
    const l: Listener = (topic) => { if (wanted.has(topic)) cb.current(); };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, [key]);
}
