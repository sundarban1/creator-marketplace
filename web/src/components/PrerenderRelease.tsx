import { useLayoutEffect } from 'react';
import { prerenderWaitsForData, releasePrerenderSnapshot } from '../lib/prerenderHold';

// Rendered as a sibling of <Routes> inside App.tsx's <Suspense>, so it commits
// only once every lazy chunk for the first route has loaded. Swaps the
// prerendered snapshot for the live page then — unless that page fetches its
// own data, in which case it releases via useReleasePrerenderWhen.
export function PrerenderRelease() {
  useLayoutEffect(() => {
    if (!prerenderWaitsForData(window.location.pathname)) releasePrerenderSnapshot();
  }, []);
  return null;
}

export function useReleasePrerenderWhen(ready: boolean) {
  useLayoutEffect(() => {
    if (ready) releasePrerenderSnapshot();
  }, [ready]);
}
