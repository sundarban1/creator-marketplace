import { useEffect, useRef } from 'react';
import { scrollToTopEvents } from '@/lib/scrollToTopEvents';

/**
 * Scrolls this screen's list back to the top whenever its own bottom-nav tab is
 * tapped (matches the routeName emitted from the custom tab bar's onPress). Kept as
 * a ref internally so callers can pass a fresh inline callback every render without
 * churning the subscription.
 */
export function useScrollToTopOnTabPress(routeName: string, onScrollToTop: () => void) {
  const callbackRef = useRef(onScrollToTop);
  callbackRef.current = onScrollToTop;

  useEffect(() => {
    return scrollToTopEvents.subscribe((route) => {
      if (route === routeName) callbackRef.current();
    });
  }, [routeName]);
}
